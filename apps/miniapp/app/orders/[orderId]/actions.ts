"use server";

import { cookies } from "next/headers";
import { createServerClient } from "@nimia/db";
import { notifyNegotiationUpdate } from "@nimia/discord";

export type NegotiationActionResult = { success: true } | { success: false; error: string };

/** Mirrors apps/app/app/dashboard/negotiations/actions.ts's three actions
 * (same RPCs, same insert-with-status-check pattern for the counter
 * offer) - this file necessarily duplicates the UI-triggering wrapper
 * (Next.js server actions can't be imported across separate apps in this
 * monorepo, only packages), but every actual state change still goes
 * through the SAME database functions
 * (accept_negotiation_offer / reject_negotiation_offer,
 * packages/db/migrations/0019_client_negotiation_actions.sql) as the
 * full dashboard - there is exactly one source of truth for what
 * "accept" actually does, this only duplicates the wrapper, never the
 * underlying business logic (the "commission rate duplicated 3+ places"
 * trap apps/miniapp/README.md warns about is about re-deriving numbers
 * in TypeScript, not about calling the same RPC from a second UI). */

type OrderNotifyFields = {
  full_name: string | null;
  company_name: string | null;
  final_price_usd: number | null;
  services: { name: string } | { name: string }[] | null;
  discord_thread_id?: string | null;
};

function resolveServiceName(services: OrderNotifyFields["services"]): string {
  if (!services) return "your project";
  const row = Array.isArray(services) ? services[0] : services;
  return row?.name ?? "your project";
}

function resolveClientName(order: OrderNotifyFields): string {
  return order.full_name ?? order.company_name ?? "A client";
}

/** Best-effort Discord notification, same shape as apps/app's own
 * notifyBestEffort. NOTE (honest gap, not silently assumed working):
 * this requires @nimia/discord's DISCORD_BOT_TOKEN and channel id env
 * vars to ALSO be set on apps/miniapp's own Vercel project - this
 * monorepo's "one app = one Vercel project, independent env vars"
 * convention means they are NOT inherited from apps/app just because
 * both apps use the same package. If they aren't set here yet, this
 * throws inside getDiscordConfig/getDiscordChannelId - caught below so
 * a missing/incomplete Discord config on THIS app can never turn an
 * already-successful accept/reject/counter into a failed response, it
 * just means staff don't get pinged in Discord for this one until those
 * env vars are added. */
async function notifyBestEffort(
  supabase: ReturnType<typeof createServerClient>,
  orderId: string,
  kind: "accepted" | "rejected" | "offer",
  extra: { proposedBy?: "client" | "staff"; amountUsd?: number | null; message?: string | null } = {},
): Promise<void> {
  try {
    const { data: order } = await supabase
      .from("orders")
      .select("full_name, company_name, final_price_usd, services(name), discord_thread_id")
      .eq("id", orderId)
      .single();
    if (!order) return;
    const fields = order as unknown as OrderNotifyFields;
    await notifyNegotiationUpdate({
      orderId: `ORD-${orderId.slice(0, 8).toUpperCase()}`,
      clientName: resolveClientName(fields),
      serviceName: resolveServiceName(fields.services),
      kind,
      proposedBy: extra.proposedBy,
      amountUsd: extra.amountUsd !== undefined ? extra.amountUsd : fields.final_price_usd,
      message: extra.message ?? null,
      threadId: fields.discord_thread_id,
    });
  } catch (error) {
    console.error(`[discord] Failed to send ${kind} notification for order ${orderId}`, error);
  }
}

export async function acceptNegotiationOfferAction(orderId: string): Promise<NegotiationActionResult> {
  const supabase = createServerClient(await cookies());
  const { error } = await supabase.rpc("accept_negotiation_offer", { p_order_id: orderId });
  if (error) return { success: false, error: error.message };
  await notifyBestEffort(supabase, orderId, "accepted");
  return { success: true };
}

export async function rejectNegotiationOfferAction(orderId: string): Promise<NegotiationActionResult> {
  const supabase = createServerClient(await cookies());
  const { error } = await supabase.rpc("reject_negotiation_offer", { p_order_id: orderId });
  if (error) return { success: false, error: error.message };
  await notifyBestEffort(supabase, orderId, "rejected");
  return { success: true };
}

export async function sendClientCounterOfferAction(
  orderId: string,
  amountUsd: number,
  message?: string,
): Promise<NegotiationActionResult> {
  if (!Number.isFinite(amountUsd) || amountUsd <= 0) {
    return { success: false, error: "Enter a valid counter offer amount." };
  }

  const supabase = createServerClient(await cookies());

  // Defense in depth alongside order_negotiations_insert_own_or_admin's
  // RLS check, same shape as apps/app's own sendClientCounterOfferAction
  // - makes sure this order is still actually open for negotiation
  // rather than silently attaching an offer to one that's already moved
  // on.
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("status")
    .eq("id", orderId)
    .maybeSingle();
  if (orderError || !order) {
    return { success: false, error: orderError?.message ?? "Order not found." };
  }
  if ((order as { status: string }).status !== "negotiating") {
    return { success: false, error: "This order is no longer under negotiation." };
  }

  const { error } = await supabase.from("order_negotiations").insert({
    order_id: orderId,
    proposed_by: "client",
    amount_usd: amountUsd,
    message: message?.trim() || null,
  });
  if (error) return { success: false, error: error.message };

  await notifyBestEffort(supabase, orderId, "offer", {
    proposedBy: "client",
    amountUsd,
    message: message?.trim() || null,
  });

  return { success: true };
}
