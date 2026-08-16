import { describe, expect, it } from "vitest";
import { getOrderPaymentSummary } from "../order-payment-summary";

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

describe("getOrderPaymentSummary — full_payment order (1 order_installments row, per materialize_order_installments)", () => {
  it("is unpaid while the single 100% row is still pending_payment", () => {
    const summary = getOrderPaymentSummary({
      finalPriceUsd: 300,
      orderStatus: "awaiting_payment",
      installments: [{ amountUsd: 300, status: "pending_payment" }],
    });
    expect(summary.paymentStatus).toBe("unpaid");
    expect(summary.hasInstallments).toBe(true);
  });

  it("is fully paid once that one row is verified 'paid' — never reads orders.final_price_usd directly, sums the row", () => {
    const summary = getOrderPaymentSummary({
      finalPriceUsd: 300,
      orderStatus: "paid",
      installments: [{ amountUsd: 300, status: "paid" }],
    });
    expect(summary).toEqual({
      totalAmountUsd: 300,
      paidAmountUsd: 300,
      remainingAmountUsd: 0,
      paymentStatus: "paid",
      hasInstallments: true,
    });
  });
});

describe("getOrderPaymentSummary — installments order — THE bug this fixes", () => {
  it("$300 total, 2x$150 milestones, only #1 verified: reports $150 paid / $150 remaining, PARTIALLY_PAID — never the $300 the old code showed", () => {
    const summary = getOrderPaymentSummary({
      finalPriceUsd: 300,
      // orders.status is already 'paid' here (handle_installment_paid flips
      // it on installment #1, product decision 12 Agustus 2026) — this is
      // exactly the case that fooled the old invoice/receipt code, which
      // read orders.status==='paid' as "show final_price_usd as amount
      // paid". This function must NOT make that mistake: it has
      // hasInstallments=true, so it ignores orderStatus entirely and sums
      // the actual rows instead.
      orderStatus: "paid",
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

  it("3-milestone order (30/30/40 of $1000): after 2 of 3 paid, reports $600 paid / $400 remaining", () => {
    const summary = getOrderPaymentSummary({
      finalPriceUsd: 1000,
      orderStatus: "paid",
      installments: [
        { amountUsd: 300, status: "paid" },
        { amountUsd: 300, status: "paid" },
        { amountUsd: 400, status: "pending_payment" },
      ],
    });
    expect(summary.paidAmountUsd).toBe(600);
    expect(summary.remainingAmountUsd).toBe(400);
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
