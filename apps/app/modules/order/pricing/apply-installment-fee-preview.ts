import type { CustomOrderPaymentMethod } from "../types/custom-order";
import type { Estimate } from "./calculate-estimate";

/**
 * Bolts the same installment-flexibility-fee preview math
 * calculateCustomOrderEstimate has always done onto a plain Project
 * Builder/Package `Estimate` (15 Agustus 2026 — Payment Method step
 * generalized from Custom Order Builder to Project Builder/Package too).
 * Deliberately NOT folded into calculate-estimate.ts/calculate-bundle-
 * estimate.ts themselves: those stay pure pricing-engine functions with zero
 * knowledge of payment method, exactly as they were designed; this is a thin
 * presentational wrapper applied in use-order-wizard.ts, right before the
 * estimate is handed to PriceEstimator/ReviewSection/the submit payload.
 *
 * A no-op (returns `estimate` unchanged) whenever paymentMethod isn't
 * "installments" — every existing reader that never heard about this still
 * sees exactly the same object shape it always did.
 *
 * Moved out of use-order-wizard.ts into its own file in this package (15
 * Agustus 2026, same day as the generalization) so it's a plain, pure,
 * dependency-free function — use-order-wizard.ts is a "use client" hook that
 * transitively imports Server Actions (submit-order-action.ts etc., which
 * read next/headers' cookies()), so importing IT from a Vitest test would
 * drag in Next.js server-runtime machinery for no reason. This file has none
 * of that: it only touches the `Estimate` shape and plain arithmetic, so the
 * Vitest suite under ./__tests__ can import and exercise the REAL function
 * directly instead of re-deriving/duplicating its formula in test code.
 */
export function applyInstallmentFeePreview(
  estimate: Estimate,
  paymentMethod: CustomOrderPaymentMethod | null,
  feePercentage: number,
): Estimate {
  if (paymentMethod !== "installments") return estimate;
  const installmentFeeAmount = Math.round(((estimate.totalPrice * feePercentage) / 100) * 100) / 100;
  const grandTotal = Math.round((estimate.totalPrice + installmentFeeAmount) * 100) / 100;
  return { ...estimate, installmentFeePercentage: feePercentage, installmentFeeAmount, grandTotal };
}
