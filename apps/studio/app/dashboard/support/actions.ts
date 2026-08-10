"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createServerClient } from "@nimia/db";
import { createSupportTicket } from "@nimia/discord";

export type CreateSupportTicketResult = { success: true } | { success: false; error: string };

// Client-facing "Support" flow (added 9 Agustus 2026, per docs/DISCORD.md's
// "Client support" section — "A 'Support' button on the website → the bot
// creates a Private Ticket, visible only to Founder + Admin + the Client
// who created it"). The `support_tickets` row (migration 0027) is the real
// record of the ticket — support_tickets_insert_own's RLS is what actually
// enforces a client can only ever create tickets under their own
// client_id, this action is convenience/UX. The Discord thread
// createSupportTicket makes is a courtesy for staff to discuss it in and
// never blocks ticket creation if it fails (see that function's own
// comment in packages/discord/src/tickets.ts) — same "website is the
// single source of truth" posture as every other Discord call in this
// integration.
export async function createSupportTicketAction(
  subject: string,
  message: string,
): Promise<CreateSupportTicketResult> {
  const trimmedSubject = subject.trim();
  const trimmedMessage = message.trim();
  if (!trimmedSubject) {
    return { success: false, error: "Enter a subject for your ticket." };
  }
  if (!trimmedMessage) {
    return { success: false, error: "Describe what you need help with." };
  }

  const supabase = createServerClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Your session has expired, please log in again." };
  }

  // Same two-query shape as submit-order-action.ts's profile fetch —
  // `users` (full_name) and `clients` (company_name, discord_user_id) are
  // separate tables, looked up by the same auth user id.
  const [{ data: profile }, { data: client, error: clientError }] = await Promise.all([
    supabase.from("users").select("full_name").eq("id", user.id).single(),
    supabase.from("clients").select("id, company_name, discord_user_id").eq("user_id", user.id).single(),
  ]);
  if (clientError || !client) {
    return { success: false, error: "Couldn't find your client profile. Please try signing in again." };
  }

  const clientName = profile?.full_name ?? (client as any).company_name ?? "Nimia Client";

  const { data: ticket, error: insertError } = await supabase
    .from("support_tickets")
    .insert({
      client_id: client.id,
      full_name: profile?.full_name ?? null,
      company_name: (client as any).company_name ?? null,
      email: user.email ?? "",
      subject: trimmedSubject,
      message: trimmedMessage,
    })
    .select("id")
    .single();

  if (insertError || !ticket) {
    return { success: false, error: "Something went wrong opening your ticket. Please try again." };
  }

  const ticketDisplayId = `TKT-${ticket.id.slice(0, 8).toUpperCase()}`;

  // Never throws (see packages/discord/src/tickets.ts) — the ticket above
  // is already safely saved regardless of what happens here.
  const { threadId } = await createSupportTicket({
    ticketId: ticketDisplayId,
    clientName,
    subject: trimmedSubject,
    message: trimmedMessage,
    discordUserId: (client as any).discord_user_id ?? null,
  });

  if (threadId) {
    const { error: threadError } = await supabase.rpc("set_support_ticket_discord_thread_id", {
      p_ticket_id: ticket.id,
      p_thread_id: threadId,
    });
    if (threadError) {
      console.error("[discord] Failed to persist support ticket thread id", ticket.id, threadError);
    }
  }

  revalidatePath("/dashboard/support");
  return { success: true };
}
