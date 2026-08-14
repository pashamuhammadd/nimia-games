import type { BundlePackage } from "../types/bundle";
import type { Estimate } from "./calculate-estimate";

const EMPTY_BUNDLE_ESTIMATE: Estimate = {
  basePrice: 0,
  basePriceLabel: "",
  baseDeliveryDays: 0,
  lineItems: [],
  totalPrice: 0,
  totalDeliveryDays: 0,
};

/**
 * Package/Bundle system (10 Agustus 2026). Mirrors calculate-estimate.ts's
 * pure, local, no-backend shape exactly (same `Estimate` interface) so
 * PriceEstimator and ReviewSection can render a bundle estimate with zero
 * changes to their pricing-display logic — only `deliveryLabel` is new, and
 * both components already fall back to the old "{totalDeliveryDays} Days"
 * display when it's absent.
 *
 * A package has a single fixed price — every creative-content choice inside
 * its slot system is already included at $0, per the brief ("Package
 * memiliki harga tetap ... TIDAK boleh double charge"). There is no
 * per-package add-on pricing system yet, so this deliberately never adds a
 * lineItem for the selected creative content; ReviewSection's bundle path
 * lists the selections in their own summary card instead, purely for
 * confirmation, not for pricing math.
 */
export function calculateBundleEstimate(pkg: BundlePackage | null): Estimate {
  if (!pkg) return EMPTY_BUNDLE_ESTIMATE;

  return {
    basePrice: pkg.price,
    basePriceLabel: `${pkg.name} package`,
    baseDeliveryDays: 0,
    lineItems: [],
    totalPrice: pkg.price,
    totalDeliveryDays: 0,
    deliveryLabel: pkg.estimatedDeliveryLabel,
  };
}
