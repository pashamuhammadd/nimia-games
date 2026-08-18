import type { ConfigSelections } from "./order-state";

// Custom Order Builder (12 Agustus 2026) — a THIRD, separate ordering
// concept alongside Step 3's `ServicePackage` "tier" (./catalog.ts) and the
// Package/Bundle system's `BundlePackage` (./bundle.ts). Where a Bundle is
// one predefined multi-service project sold as a single fixed price, a
// Custom Order is the client assembling their OWN combination of services
// from the SAME catalog Project Builder already uses (see ../data/catalog.ts)
// — one entry per service they add, each independently configured and
// independently priced, summed into one order. Deliberately its own file/
// type family (Custom* prefix) for the same reason bundle.ts is its own
// file: so it never collides with either existing "package" concept.

/** One service a client has added to their Custom Order. Mirrors the
 * (categoryId, serviceId, packageId, configSelections) shape Project
 * Builder's OrderWizardState already carries for a SINGLE service — this is
 * the same shape repeated per selection, since Custom Order is fundamentally
 * "N of what Project Builder already does, summed into one order." `id` is a
 * local-only key (not a database id) for React lists and removal — real
 * server-side ids are assigned when order_service_selections rows are
 * inserted at submit time. */
export interface CustomServiceSelection {
  id: string;
  categoryId: string;
  serviceId: string;
  /** Only meaningful when the selected service's pricingModel is
   * "packages" (e.g. GIF/Sticker's Starter/Standard/Pro) — see
   * ../data/catalog.ts's ServiceDefinition. Null for a "startingFrom"
   * service. */
  packageId: string | null;
  configSelections: ConfigSelections;
}

/** Spec section 10 — chosen at Step 5 (Custom Order) / "payment" step
 * (Project Builder/Package, generalized 15 Agustus 2026), after every
 * service/configuration decision is made, never before. `full_payment`
 * keeps the estimate as-is; `installments` adds a flexibility fee on top
 * — how much depends on which plan the client also picks, see
 * CustomOrderInstallmentPlan below. */
export type CustomOrderPaymentMethod = "full_payment" | "installments";

/** Which milestone schedule an `installments` order uses (18 Agustus
 * 2026, per user request — REVERSES the 12 Agustus 2026 product decision
 * that this was Admin's call during review, not the client's). Chosen by
 * the client in the SAME Payment Method step as `paymentMethod` above —
 * see payment-method-step.tsx's three-card layout (Full Payment / 2
 * Installments / 3 Installments). Null whenever paymentMethod isn't
 * "installments" (mirrors paymentMethod's own null-until-chosen shape).
 *
 * `custom` (a bespoke, Admin-hand-set split for large projects — 0038's
 * product decision #4) deliberately has NO client-facing equivalent here:
 * it is not a value this type can hold. Admin can still set
 * `orders.payment_plan = 'custom'` directly for those rare cases; the
 * client wizard never offers it as a choice. See ../pricing/
 * installment-plans.ts for the two plans' actual fee/split numbers,
 * mirrored from packages/db/migrations/
 * 0051_tiered_installment_plans.sql. */
export type CustomOrderInstallmentPlan = "two_milestones" | "three_milestones";
