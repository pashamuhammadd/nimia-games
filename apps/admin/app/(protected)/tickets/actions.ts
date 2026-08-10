"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createServerClient } from "@nimia/db";
import { closeSupportTicketThread } from "@nimia/discord";

export type CloseTicketResult = { success: true } | { success: false; error: string };

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
