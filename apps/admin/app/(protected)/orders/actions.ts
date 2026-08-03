"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createServerClient } from "@nimia/db";

export type OrderActionResult = { success: true } | { success: false; error: string };

// Every write below relies on RLS as the real enforcement boundary
// (orders_update_admin_only / projects_admin_write in
// packages/db/migrations/0006_rls_policies.sql both gate on
// public.is_admin()) — this file is convenience/UX, not the security
// boundary itself.

export async function approveOrderAction(orderId: string): Promise<OrderActionResult> {
  const supabase = createServerClient(await cookies());
  const { error } = await supabase
    .from("orders")
    .update({ status: "quotation_sent" })
    .eq("id", orderId);

  if (error) return { success: false, error: error.message };
  revalidatePath("/orders");
  revalidatePath("/");
  return { success: true };
}

export async function rejectOrderAction(orderId: string): Promise<OrderActionResult> {
  const supabase = createServerClient(await cookies());
  const { error } = await supabase.from("orders").update({ status: "rejected" }).eq("id", orderId);

  if (error) return { success: false, error: error.message };
  revalidatePath("/orders");
  revalidatePath("/");
  return { success: true };
}

// Creates the public.projects row an approved order becomes, then marks the
// order 'converted' — the same two-step "order -> project" hand-off
// docs/ARCHITECTURE.md describes admin doing manually once ready to start
// work. project_updates gets its first row automatically via the
// log_project_status_change trigger (0003_orders_projects.sql) on insert.
export async function convertToProjectAction(orderId: string): Promise<OrderActionResult> {
  const supabase = createServerClient(await cookies());

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("id, client_id, description, status, services(name)")
    .eq("id", orderId)
    .single();

  if (orderError || !order) {
    return { success: false, error: orderError?.message ?? "Order not found." };
  }
  if ((order as any).status !== "quotation_sent") {
    return {
      success: false,
      error: "Only orders in Quotation Sent can be converted to a project.",
    };
  }

  const serviceName = (order as any).services?.name as string | undefined;
  const description = (order as any).description as string;
  const title = serviceName
    ? `${serviceName}: ${description.slice(0, 40)}`
    : description.slice(0, 60);

  const { error: insertError } = await supabase.from("projects").insert({
    order_id: order.id,
    client_id: (order as any).client_id,
    title,
  });
  if (insertError) return { success: false, error: insertError.message };

  const { error: updateError } = await supabase
    .from("orders")
    .update({ status: "converted" })
    .eq("id", orderId);
  if (updateError) return { success: false, error: updateError.message };

  revalidatePath("/orders");
  revalidatePath("/");
  revalidatePath("/projects");
  return { success: true };
}

// ------------------------------------------------------------------
// Negotiation actions (3 Agustus 2026, per user request — "kok gaada list
// yang nego sih"). An order lands in status 'negotiating' when a client
// uses /order's "Negotiate Price" button (see
// apps/studio/modules/order/state/submit-order-action.ts); until now this
// app had no way to see the offer or respond to it. Mirrors the
// client-facing thread in
// apps/studio/app/dashboard/negotiations/NegotiationThreadList.tsx — same
// order_negotiations rows, opposite side of the conversation.
// ------------------------------------------------------------------

// Accepts an offer as-is: records it as the agreed price and moves the
// order to 'awaiting_payment' (the next stage in the crypto-payment flow,
// see packages/db/migrations/0012/0013) so the client can be sent a wallet
// address to pay. Deliberately does NOT insert a new order_negotiations
// row — accepting isn't a new offer, it's agreeing to the existing one.
export async function acceptNegotiationOfferAction(
  orderId: string,
  amountUsd: number,
): Promise<OrderActionResult> {
  const supabase = createServerClient(await cookies());
  const { error } = await supabase
    .from("orders")
    .update({ status: "awaiting_payment", final_price_usd: amountUsd })
    .eq("id", orderId);

  if (error) return { success: false, error: error.message };
  revalidatePath("/orders");
  revalidatePath("/");
  return { success: true };
}

// Sends a counter offer: a new order_negotiations row from 'staff' — same
// shape as the client's own offer, just the other side of the thread. The
// order stays in 'negotiating' until either side accepts (or rejects).
export async function sendCounterOfferAction(
  orderId: string,
  amountUsd: number,
  message?: string,
): Promise<OrderActionResult> {
  if (!Number.isFinite(amountUsd) || amountUsd <= 0) {
    return { success: false, error: "Enter a valid counter offer amount." };
  }

  const supabase = createServerClient(await cookies());

  // Defense in depth alongside order_negotiations_insert_own_or_admin's RLS
  // check — this also makes sure the order is actually still negotiating
  // rather than silently attaching an offer to an already-closed order.
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
    proposed_by: "staff",
    amount_usd: amountUsd,
    message: message?.trim() || null,
  });

  if (error) return { success: false, error: error.message };
  revalidatePath("/orders");
  revalidatePath("/");
  return { success: true };
}

// Ends a negotiation without agreeing to a price — same terminal state as
// rejecting a fresh order, just reachable from 'negotiating' too.
export async function rejectNegotiationAction(orderId: string): Promise<OrderActionResult> {
  return rejectOrderAction(orderId);
}
