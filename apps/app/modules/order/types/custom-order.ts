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

/** Spec section 10 — chosen at Step 5, after every service/configuration
 * decision is made, never before. `full_payment` keeps the estimate as-is;
 * `installments` adds the admin-configurable flexibility fee (default 30%,
 * see get_installment_fee_percentage() in packages/db/migrations/0038) on
 * top. Milestone COUNT (2 vs 3) is deliberately NOT a client-facing choice
 * — per the 12 Agustus 2026 product decision, Admin picks that during order
 * review, not the client here. */
export type CustomOrderPaymentMethod = "full_payment" | "installments";
