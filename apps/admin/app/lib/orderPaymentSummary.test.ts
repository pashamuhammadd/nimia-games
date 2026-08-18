import { describe, expect, it } from "vitest";
import { getOrderPaymentSummary } from "./orderPaymentSummary";

// Fase 12 (Testing) of the 16 Agustus 2026 refactor. This file is a
// hand-synced duplicate of apps/app/modules/order/pricing/order-payment-
// summary.ts's getOrderPaymentSummary (see this file's own header comment
// on why it has to be a separate copy) — the exact scenario TESTING.md's
// "Suggested next targets" worried about for orderStatus.ts applies here
// too, but for money instead of a label: if this admin copy and apps/app's
// copy ever drift, the SAME order could show a different "Paid $X/$Y" in
// the client dashboard vs. the admin Orders list. These tests mirror
// apps/app's order-payment-summary.test.ts scenario-for-scenario so a
// future drift shows up as a failure in ONE of the two suites, not a
// silent behavioral difference nobody notices until a client complains.

describe("getOrderPaymentSummary — legacy order (no order_installments rows)", () => {
  it("reports fully unpaid before orders.status reaches 'paid'", () => {
    const summary = getOrderPaymentSummary({ finalPriceUsd: 300, orderStatus: "awaiting_payment", installments: [] });
    expect(summary).toEqual({
      totalAmountUsd: 300,
      paidAmountUsd: 0,
      remainingAmountUsd: 300,
      paymentStatus: "unpaid",
      hasInstallments: false,
    });
  });

  it("reports fully paid once orders.status is 'paid' — the old single-payment flow has no partial state", () => {
    const summary = getOrderPaymentSummary({ finalPriceUsd: 300, orderStatus: "paid", installments: [] });
    expect(summary).toEqual({
      totalAmountUsd: 300,
      paidAmountUsd: 300,
      remainingAmountUsd: 0,
      paymentStatus: "paid",
      hasInstallments: false,
    });
  });

  it("never reports partially_paid for a legacy order — that state doesn't exist for this flow", () => {
    for (const status of ["pending_review", "quotation_sent", "negotiating", "awaiting_payment", "payment_submitted", "rejected", "converted"]) {
      const summary = getOrderPaymentSummary({ finalPriceUsd: 300, orderStatus: status, installments: [] });
      expect(summary.paymentStatus).not.toBe("partially_paid");
    }
  });
});

describe("getOrderPaymentSummary — installments order — THE bug Fase 1/9 fixed", () => {
  it("$300 total, 2x$150 milestones, only #1 verified: reports $150 paid / $150 remaining, PARTIALLY_PAID — never the $300 the old admin view showed", () => {
    const summary = getOrderPaymentSummary({
      // orders.status is already 'paid' here (handle_installment_paid
      // flips it on installment #1) — exactly the case that used to fool
      // the admin Orders list into showing the full price as "paid".
      orderStatus: "paid",
      finalPriceUsd: 300,
      installments: [
        { amountUsd: 150, status: "paid" },
        { amountUsd: 150, status: "scheduled" },
      ],
    });
    expect(summary).toEqual({
      totalAmountUsd: 300,
      paidAmountUsd: 150,
      remainingAmountUsd: 150,
      paymentStatus: "partially_paid",
      hasInstallments: true,
    });
  });

  it("a payment_submitted-but-not-yet-verified installment does NOT count as paid", () => {
    const summary = getOrderPaymentSummary({
      finalPriceUsd: 300,
      orderStatus: "paid",
      installments: [
        { amountUsd: 150, status: "paid" },
        { amountUsd: 150, status: "payment_submitted" },
      ],
    });
    expect(summary.paidAmountUsd).toBe(150);
    expect(summary.paymentStatus).toBe("partially_paid");
  });

  it("reports PAID and $0 remaining once every milestone is verified", () => {
    const summary = getOrderPaymentSummary({
      finalPriceUsd: 300,
      orderStatus: "paid",
      installments: [
        { amountUsd: 150, status: "paid" },
        { amountUsd: 150, status: "paid" },
      ],
    });
    expect(summary.paymentStatus).toBe("paid");
    expect(summary.remainingAmountUsd).toBe(0);
  });

  it("remaining never goes negative even if amounts were ever inconsistent", () => {
    const summary = getOrderPaymentSummary({
      finalPriceUsd: 100,
      orderStatus: "paid",
      installments: [{ amountUsd: 150, status: "paid" }],
    });
    expect(summary.remainingAmountUsd).toBe(0);
  });
});

describe("getOrderPaymentSummary — no price set yet", () => {
  it("is unpaid with a $0 total when final_price_usd is still null (before Admin quotes it)", () => {
    const summary = getOrderPaymentSummary({ finalPriceUsd: null, orderStatus: "pending_review", installments: [] });
    expect(summary).toEqual({
      totalAmountUsd: 0,
      paidAmountUsd: 0,
      remainingAmountUsd: 0,
      paymentStatus: "unpaid",
      hasInstallments: false,
    });
  });
});
