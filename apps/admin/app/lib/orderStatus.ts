// Status metadata for public.order_status (see
// packages/db/migrations/0001_enums_and_users.sql) — this app's equivalent
// of apps/studio/app/lib/projectStatus.ts, one source of truth for how each
// order status is labeled/colored across the Orders list, filter tabs, and
// detail panel.

export type OrderStatus = "pending_review" | "quotation_sent" | "rejected" | "converted";

export const ORDER_STATUS_META: Record<
  OrderStatus,
  { label: string; dotClass: string }
> = {
  pending_review: { label: "Pending Review", dotClass: "bg-slate-400" },
  quotation_sent: { label: "Quotation Sent", dotClass: "bg-sky-400" },
  rejected: { label: "Rejected", dotClass: "bg-red-400" },
  converted: { label: "Converted", dotClass: "bg-emerald-400" },
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
  { value: "quotation_sent", label: "Quotation Sent" },
  { value: "converted", label: "Converted" },
  { value: "rejected", label: "Rejected" },
];
