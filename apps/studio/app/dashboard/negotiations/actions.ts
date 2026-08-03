"use server";

import { cookies } from "next/headers";
import { createServerClient } from "@nimia/db";

export type NegotiationActionResult = { success: true } | { success: false; error: string };

// Client-side negotiation response actions (3 Agustus 2026, per user
// request — after Nimia Studio sends a counter offer, the client could
// only see it here, never respond). Accept/Reject call the SECURITY
// DEFINER RPC functions from
// packages/db/migrations/0019_client_negotiation_actions.sql —
// orders_update_admin_only (0006_rls_policies.sql) intentionally blocks a
// direct client UPDATE on `orders` (status/final_price_usd), so those two
// go through a narrowly-scoped function instead of a table update.
// Sending a counter offer, on the other hand, is a plain INSERT into
// order_negotiations, already permitted by
// order_negotiations_insert_own_or_admin (0013) — no RPC needed for that
// one, same as apps/admin's own sendCounterOfferAction.

export async function acceptNegotiationOfferAction(orderId: string): Promise<NegotiationActionResult> {
  const supabase = createServerClient(await cookies());
  const { error } = await supabase.rpc("accept_negotiation_offer", { p_order_id: orderId });
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function rejectNegotiationOfferAction(orderId: string): Promise<NegotiationActionResult> {
  const supabase = createServerClient(await cookies());
  const { error } = await supabase.rpc("reject_negotiation_offer", { p_order_id: orderId });
  if (error) return { success: false, error: error.message };
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
  // RLS check — same shape as admin's sendCounterOfferAction (see
  // apps/admin/app/(protected)/orders/actions.ts) — makes sure this order
  // is still actually open for negotiation rather than silently attaching
  // an offer to one that's already moved on.
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("status")
    .eq("id", orderId)
    .single();
  if (orderError || !order) {
    return { success: false, error: orderError?.message ?? "Order not found." };
  }
  if ((order as any).status !== "negotiating") {
    return { success: false, error: "This order is no longer under negotiation." };
  }

  const { error } = await supabase.from("order_negotiations").insert({
    order_id: orderId,
    proposed_by: "client",
    amount_usd: amountUsd,
    message: message?.trim() || null,
  });

  if (error) return { success: false, error: error.message };
  return { success: true };
}
