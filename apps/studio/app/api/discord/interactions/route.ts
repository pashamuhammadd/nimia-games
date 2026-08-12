import { NextRequest, NextResponse, after } from "next/server";
import { createServiceRoleClient } from "@nimia/db";
import {
  verifyDiscordInteractionRequest,
  InteractionType,
  CREATE_TICKET_BUTTON_CUSTOM_ID,
  TICKET_MODAL_CUSTOM_ID,
  buildTicketModal,
  modalResponse,
  readTicketModalValues,
  deferredEphemeralResponse,
  editInteractionResponse,
  pongResponse,
  createSupportTicket,
} from "@nimia/discord";

// Discord's Interactions HTTP endpoint (added 12 Agustus 2026, in-Discord
// ticket button — docs/DISCORD.md's "In-Discord ticket button" section).
// This is the ONE inbound entry point in the whole Discord integration —
// every other route/action in this codebase only ever calls OUT to
// Discord's REST API (see docs/DISCORD.md's "Why no persistent bot process
// (Gateway) is needed"). Discord itself POSTs here whenever someone clicks
// the "Open a Ticket" button or submits the modal it opens, plus an
// occasional PING to confirm the endpoint is alive. Register this route's
// full URL (https://studio.nimiagames.com/api/discord/interactions) as the
// application's "Interactions Endpoint URL" in the Discord Developer
// Portal — see packages/discord/README.md.
//
// Every response below MUST be sent within Discord's 3-second window or
// the interaction shows as "failed" in the client — see
// deferredEphemeralResponse's own comment in interactions.ts for why the
// modal-submit branch defers instead of doing the database + Discord work
// inline before responding.
export async function POST(request: NextRequest) {
  // Signature verification needs the EXACT raw bytes Discord signed —
  // request.text() first, then JSON.parse the same string below. Calling
  // request.json() here (or reading the body twice) would either break
  // verification or throw, so this order matters.
  const rawBody = await request.text();
  const signature = request.headers.get("x-signature-ed25519");
  const timestamp = request.headers.get("x-signature-timestamp");

  if (!verifyDiscordInteractionRequest(rawBody, signature, timestamp)) {
    return new NextResponse("Invalid request signature", { status: 401 });
  }

  const interaction = JSON.parse(rawBody);

  if (interaction.type === InteractionType.PING) {
    return NextResponse.json(pongResponse());
  }

  if (
    interaction.type === InteractionType.MESSAGE_COMPONENT &&
    interaction.data?.custom_id === CREATE_TICKET_BUTTON_CUSTOM_ID
  ) {
    // No database work needed to open the modal — just echo it straight
    // back, well within the 3-second window.
    return NextResponse.json(modalResponse(buildTicketModal()));
  }

  if (interaction.type === InteractionType.MODAL_SUBMIT && interaction.data?.custom_id === TICKET_MODAL_CUSTOM_ID) {
    const discordUserId: string | undefined = interaction.member?.user?.id ?? interaction.user?.id;
    const interactionToken: string = interaction.token;
    const components = interaction.data?.components ?? [];

    // `after()` schedules this callback to run once the response below has
    // actually been sent — on Vercel's serverless functions, code placed
    // AFTER a `return` never runs on its own; `after()` (stable since
    // Next.js 15, backed by Vercel's waitUntil) is what makes "ack now, do
    // the real work, then edit the message a moment later" possible at all.
    after(() => handleTicketModalSubmit(discordUserId, components, interactionToken));

    return NextResponse.json(deferredEphemeralResponse());
  }

  return new NextResponse("Unhandled interaction", { status: 400 });
}

/** The actual ticket-creation logic for a modal submission — deliberately
 * NOT part of @nimia/discord (that package stays Discord-only mechanics,
 * see interactions.ts's own top comment); this mirrors exactly what
 * createSupportTicketAction (apps/studio/app/dashboard/support/actions.ts)
 * already does for the website's own Support form, just sourced from a
 * Discord modal instead of a dashboard form, and using the service-role
 * client (createServiceRoleClient, @nimia/db) instead of a signed-in user's
 * session — there IS no website session here, only a Discord user id. */
