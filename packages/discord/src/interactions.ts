import { verifyKey } from "discord-interactions";
import { getDiscordPublicKey, getDiscordApplicationId, getDiscordChannelId } from "./config";
import { sendChannelMessage } from "./rest";

// In-Discord ticket button (added 12 Agustus 2026) — docs/DISCORD.md's
// "Why no persistent bot process (Gateway) is needed" section calls out
// exactly one scenario that would need more than one-shot outbound REST
// calls: "a command or button *inside Discord itself* triggering an
// action". This module is that scenario, finally built — a client clicking
// "Open a Ticket" in #create-ticket instead of only being able to open one
// from the website's own Support page (apps/studio/app/dashboard/support).
// It STILL never uses a persistent Gateway (websocket) connection: Discord
// calls this integration's own Interactions HTTP endpoint
// (apps/studio/app/api/discord/interactions/route.ts) with one POST per
// click/submit, same "ordinary serverless route, verified per-request"
// shape as the OAuth callback route already has — just inbound instead of
// outbound. See this package's README for the Developer Portal step that
// wires the endpoint up (Interactions Endpoint URL).
//
// This module intentionally stays Discord-only (verify a request, build
// the button/modal payloads, edit a deferred response) — it knows nothing
// about support_tickets or Supabase. The interactions route handler (which
// DOES know about the database, same as createSupportTicketAction already
// does) is where the actual "look up the client, insert the ticket, call
// createSupportTicket" business logic lives, matching how every other
// Discord-touching feature in this codebase keeps app-level logic in
// apps/studio/apps/admin and Discord-only mechanics in this package.

export const CREATE_TICKET_BUTTON_CUSTOM_ID = "nimia_create_ticket";
export const TICKET_MODAL_CUSTOM_ID = "nimia_ticket_modal";
export const TICKET_SUBJECT_INPUT_ID = "nimia_ticket_subject";
export const TICKET_MESSAGE_INPUT_ID = "nimia_ticket_message";

// Trimmed to exactly the interaction/response type numbers this
// integration handles — Discord's real enums have more (slash commands,
// autocomplete, etc.) that nothing here needs yet.
export const InteractionType = {
  PING: 1,
  MESSAGE_COMPONENT: 3,
  MODAL_SUBMIT: 5,
} as const;

export const InteractionResponseType = {
  PONG: 1,
  DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE: 5,
  MODAL: 9,
} as const;

// Ephemeral flag (1 << 6) — every response this module builds sets it, so
// a ticket's subject/message and the "ticket opened" confirmation are only
// ever visible to the client who clicked the button, never posted publicly
// into #create-ticket (matches docs/DISCORD.md's Security section: a
// ticket's content is exactly the kind of private client detail that
// should never show up in a public channel).
const EPHEMERAL_FLAG = 1 << 6;

/** Verifies the `X-Signature-Ed25519` / `X-Signature-Timestamp` headers
 * Discord attaches to every Interactions HTTP request, against
 * DISCORD_PUBLIC_KEY and the EXACT raw request body — Ed25519 verification
 * is over the literal bytes Discord signed, so the caller (the route
 * handler) must pass the raw body text it read BEFORE any JSON.parse, and
 * must not have mutated it. Discord test-pings a new Interactions Endpoint
 * URL and disables it if a bad/missing signature isn't rejected, so this
 * check is load-bearing, not a nice-to-have. */
export function verifyDiscordInteractionRequest(
  rawBody: string,
  signature: string | null,
  timestamp: string | null,
): boolean {
  if (!signature || !timestamp) return false;
  return verifyKey(rawBody, signature, timestamp, getDiscordPublicKey());
}

export function pongResponse() {
  return { type: InteractionResponseType.PONG };
}

/** The message posted once into `#create-ticket` (docs/DISCORD.md) with the
 * "Open a Ticket" button — see postCreateTicketButtonMessage below for the
 * function that actually posts it (wired to a "Post Ticket Button" action
 * on apps/admin's Tickets page). Re-posting this is harmless but leaves a
 * duplicate message sitting in the channel — only needs to run again if
 * staff deletes the original in Discord. */
export function buildCreateTicketButtonMessage() {
  return {
    embeds: [
      {
        title: "🎫 Need help with your account or an order?",
        description:
          "Click **Open a Ticket** below to start a private conversation with our team. You'll need to have connected your Discord account on your Nimia dashboard first (Profile → Connect Discord) so we know which account the ticket belongs to.",
        color: 0xf5a623,
      },
    ],
    components: [
      {
        type: 1, // action row
        components: [
          {
            type: 2, // button
            style: 1, // primary (blurple)
            label: "Open a Ticket",
            emoji: { name: "🎫" },
            custom_id: CREATE_TICKET_BUTTON_CUSTOM_ID,
          },
        ],
      },
    ],
  };
}

