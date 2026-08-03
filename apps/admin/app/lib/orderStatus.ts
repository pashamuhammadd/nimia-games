// Status metadata for public.order_status (see
// packages/db/migrations/0001_enums_and_users.sql, extended by
// 0012_order_negotiation_status.sql with negotiating/awaiting_payment/
// payment_submitted/paid) — this app's equivalent of
// apps/studio/app/lib/projectStatus.ts, one source of truth for how each
// order status is labeled/colored across the Orders list, filter tabs, and
// detail panel.
//
// Rewritten (3 Agustus 2026, per user request — "kok gaada list yang nego
// sih"): this used to only know the original 4 values from 0001
// (pending_review/quotation_sent/rejected/converted), so a negotiating
// order fell through to the raw-string fallback below with no filter tab
// and no dedicated label — which is why it looked like negotiations weren't
// showing up at all. Mirrors apps/studio/app/lib/orderStatus.ts's meta
// exactly so the same order looks the same in both apps.

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
  quotation_sent: { label: "Quotation Sent", dotClass: "bg-sky-400" },
  negotiating: { label: "Negotiating", dotClass: "bg-amber-400" },
  awaiting_payment: { label: "Awaiting Payment", dotClass: "bg-purple-400" },
  payment_submitted: { label: "Payment Submitted", dotClass: "bg-purple-400" },
  paid: { label: "Paid", dotClass: "bg-emerald-400" },
  converted: { label: "Converted", dotClass: "bg-emerald-500" },
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

export const ORDER_STATUS_FILTERS: { value: OrderStatus | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "pending_review", label: "Pending Review" },
  { value: "negotiating", label: "Negotiating" },
  { value: "quotation_sent", label: "Quotation Sent" },
  { value: "awaiting_payment", label: "Awaiting Payment" },
  { value: "payment_submitted", label: "Payment Submitted" },
  { value: "paid", label: "Paid" },
  { value: "converted", label: "Converted" },
  { value: "rejected", label: "Rejected" },
];
