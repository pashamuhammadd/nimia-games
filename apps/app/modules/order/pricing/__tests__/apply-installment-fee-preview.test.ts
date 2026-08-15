import { describe, expect, it } from "vitest";
import { applyInstallmentFeePreview } from "../apply-installment-fee-preview";
import type { Estimate } from "../calculate-estimate";

const BASE_ESTIMATE: Estimate = {
  basePrice: 500,
  basePriceLabel: "Starting from",
  baseDeliveryDays: 7,
  lineItems: [],
  totalPrice: 500,
  totalDeliveryDays: 7,
};

describe("applyInstallmentFeePreview", () => {
  it("is a no-op for full_payment — returns the exact same estimate reference untouched", () => {
    const result = applyInstallmentFeePreview(BASE_ESTIMATE, "full_payment", 30);
    expect(result).toBe(BASE_ESTIMATE); // same object, not just equal — no accidental fee fields
    expect(result.installmentFeeAmount).toBeUndefined();
    expect(result.grandTotal).toBeUndefined();
  });

  it("is a no-op when no payment method has been chosen yet (null)", () => {
    const result = applyInstallmentFeePreview(BASE_ESTIMATE, null, 30);
    expect(result).toBe(BASE_ESTIMATE);
  });

  it("adds the fee percentage's dollar amount on top of totalPrice for installments", () => {
    const result = applyInstallmentFeePreview(BASE_ESTIMATE, "installments", 30);
    expect(result.installmentFeePercentage).toBe(30);
    expect(result.installmentFeeAmount).toBe(150); // 500 * 30%
    expect(result.grandTotal).toBe(650); // 500 + 150
    expect(result.totalPrice).toBe(500); // deliberately untouched — see this fn's own header comment
  });

  it("rounds the fee amount and grand total to the nearest cent", () => {
    const oddEstimate: Estimate = { ...BASE_ESTIMATE, totalPrice: 333.33 };
    const result = applyInstallmentFeePreview(oddEstimate, "installments", 30);
    // 333.33 * 0.30 = 99.999 -> rounds to 100.00
    expect(result.installmentFeeAmount).toBe(100);
    expect(result.grandTotal).toBe(433.33);
  });

  it("pins the fee/total formula across several inputs — subtotal * fee% rounded to cents, then added and rounded again", () => {
    // Custom Order Builder's calculateCustomOrderEstimate has always
    // computed its own fee/total this exact same way (see that file's
    // installmentFeeAmount/total math). Project Builder/Package's preview
    // (this file) was deliberately written to match it formula-for-formula
    // so a client never sees two different totals for identical arithmetic
    // depending on which order flow they're in — see
    // calculate-custom-order-estimate.test.ts for the equivalent pin on
    // that function's own multi-service math.
    const cases = [
      { subtotal: 500, fee: 30 },
      { subtotal: 333.33, fee: 30 },
      { subtotal: 1999.99, fee: 15 },
      { subtotal: 0.01, fee: 30 },
    ];
    for (const { subtotal, fee } of cases) {
      const preview = applyInstallmentFeePreview({ ...BASE_ESTIMATE, totalPrice: subtotal }, "installments", fee);
      const expectedFeeAmount = Math.round(((subtotal * fee) / 100) * 100) / 100;
      const expectedTotal = Math.round((subtotal + expectedFeeAmount) * 100) / 100;
      expect(preview.installmentFeeAmount).toBe(expectedFeeAmount);
      expect(preview.grandTotal).toBe(expectedTotal);
    }
  });
});
