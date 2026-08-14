// Shared status metadata for orders — the intake stage, before an order
// becomes a project (see packages/db/migrations/0003_orders_projects.sql
// and 0012_order_negotiation_status.sql for the full `order_status` enum,
// extended by the negotiation/crypto-payment flow in 0013).
//
// Deliberately separate from lib/projectStatus.ts: `orders.status` and
// `projects.status` are two different Postgres enums with almost entirely
// different values (e.g. orders has "negotiating"/"awaiting_payment",
// projects has "planning"/"in_progress") — merging them into one lookup
// would silently mislabel half the states.
export type OrderStatus =
  | "pending_review"
  | "quotation_sent"
  | "negotiating"
  | "awaiting_payment"
  | "payment_submitted"
  | "paid"
  | "converted"
  | "rejected";

export const ORDER_STATUS_META: Record<OrderStatus, { label: string; dotClass: string }> = {
  pending_review: { label: "Pending Review", dotClass: "bg-slate-400" },
  // Live status, not legacy (corrected 12 Agustus 2026, order-flow audit —
  // see 0012's own updated comment) — every direct/non-negotiated order
  // still passes through here via approveOrderAction ("Approve & Send
  // Quotation") in apps/admin.
  quotation_sent: { label: "Quotation Sent", dotClass: "bg-sky-400" },
  negotiating: { label: "Negotiating", dotClass: "bg-amber-400" },
  awaiting_payment: { label: "Awaiting Payment", dotClass: "bg-purple-400" },
  payment_submitted: { label: "Payment Submitted", dotClass: "bg-purple-400" },
  paid: { label: "Paid", dotClass: "bg-emerald-400" },
  // An admin promotes an order into a project once it's paid/approved (see
  // 0003_orders_projects.sql) — from the client's point of view that just
  // means production has started, so this reads as "In Production" rather
  // than the more internal-sounding "Converted".
  converted: { label: "In Production", dotClass: "bg-emerald-500" },
  rejected: { label: "Rejected", dotClass: "bg-red-400" },
};

export function orderStatusMeta(status: string) {
  return (
    ORDER_STATUS_META[status as OrderStatus] ?? {
      label: status,
      dotClass: "bg-slate-400",
    }
  );
}
