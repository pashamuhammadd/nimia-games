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

// public.installment_status (packages/db/migrations/0038_custom_order_installments.sql)
// — one row per milestone/invoice on an installments order. Same enum and
// dotClass colors as apps/admin/app/lib/orderStatus.ts's
// INSTALLMENT_STATUS_META, but with client-facing label text instead of
// admin's more operational wording (e.g. "Ready to Pay" instead of
// "Awaiting Payment", "Locked" instead of "Scheduled") — a client reading
// their own dashboard needs "what do I do right now", not the same
// vocabulary Admin uses internally. Added 15 Agustus 2026 alongside
// InstallmentSchedule.tsx, the client-side counterpart to apps/admin's
// installment verification UI — previously a client had NO way to see or
// pay milestone #2/#3 of their own order once #1 was confirmed (see project
// memory's payment_method_generalization_15agst.md).
export type InstallmentStatus =
  | "scheduled"
  | "pending_payment"
  | "payment_submitted"
  | "paid"
  | "overdue"
  | "cancelled";

export const INSTALLMENT_STATUS_META: Record<InstallmentStatus, { label: string; dotClass: string }> = {
  scheduled: { label: "Locked", dotClass: "bg-slate-500" },
  pending_payment: { label: "Ready to Pay", dotClass: "bg-purple-400" },
  payment_submitted: { label: "Under Review", dotClass: "bg-amber-400" },
  paid: { label: "Paid", dotClass: "bg-emerald-400" },
  overdue: { label: "Overdue", dotClass: "bg-red-400" },
  cancelled: { label: "Cancelled", dotClass: "bg-slate-400" },
};

export function installmentStatusMeta(status: string) {
  return (
    INSTALLMENT_STATUS_META[status as InstallmentStatus] ?? {
      label: status,
      dotClass: "bg-slate-400",
    }
  );
}
