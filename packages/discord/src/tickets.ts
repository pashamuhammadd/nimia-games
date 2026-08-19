import {
  sendChannelMessage,
  createPrivateThread,
  addThreadMember,
  archiveThread,
  listGuildMemberIdsWithRole,
  type DiscordEmbed,
} from "./rest";
import { getDiscordChannelId, getDiscordStaffRoleIds } from "./config";

// Support-ticket pass (9 Agustus 2026) — docs/DISCORD.md's "Client
// support": "A 'Support' button on the website → the bot creates a
// Private Ticket, visible only to Founder + Admin + the Client who
// created it. No general chat channel for support." Kept as its own
// module rather than folded into notify.ts because tickets are a
// different shape of thing (a PRIVATE thread with explicit membership,
// vs. the public per-order threads notify.ts posts into) and have their
// own lifecycle (create once, close once) instead of an open-ended
// stream of status updates.

const COLOR_TICKET = 0xf5a623; // amber — "needs staff attention", same as notify.ts's negotiation-offer color

/** Creates a new support ticket's Discord side: a PRIVATE thread in
 * `#create-ticket` (docs/DISCORD.md), an embed with the client's message,
 * and — if the client has connected Discord (migration 0025) — adds them
 * as an explicit thread member so they can actually see and reply to
 * their own ticket. Never throws: by the time a caller reaches this, the
 * `support_tickets` row already exists in the database (that's the real
 * record of the ticket) — Discord being down/misconfigured only means
 * there's no Discord-side place to discuss it yet, never that the ticket
 * itself failed to open. Returns `{ threadId: null }` on any failure. */
export async function createSupportTicket(params: {
  ticketId: string;
  clientName: string;
  subject: string;
  message: string;
  discordUserId?: string | null;
  /** When this ticket is about a specific order (added 19 Agustus 2026,
   * per user request — "nama thread tiket harus sesuai dengan nama
   * orderannya/resi orderannya/invoice orderannya"), the Discord thread
   * name uses this order reference instead of the generic TKT-XXXXXXXX
   * ticketId, so staff can tell which project a ticket thread is about at
   * a glance without opening it. Falls back to ticketId when absent
   * (general Support-page tickets with no specific order attached). */
  threadLabel?: string;
}): Promise<{ threadId: string | null }> {
  let threadId: string | null = null;
  try {
    const channelId = getDiscordChannelId("support");
    threadId = await createPrivateThread(
      channelId,
      `🎫 ${params.threadLabel ?? params.ticketId} — ${params.subject}`.slice(0, 100),
    );

    const embed: DiscordEmbed = {
      title: `🎫 New Support Ticket — ${params.ticketId}`,
      description: params.message,
      color: COLOR_TICKET,
      fields: [
        { name: "Client", value: params.clientName, inline: true },
        { name: "Subject", value: params.subject, inline: true },
        ...(params.threadLabel ? [{ name: "Order", value: params.threadLabel, inline: false }] : []),
      ],
      timestamp: new Date().toISOString(),
    };
    await sendChannelMessage(threadId, { embeds: [embed] });

    if (params.discordUserId) {
      // Separate try/catch — a client who hasn't connected Discord (or
      // whose add-member call fails for some other reason) should still
      // get a fully-created ticket thread staff can see and act on; only
      // the client's own visibility into it is affected.
      try {
        await addThreadMember(threadId, params.discordUserId);
      } catch (error) {
        console.error("[discord] Failed to add client to their own support ticket thread", error);
      }
    }

    // Staff (Founder/Admin ROLE, not specific accounts — 19 Agustus 2026,
    // per user clarification) auto-add — "Manage Threads" only lets staff
    // browse to a private thread, it doesn't add them as a member, so no
    // one holding either role ever showed up in the thread's own member
    // list. Resolves who CURRENTLY holds each configured role
    // (listGuildMemberIdsWithRole) rather than a static account list, so
    // staff changes in Discord are picked up automatically. One
    // try/catch around the whole per-role lookup (a role lookup failing —
    // e.g. Server Members Intent not enabled yet — is one error worth
    // logging once, not per-member) plus one try/catch per addThreadMember
    // call, same as the client above, so a single member failing never
    // blocks the rest or the ticket itself.
    for (const roleId of getDiscordStaffRoleIds()) {
      try {
        const memberIds = await listGuildMemberIdsWithRole(roleId);
        for (const memberId of memberIds) {
          try {
            await addThreadMember(threadId, memberId);
          } catch (error) {
            console.error("[discord] Failed to add staff member to support ticket thread", memberId, error);
          }
        }
      } catch (error) {
        console.error("[discord] Failed to list staff role members for support ticket thread", roleId, error);
      }
    }
  } catch (error) {
    console.error("[discord] Failed to create support ticket thread", error);
  }
  return { threadId };
}

/** Archives + locks a ticket's thread when staff closes it from the admin
 * dashboard. A no-op when `threadId` is null (ticket never got a Discord
 * thread in the first place — see createSupportTicket above) — the
 * `support_tickets.status` update in the database is what actually closes
 * the ticket; this is purely a Discord-side courtesy so the thread
 * doesn't sit open forever, and never blocks the close action if it
 * fails. */
export async function closeSupportTicketThread(threadId: string | null | undefined): Promise<void> {
  if (!threadId) return;
  try {
    await archiveThread(threadId);
  } catch (error) {
    console.error("[discord] Failed to archive support ticket thread", error);
  }
}
