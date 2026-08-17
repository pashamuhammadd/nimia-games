// Operational View — Fase 9 (Admin dashboard) of the 16 Agustus 2026
// Order/Payment/Invoice refactor. FASE0-AUDIT.md Current Problems #9:
// "Admin /orders cuma 1 halaman list + 2 filter independen (status enum
// mentah + payment method) — bukan operational views (New/Awaiting
// Payment/Active/Awaiting Final Payment/Ready for Delivery/Completed/
// Cancelled)." Root Causes section ties this directly to #10 ("projects
// .status ... tidak disebut sama sekali di ... /orders admin — praktiknya
// sekarang ada 3 'status' berbeda yang dilihat orang berbeda").
//
// Proposed Architecture #7 describes this as "computed grouping (bukan
// kolom fisik) di atas kombinasi orders.status + payment_status +
// order_flow_type" — deliberately NOT a new physical column/enum, no
// migration. Read literally, that sentence omits `projects.status`, but
// the 7 bucket NAMES it's paired with (Active / Awaiting Final Payment /
// Ready for Delivery — all `project_status` values, not `order_status`
// ones) only make sense once a project actually exists (post-conversion,
// see 0029_auto_create_project_on_paid.sql). `orders.status` alone has no
// way to distinguish "just started production" from "ready to deliver"
// once it reaches 'paid'/'converted' — it stays whatever it is forever
// after that. So this module ALSO reads the linked project's status
// (embedded via the `projects.order_id` reverse FK in the same orders
// query the Orders page already runs — see page.tsx's own comment) where
// one exists, which is the only way to resolve problem #10's actual
// complaint, not just #9's. Documented here explicitly (same "review,
// documented in the code, not asked case-by-case" precedent as Fase 7's
// order_flow_type migration) since it's a real interpretation call, not a
// verifiable fact.
//
// This is a pure, deterministic, read-only classifier — no DB writes,
// nothing here can ever disagree with `orders.status`/`projects.status`
// themselves (those two enums remain the actual source of truth; this is
// just a coarser lens over them for admin's convenience).

import type { OrderPaymentSummary } from "./orderPaymentSummary";

export type OperationalBucket =
  | "new"
  | "awaiting_payment"
  | "active"
  | "awaiting_final_payment"
  | "ready_for_delivery"
  | "completed"
  | "cancelled";

export const OPERATIONAL_BUCKET_META: Record<OperationalBucket, { label: string; dotClass: string }> = {
  new: { label: "New", dotClass: "bg-slate-400" },
  awaiting_payment: { label: "Awaiting Payment", dotClass: "bg-purple-400" },
  active: { label: "Active", dotClass: "bg-emerald-400" },
  // Distinct color from plain "Active" on purpose — this is the exact
  // "utang teknis" state Root Causes #3/#10 called out: production is
  // already running (installment #1 cleared, project created) but money
  // is still owed. Admin scanning by eye should be able to spot this
  // without opening every order's Installment Schedule.
  awaiting_final_payment: { label: "Awaiting Final Payment", dotClass: "bg-amber-400" },
  ready_for_delivery: { label: "Ready for Delivery", dotClass: "bg-amber-400" },
  completed: { label: "Completed", dotClass: "bg-emerald-500" },
  cancelled: { label: "Cancelled", dotClass: "bg-red-400" },
};

export function operationalBucketMeta(bucket: OperationalBucket) {
  return OPERATIONAL_BUCKET_META[bucket];
}

// Tab order for the UI — intentionally follows the pipeline's natural
// left-to-right flow (intake -> money -> production -> delivery -> done),
// same convention ORDER_STATUS_FILTERS already uses.
export const OPERATIONAL_BUCKET_FILTERS: { value: OperationalBucket | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "new", label: "New" },
  { value: "awaiting_payment", label: "Awaiting Payment" },
  { value: "active", label: "Active" },
  { value: "awaiting_final_payment", label: "Awaiting Final Payment" },
  { value: "ready_for_delivery", label: "Ready for Delivery" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

/**
 * Classifies one order into an operational bucket.
 *
 * `linkedProjectStatus` is the `projects.status` of the project this order
 * created (via `orders_create_project_after_paid`, 0029), or `null` if no
 * project exists yet — true for every pre-payment order, and (in theory
 * only — the trigger fires synchronously on the same transaction that
 * flips an order to 'paid') briefly possible for a 'paid'/'converted'
 * order in a race/edge case. The `paid`/`converted`-with-no-project
 * fallback branch below exists purely so this function never throws or
 * returns something nonsensical for that edge case — it is NOT expected
 * to be hit in normal operation.
 *
 * Bucket boundaries chosen (documented, not verifiable from the audit doc
 * alone — see this file's header comment):
 *   - "New" = orders.status 'pending_review' only — nothing has happened
 *     to it yet.
 *   - "Awaiting Payment" = every pre-payment intake status AFTER New
 *     (quotation_sent/negotiating/awaiting_payment/payment_submitted) —
 *     the order is somewhere in the pipeline toward getting paid, exact
 *     sub-stage still visible via the existing raw status badge/filter,
 *     this bucket is deliberately coarser.
 *   - "Cancelled" = orders.status 'rejected'. A project cancelled AFTER
 *     conversion (projects.status='cancelled') also reports "cancelled"
 *     here for that one order's badge, but is NOT reachable through the
 *     Cancelled TAB's DB-level filter today (that tab filters on
 *     orders.status='rejected' only, for query simplicity) — noted as a
 *     known v1 gap in page.tsx's own comment, not a silent bug.
 *   - Once a project exists: "Completed"/"Ready for Delivery" mirror
 *     projects.status directly (those are terminal/near-terminal states
 *     no payment nuance changes). Otherwise (new/approved/in_production/
 *     revision project stages): "Awaiting Final Payment" if this order's
 *     payment_status is still partially_paid (i.e. an installment order
 *     with production already running but money still owed — exactly
 *     Root Causes #3/#10's "utang teknis"), else plain "Active".
 */
export function computeOperationalBucket(
  order: { status: string },
  paymentSummary: OrderPaymentSummary,
  linkedProjectStatus: string | null,
): OperationalBucket {
  if (order.status === "rejected") return "cancelled";

  if (linkedProjectStatus != null) {
    if (linkedProjectStatus === "cancelled") return "cancelled";
    if (linkedProjectStatus === "completed") return "completed";
    if (linkedProjectStatus === "ready_for_delivery") return "ready_for_delivery";
    // new / approved / in_production / revision — project is running.
    return paymentSummary.paymentStatus === "partially_paid" ? "awaiting_final_payment" : "active";
  }

  // No linked project — normal for every pre-payment order.
  if (order.status === "pending_review") return "new";
  if (["quotation_sent", "negotiating", "awaiting_payment", "payment_submitted"].includes(order.status)) {
    return "awaiting_payment";
  }
  // paid/converted with no project row is the edge case documented above
  // — fall back to "active" rather than throwing or mislabeling it "new".
  return "active";
}
