"use server";

import { cookies } from "next/headers";
import { createServerClient } from "@nimia/db";
import { notifyNegotiationUpdate } from "@nimia/discord";

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

// Shared shape for the fields the Discord notifications below need — same
// idea as apps/admin's OrderEmailFields, just without an email column
// (this file has no email sending of its own, unlike its apps/admin
// counterpart).
type OrderNotifyFields = {
  full_name: string | null;
  company_name: string | null;
  final_price_usd: number | null;
  services: { name: string } | { name: string }[] | null;
};

function resolveServiceName(services: OrderNotifyFields["services"]): string {
  if (!services) return "your project";
  const row = Array.isArray(services) ? services[0] : services;
  return row?.name ?? "your project";
}

function resolveClientName(order: OrderNotifyFields): string {
  return order.full_name ?? order.company_name ?? "A client";
}

// Added 9 Agustus 2026 (notifications phase). The RPCs below don't return
// the order's client-facing fields, so this does a small best-effort
// follow-up SELECT purely to have something to put in the Discord embed —
// wrapped so a failure here (or notifyNegotiationUpdate itself, which
// already never throws — see packages/discord/src/notify.ts) can NEVER
// turn an already-successful accept/reject into a failed response.
async function notifyBestEffort(
  supabase: ReturnType<typeof createServerClient>,
  orderId: string,
  kind: "accepted" | "rejected",
): Promise<void> {
  try {
    const { data: order } = await supabase
      .from("orders")
      .select("full_name, company_name, final_price_usd, services(name)")
      .eq("id", orderId)
      .single();
    if (!order) return;
    const fields = order as unknown as OrderNotifyFields;
    await notifyNegotiationUpdate({
      orderId: `ORD-${orderId.slice(0, 8).toUpperCase()}`,
      clientName: resolveClientName(fields),
      serviceName: resolveServiceName(fields.services),
      kind,
      amountUsd: kind === "accepted" ? fields.final_price_usd : null,
    });
  } catch (error) {
    console.error(`[discord] Failed to look up order for ${kind} notification`, orderId, error);
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
  // RLS check — same shape as admin's sendCounterOfferAction (see
  // apps/admin/app/(protected)/orders/actions.ts) — makes sure this order
  // is still actually open for negotiation rather than silently attaching
  // an offer to one that's already moved on. Also doubles as the fetch for
  // the Discord notification's fields (added 9 Agustus 2026).
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("status, full_name, company_name, services(name)")
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

  const fields = order as unknown as OrderNotifyFields;
  await notifyNegotiationUpdate({
    orderId: `ORD-${orderId.slice(0, 8).toUpperCase()}`,
    clientName: resolveClientName(fields),
    serviceName: resolveServiceName(fields.services),
    kind: "offer",
    proposedBy: "client",
    amountUsd,
    message: message?.trim() || null,
  });

  return { success: true };
}
