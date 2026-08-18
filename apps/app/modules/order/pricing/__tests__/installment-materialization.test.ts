import { describe, expect, it } from "vitest";
import { materializeInstallments, deriveNormalPrice } from "./installment-oracle";

describe("materializeInstallments — full_payment", () => {
  it("creates a single 100% row, pending_payment immediately", () => {
    const rows = materializeInstallments({ finalPriceUsd: 1200, paymentMethod: "full_payment", paymentPlan: "none" });
    expect(rows).toEqual([{ sequence: 1, label: "Full Payment", percentage: 100, amountUsd: 1200, status: "pending_payment" }]);
  });
});

describe("materializeInstallments — installments, two_milestones (also the 'none' default)", () => {
  it("splits 60/40 with the correct labels", () => {
    // 18 Agustus 2026, per user request ("2x: 60/40") — was 50/50 under
    // 0038's original design; see migration
    // 0051_tiered_installment_plans.sql.
    const rows = materializeInstallments({ finalPriceUsd: 1000, paymentMethod: "installments", paymentPlan: "two_milestones" });
    expect(rows).toEqual([
      { sequence: 1, label: "Project Start", percentage: 60, amountUsd: 600, status: "pending_payment" },
      { sequence: 2, label: "Before Final Delivery", percentage: 40, amountUsd: 400, status: "scheduled" },
    ]);
  });

  it("falls back to two_milestones when payment_plan is 'none' — Admin never HAS to touch it", () => {
    const withNone = materializeInstallments({ finalPriceUsd: 1000, paymentMethod: "installments", paymentPlan: "none" });
    const withExplicit = materializeInstallments({ finalPriceUsd: 1000, paymentMethod: "installments", paymentPlan: "two_milestones" });
    expect(withNone).toEqual(withExplicit);
  });

  it("only the FIRST installment is pending_payment — the rest are locked behind it", () => {
    const rows = materializeInstallments({ finalPriceUsd: 1000, paymentMethod: "installments", paymentPlan: "two_milestones" });
    expect(rows[0].status).toBe("pending_payment");
    expect(rows.slice(1).every((r) => r.status === "scheduled")).toBe(true);
  });
});

describe("materializeInstallments — installments, three_milestones", () => {
  it("splits 40/30/30 with the correct labels", () => {
    // 18 Agustus 2026, per user request ("3x: 40/30/30") — was 30/30/40
    // under 0038's original design; see migration
    // 0051_tiered_installment_plans.sql.
    const rows = materializeInstallments({ finalPriceUsd: 1000, paymentMethod: "installments", paymentPlan: "three_milestones" });
    expect(rows.map((r) => r.percentage)).toEqual([40, 30, 30]);
    expect(rows.map((r) => r.label)).toEqual(["Project Start", "Project Milestone", "Final Delivery"]);
    expect(rows.map((r) => r.amountUsd)).toEqual([400, 300, 300]);
  });
});

describe("materializeInstallments — installments, custom plan", () => {
  it("uses Admin-supplied percentages and labels", () => {
    const rows = materializeInstallments({
      finalPriceUsd: 10000,
      paymentMethod: "installments",
      paymentPlan: "custom",
      customPercentages: [20, 30, 50],
      customLabels: ["Deposit", "Alpha Build", "Launch"],
    });
    expect(rows.map((r) => r.percentage)).toEqual([20, 30, 50]);
    expect(rows.map((r) => r.label)).toEqual(["Deposit", "Alpha Build", "Launch"]);
    expect(rows.map((r) => r.amountUsd)).toEqual([2000, 3000, 5000]);
  });

  it("auto-generates 'Milestone N' labels when custom labels are missing or mismatched in length", () => {
    const missing = materializeInstallments({
      finalPriceUsd: 100,
      paymentMethod: "installments",
      paymentPlan: "custom",
      customPercentages: [40, 60],
    });
    expect(missing.map((r) => r.label)).toEqual(["Milestone 1", "Milestone 2"]);

    const mismatched = materializeInstallments({
      finalPriceUsd: 100,
      paymentMethod: "installments",
      paymentPlan: "custom",
      customPercentages: [40, 60],
      customLabels: ["Only One"],
    });
    expect(mismatched.map((r) => r.label)).toEqual(["Milestone 1", "Milestone 2"]);
  });

  it("rejects fewer than 2 custom percentages — matches the SQL RAISE EXCEPTION message", () => {
    expect(() =>
      materializeInstallments({
        finalPriceUsd: 100,
        paymentMethod: "installments",
        paymentPlan: "custom",
        customPercentages: [100],
      }),
    ).toThrow("A custom payment plan needs at least 2 milestone percentages set by Admin before pricing is confirmed.");
  });

  it("rejects percentages that don't add up to 100 — matches the SQL RAISE EXCEPTION message", () => {
    expect(() =>
      materializeInstallments({
        finalPriceUsd: 100,
        paymentMethod: "installments",
        paymentPlan: "custom",
        customPercentages: [40, 40],
      }),
    ).toThrow("Custom milestone percentages must add up to 100.");
  });

  it("allows a 0.01 floating-point tolerance on the 100% sum check, same as the SQL's `abs(sum - 100) > 0.01`", () => {
    expect(() =>
      materializeInstallments({
        finalPriceUsd: 100,
        paymentMethod: "installments",
        paymentPlan: "custom",
        customPercentages: [33.33, 33.33, 33.34], // sums to exactly 100
      }),
    ).not.toThrow();
  });
});

