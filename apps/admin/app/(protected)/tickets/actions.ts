"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createServerClient } from "@nimia/db";
import { closeSupportTicketThread, postCreateTicketButtonMessage } from "@nimia/discord";

export type CloseTicketResult = { success: true } | { success: false; error: string };
export type PostTicketButtonResult = { success: true } | { success: false; error: string };

// Closing a ticket ALWAYS happens here, never by archiving the thread
// manually inside Discord — see migration 0027's own comment on why: this
// integration never listens for Discord-side events (no persistent
// Gateway connection, see docs/DISCORD.md), so there would be no way to
// notice a manual archive and sync `support_tickets.status` back to
// match. support_tickets_update_admin_only (0027) is what actually
// enforces this is admin-only; this action is convenience/UX.
export async function closeSupportTicketAction(ticketId: string): Promise<CloseTicketResult> {
  const supabase = createServerClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Your session has expired, please log in again." };
  }

  const { data: updated, error } = await supabase
    .from("support_tickets")
    .update({ status: "closed", closed_by: user.id, closed_at: new Date().toISOString() })
    .eq("id", ticketId)
    .eq("status", "open")
    .select("discord_thread_id")
    .single();

  if (error) return { success: false, error: error.message };

  // Best-effort, never throws (see packages/discord/src/tickets.ts) — the
  // database update above is what actually closes the ticket.
  await closeSupportTicketThread((updated as any)?.discord_thread_id ?? null);

  revalidatePath("/tickets");
  return { success: true };
}

// One-time (or occasional re-run, e.g. after staff manually deletes the
// message in Discord) setup step for the in-Discord ticket button —
// docs/DISCORD.md's "In-Discord ticket button" section. Posts the "Open a
// Ticket" button message into #create-ticket (DISCORD_CHANNEL_SUPPORT_ID);
// every click after that is handled entirely by apps/studio's
// /api/discord/interactions route, not this action. Unlike every notify*/
// create* call elsewhere in this integration, postCreateTicketButtonMessage
// deliberately THROWS on failure instead of silently logging — this only
// ever runs from an explicit admin click, where surfacing the real error
// (e.g. missing DISCORD_CHANNEL_SUPPORT_ID, or the bot lacking Send
// Messages in that channel) is more useful than a message that silently
// never showed up in Discord.
export async function postTicketButtonAction(): Promise<PostTicketButtonResult> {
  try {
    await postCreateTicketButtonMessage();
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to post the ticket button to Discord.",
    };
  }
}