async function handleTicketModalSubmit(
  discordUserId: string | undefined,
  components: { components: { custom_id: string; value: string }[] }[],
  interactionToken: string,
): Promise<void> {
  if (!discordUserId) {
    await editInteractionResponse(interactionToken, {
      content: "Something went wrong reading your Discord account — please try again.",
    });
    return;
  }

  const { subject, message } = readTicketModalValues(components);
  if (!subject || !message) {
    await editInteractionResponse(interactionToken, {
      content: "Please fill in both the subject and the message, then try again.",
    });
    return;
  }

  const supabase = createServiceRoleClient();

  // This lookup IS the security boundary here (the service-role client
  // bypasses RLS entirely) — only a Discord account already linked to a
  // Nimia client (migration 0025, Profile → Connect Discord) can ever open
  // a ticket this way, same requirement the website's own Support form has
  // (you must be logged in). Someone who clicks the button without having
  // connected Discord gets told to go connect it, never a ticket under
  // someone else's account.
  const { data: client } = await supabase
    .from("clients")
    .select("id, user_id, company_name")
    .eq("discord_user_id", discordUserId)
    .maybeSingle();

  if (!client) {
    await editInteractionResponse(interactionToken, {
      embeds: [
        {
          title: "Connect your Nimia account first",
          description:
            "This Discord account isn't linked to a Nimia Studio account yet. Log in at studio.nimiagames.com, go to **Profile → Connect Discord**, then come back and click the button again.",
          color: 0xf5a623,
        },
      ],
    });
    return;
  }

  const [{ data: profile }, authUserResult] = await Promise.all([
    supabase.from("users").select("full_name").eq("id", client.user_id).single(),
    // public.users has no email column (see 0001_enums_and_users.sql) — the
    // website's own createSupportTicketAction gets it from the signed-in
    // session's auth.getUser(); there is no session here, so this is the
    // service-role equivalent: auth.admin.getUserById, only available with
    // the service-role key.
    supabase.auth.admin.getUserById(client.user_id),
  ]);

  const clientName = profile?.full_name ?? client.company_name ?? "Nimia Client";
  const email = authUserResult.data.user?.email ?? "";

  const { data: ticket, error: insertError } = await supabase
    .from("support_tickets")
    .insert({
      client_id: client.id,
      full_name: profile?.full_name ?? null,
      company_name: client.company_name ?? null,
      email,
      subject,
      message,
    })
    .select("id")
    .single();

  if (insertError || !ticket) {
    console.error("[discord] Failed to create support ticket from Discord modal", insertError);
    await editInteractionResponse(interactionToken, {
      content:
        "Something went wrong opening your ticket. Please try again, or use the Support page on your dashboard.",
    });
    return;
  }

  const ticketDisplayId = `TKT-${ticket.id.slice(0, 8).toUpperCase()}`;

  // Never throws (see packages/discord/src/tickets.ts) — the ticket row
  // above is already safely saved regardless of what happens here.
  const { threadId } = await createSupportTicket({
    ticketId: ticketDisplayId,
    clientName,
    subject,
    message,
    discordUserId,
  });

  if (threadId) {
    // Service-role client bypasses RLS directly — no need for the
    // set_support_ticket_discord_thread_id RPC that createSupportTicketAction
    // uses (that RPC exists specifically to give an authenticated CLIENT
    // session a narrow way around support_tickets_update_admin_only; it
    // checks auth.uid(), which is null in this unauthenticated,
    // service-role context and would just reject the update).
    const { error: threadError } = await supabase
      .from("support_tickets")
      .update({ discord_thread_id: threadId })
      .eq("id", ticket.id);
    if (threadError) {
      console.error("[discord] Failed to persist support ticket thread id", ticket.id, threadError);
    }
  }

  await editInteractionResponse(interactionToken, {
    embeds: [
      {
        title: `🎫 Ticket ${ticketDisplayId} opened`,
        description: threadId
          ? "Staff can see it in the private thread below — you've been added to it too, so you can keep replying right here in Discord."
          : "Staff will follow up soon. You can also track it from your dashboard's Support page.",
        color: 0x22c55e,
      },
    ],
  });
}