describe("materializeInstallments — cent-accuracy invariant (spec section 23)", () => {
  const CASES: Array<{ finalPriceUsd: number; paymentPlan: "two_milestones" | "three_milestones" | "custom" }> = [
    { finalPriceUsd: 100, paymentPlan: "two_milestones" },
    { finalPriceUsd: 333.33, paymentPlan: "two_milestones" },
    { finalPriceUsd: 1000, paymentPlan: "three_milestones" },
    { finalPriceUsd: 999.99, paymentPlan: "three_milestones" },
    { finalPriceUsd: 1234.56, paymentPlan: "three_milestones" },
    { finalPriceUsd: 77.77, paymentPlan: "custom" },
  ];

  it("the sum of every installment's amountUsd equals final_price_usd EXACTLY — never drifts by a cent", () => {
    for (const { finalPriceUsd, paymentPlan } of CASES) {
      const rows = materializeInstallments({
        finalPriceUsd,
        paymentMethod: "installments",
        paymentPlan,
        customPercentages: paymentPlan === "custom" ? [33, 33, 34] : undefined,
      });
      const sum = rows.reduce((s, r) => s + r.amountUsd, 0);
      // Compare in integer cents to sidestep binary floating-point noise —
      // this is the actual invariant the business cares about: a client's
      // installments must sum to their exact total to the cent.
      expect(Math.round(sum * 100)).toBe(Math.round(finalPriceUsd * 100));
    }
  });

  it("the LAST installment (not the first) absorbs the rounding remainder", () => {
    // 100 / 3 = 33.33333... — with three equal-ish shares this forces a
    // remainder that must land on the last row, not be spread evenly.
    const rows = materializeInstallments({
      finalPriceUsd: 100,
      paymentMethod: "installments",
      paymentPlan: "custom",
      customPercentages: [33.33, 33.33, 33.34],
    });
    expect(rows[0].amountUsd).toBe(33.33);
    expect(rows[1].amountUsd).toBe(33.33);
    // last row = 100 - 33.33 - 33.33 = 33.34 exactly (not round(100 * 33.34/100,2) which could differ by a cent)
    expect(rows[2].amountUsd).toBe(33.34);
  });
});

describe("deriveNormalPrice — Partner reward basis (product decision #2)", () => {
  it("full_payment: normal price IS the final price, unchanged", () => {
    expect(deriveNormalPrice(1000, "full_payment", 30)).toBe(1000);
  });

  it("installments: backs out the flexibility fee so Partner rewards never include it", () => {
    // A $650 installment total at 30% fee implies a $500 pre-fee price:
    // 500 * 1.30 = 650.
    expect(deriveNormalPrice(650, "installments", 30)).toBe(500);
  });

  it("round-trips with applyInstallmentFeePreview's own fee math within rounding tolerance", () => {
    const subtotal = 733.5;
    const fee = 30;
    const feeAmount = Math.round(((subtotal * fee) / 100) * 100) / 100;
    const finalPriceUsd = Math.round((subtotal + feeAmount) * 100) / 100;
    const normalPrice = deriveNormalPrice(finalPriceUsd, "installments", fee);
    // Allowed to be off by at most a cent due to two independent roundings
    // (fee-forward at submit time, fee-backward at price-confirmation time).
    expect(Math.abs(normalPrice - subtotal)).toBeLessThanOrEqual(0.01);
  });
});
