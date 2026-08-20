/** Display-only label/color lookups for enum values read from Supabase
 * (order_status, service_category). Deliberately a SMALL, LOCAL, READ-ONLY
 * copy rather than a shared import, for a reason worth being honest about:
 *
 * apps/app/app/lib/orderStatus.ts (client dashboard) and
 * apps/admin/app/lib/orderStatus.ts (staff back office) each already keep
 * their own copy of this same order_status -> label mapping, because
 * neither app currently exports it from a shared package - see that
 * file's own comment for why the wording differs per audience (client
 * needs "what do I do right now", admin needs the internal vocabulary).
 * This file is a THIRD copy, for the same reason: apps/miniapp cannot
 * import from another app's private app/ directory in this monorepo.
 *
 * This is explicitly a smaller risk than the "commission rate duplicated
 * 3+ places" trap apps/miniapp/README.md warns about for Services/Orders/
 * Partner: that warning is about WRITE-side money math (a wrong copy
 * pays someone the wrong amount). This file only maps a known enum value
 * to a label and a color for display - the actual status VALUE always
 * comes straight from the database, and an unrecognized value here just
 * falls back to showing the raw string (see the `?? {...}` in each
 * lookup function below), never a silently wrong number. If this drifts
 * from apps/app's copy after a future status is added there, the only
 * symptom in the Mini App is a plain-text badge instead of a styled one,
 * not incorrect data. Worth extracting into a shared package eventually
 * (packages/db or a new packages/order-status) - not done here to avoid
 * touching apps/app, a live production app, as a side effect of this
 * Mini App pass. */

export type OrderStatus =
  | "pending_review"
  | "quotation_sent"
  | "negotiating"
  | "awaiting_payment"
  | "payment_submitted"
  | "paid"
  | "converted"
  | "rejected";

// Hex colors, not Tailwind utility classes - apps/miniapp's globals.css is
// a small hand-written stylesheet (no @import "tailwindcss"), unlike
// apps/app's Tailwind-based dotClass strings, so these are read directly
// as an inline background-color instead.
export const ORDER_STATUS_META: Record<OrderStatus, { label: string; color: string }> = {
  pending_review: { label: "Pending Review", color: "#94a3b8" },
  quotation_sent: { label: "Quotation Sent", color: "#38bdf8" },
  negotiating: { label: "Negotiating", color: "#fbbf24" },
  awaiting_payment: { label: "Awaiting Payment", color: "#c084fc" },
  payment_submitted: { label: "Payment Submitted", color: "#c084fc" },
  paid: { label: "Paid", color: "#34d399" },
  converted: { label: "In Production", color: "#10b981" },
  rejected: { label: "Rejected", color: "#f87171" },
};

export function orderStatusMeta(status: string) {
  return ORDER_STATUS_META[status as OrderStatus] ?? { label: status, color: "#94a3b8" };
}

// public.service_category (packages/db/migrations/0001_enums_and_users.sql)
// - plain enum-to-label formatting, not business logic, so this one is
// low-risk enough to just derive rather than hand-list (falls back to the
// raw value for any category added after this was written).
export function serviceCategoryLabel(category: string): string {
  const known: Record<string, string> = {
    "3d_animation": "3D Animation",
    "2d_animation": "2D Animation",
    game_trailer: "Game Trailer",
    product_visualization: "Product Visualization",
    motion_graphics: "Motion Graphics",
    logo_animation: "Logo Animation",
    game_asset: "Game Asset",
    ui_animation: "UI Animation",
    custom_project: "Custom Project",
  };
  return known[category] ?? category.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
