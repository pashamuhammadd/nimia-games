// Shared status metadata for the client dashboard (30 Juli 2026, Client
// Dashboard redesign). Single source of truth for how each `project_status`
// enum value (see packages/db/migrations/0001_enums_and_users.sql,
// simplified 10->7 by 0045_project_status_simplify.sql — 16 Agustus 2026,
// State Architecture) is labeled and colored across the dashboard — so
// /dashboard, /dashboard/orders, and any future per-project page all agree
// instead of re-inventing it per component.
//
// Deliberately separate from Payment Status (order_payment_status,
// modules/order/pricing/order-payment-summary.ts /
// 0043_order_payment_summary.sql) — this enum only ever describes
// PRODUCTION progress. Nothing here is named "paid" on purpose; a
// project's payment state is a different question, answered by
// getOrderPaymentSummary() against the linked order, not by this enum.
export type ProjectStatus =
  | "new"
  | "approved"
  | "in_production"
  | "revision"
  | "ready_for_delivery"
  | "completed"
  | "cancelled";

export const PROJECT_STATUS_META: Record<ProjectStatus, { label: string; dotClass: string }> = {
  new: { label: "New", dotClass: "bg-slate-400" },
  approved: { label: "Approved", dotClass: "bg-sky-400" },
  in_production: { label: "In Production", dotClass: "bg-emerald-400" },
  revision: { label: "Review Stage", dotClass: "bg-amber-400" },
  ready_for_delivery: { label: "Ready for Delivery", dotClass: "bg-amber-400" },
  completed: { label: "Completed", dotClass: "bg-emerald-500" },
  cancelled: { label: "Cancelled", dotClass: "bg-red-400" },
};

export function projectStatusMeta(status: string) {
  return (
    PROJECT_STATUS_META[status as ProjectStatus] ?? {
      label: status,
      dotClass: "bg-slate-400",
    }
  );
}

// Human-readable "what happened" for the Recent Activity timeline, keyed
// by the `to_status` a project_updates row transitioned into (see
// public.log_project_status_change() in 0003_orders_projects.sql — a row
// is inserted there automatically on every project insert/status change).
export const PROJECT_ACTIVITY_LABEL: Record<ProjectStatus, string> = {
  new: "Order Created",
  approved: "Payment Confirmed",
  in_production: "Production Started",
  revision: "Revision Requested",
  ready_for_delivery: "Ready for Delivery",
  completed: "Project Completed",
  cancelled: "Project Cancelled",
};

export function projectActivityLabel(status: string) {
  return PROJECT_ACTIVITY_LABEL[status as ProjectStatus] ?? "Project Updated";
}