/** Posts buildCreateTicketButtonMessage above into #create-ticket
 * (DISCORD_CHANNEL_SUPPORT_ID) — a one-time (or occasional re-run, if the
 * message gets deleted) setup step, not something called on every deploy.
 * Deliberately throws on failure rather than swallowing the error, unlike
 * every notify-/create-style function elsewhere in this package — this always
 * runs from an explicit admin click (apps/admin's Tickets page), where
 * silent failure would just leave staff wondering why the button never
 * showed up in Discord; the caller shows the error directly instead. */
export async function postCreateTicketButtonMessage(): Promise<string> {
  const channelId = getDiscordChannelId("support");
  return sendChannelMessage(channelId, buildCreateTicketButtonMessage());
}

/** The modal Discord shows immediately after the button above is clicked —
 * this IS the response to that MESSAGE_COMPONENT interaction (type 9,
 * MODAL), not a separate followup message. Mirrors the same two fields the
 * website's own support form asks for (SupportTicketForm.tsx: subject +
 * message) so a ticket opened from Discord looks identical, once it lands
 * in support_tickets / the admin Tickets page, to one opened from the
 * dashboard. */
export function buildTicketModal() {
  return {
    custom_id: TICKET_MODAL_CUSTOM_ID,
    title: "Open a Support Ticket",
    components: [
      {
        type: 1,
        components: [
          {
            type: 4, // text input
            custom_id: TICKET_SUBJECT_INPUT_ID,
            style: 1, // short
            label: "Subject",
            placeholder: "e.g. Question about my order NM-2026-00021",
            max_length: 120,
            required: true,
          },
        ],
      },
      {
        type: 1,
        components: [
          {
            type: 4,
            custom_id: TICKET_MESSAGE_INPUT_ID,
            style: 2, // paragraph
            label: "How can we help?",
            placeholder: "Describe what you need help with...",
            max_length: 1000,
            required: true,
          },
        ],
      },
    ],
  };
}

export function modalResponse(modal: ReturnType<typeof buildTicketModal>) {
  return { type: InteractionResponseType.MODAL, data: modal };
}

/** Extracts the two text-input values from a MODAL_SUBMIT interaction's
 * `data.components` — Discord nests each input one level down inside its
 * own action row (the same shape buildTicketModal above sends out), so
 * this walks that structure rather than assuming a flat array. */
export function readTicketModalValues(
  components: { components: { custom_id: string; value: string }[] }[],
): { subject: string; message: string } {
  const all = components.flatMap((row) => row.components ?? []);
  const subject = all.find((c) => c.custom_id === TICKET_SUBJECT_INPUT_ID)?.value ?? "";
  const message = all.find((c) => c.custom_id === TICKET_MESSAGE_INPUT_ID)?.value ?? "";
  return { subject: subject.trim(), message: message.trim() };
}

/** A DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE response, ephemeral (see
 * EPHEMERAL_FLAG above) — used for the modal-submit interaction because
 * everything the route does after acking it (look up the client by
 * discord_user_id, insert the support_tickets row, call createSupportTicket
 * — which itself makes 2-3 sequential Discord REST calls) can plausibly
 * cross Discord's hard 3-second initial-response window, especially on a
 * cold serverless start. Deferring first, then editing the response
 * afterward via editInteractionResponse below, is Discord's own documented
 * pattern for this — not a workaround, the intended shape for any
 * interaction whose handling does real work. */
export function deferredEphemeralResponse() {
  return {
    type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE,
    data: { flags: EPHEMERAL_FLAG },
  };
}

/** Edits the "thinking..." placeholder left by a deferred response into the
 * real result. Discord's endpoint for this is authenticated by the
 * interaction's own token (valid 15 minutes) plus the Application ID, NOT
 * the bot token — a completely different credential from every other call
 * in rest.ts, which is why this lives here instead of being folded into
 * that file. Never throws, same never-throwing posture as
 * tickets.ts/notify.ts — by the time a caller reaches this, the actual
 * ticket-creation work already happened (or failed) and there is nothing
 * left to roll back; the worst case is Discord's "thinking..." message just
 * expires after 15 minutes unedited, a UI-only inconvenience, never a lost
 * ticket (the support_tickets row, if it got created, is the real record —
 * same "website/database is the source of truth" posture as everywhere
 * else in this integration). */
export async function editInteractionResponse(
  interactionToken: string,
  payload: { content?: string; embeds?: { title?: string; description?: string; color?: number }[] },
): Promise<void> {
  try {
    const applicationId = getDiscordApplicationId();
    const response = await fetch(
      `https://discord.com/api/v10/webhooks/${applicationId}/${interactionToken}/messages/@original`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );
    if (!response.ok) {
      console.error(
        `[discord] Failed to edit interaction response (${response.status}): ${await response.text()}`,
      );
    }
  } catch (error) {
    console.error("[discord] Failed to edit interaction response", error);
  }
}
