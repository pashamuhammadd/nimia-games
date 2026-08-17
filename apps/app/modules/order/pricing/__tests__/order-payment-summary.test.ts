import { describe, expect, it } from "vitest";
import { getOrderPaymentSummary, getProjectPaymentSummaries } from "../order-payment-summary";

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

// Fase 8 (16 Agustus 2026, Client dashboard payment summary) —
// getProjectPaymentSummaries joins projects -> orders -> order_installments.
// This fake mimics only the exact shape the function calls
// (.from(table).select(cols).in(column, values)) — enough to exercise its
// real branching without pulling in a real Supabase client.
function makeFakeSupabase(tables: { orders?: any[]; order_installments?: any[] }) {
  return {
    from(table: "orders" | "order_installments") {
      return {
        select(_cols: string) {
          return {
            in(column: string, values: string[]) {
              const rows = (tables[table] ?? []).filter((row) => values.includes(row[column]));
              return Promise.resolve({ data: rows });
            },
          };
        },
      };
    },
  };
}

describe("getProjectPaymentSummaries", () => {
  it("returns no entry at all for a project with no linked order (order_id null)", async () => {
    const supabase = makeFakeSupabase({});
    const result = await getProjectPaymentSummaries(supabase, [{ id: "proj-1", orderId: null }]);
    expect(result.has("proj-1")).toBe(false);
  });

  it("returns null for a project whose order_id doesn't resolve to a real order row (e.g. RLS/deleted)", async () => {
    const supabase = makeFakeSupabase({ orders: [] });
    const result = await getProjectPaymentSummaries(supabase, [{ id: "proj-1", orderId: "order-missing" }]);
    expect(result.get("proj-1")).toBeNull();
  });

  it("computes a full_payment order's summary from its single materialized installment row", async () => {
    const supabase = makeFakeSupabase({
      orders: [{ id: "order-1", final_price_usd: 300, status: "paid", payment_method: "full_payment" }],
      order_installments: [{ order_id: "order-1", amount_usd: 300, status: "paid" }],
    });
    const result = await getProjectPaymentSummaries(supabase, [{ id: "proj-1", orderId: "order-1" }]);
    expect(result.get("proj-1")).toEqual({
      totalAmountUsd: 300,
      paidAmountUsd: 300,
      remainingAmountUsd: 0,
      paymentStatus: "paid",
      hasInstallments: true,
    });
  });

  it("computes an installments order's partial summary, matching getOrderPaymentSummary's own behavior", async () => {
    const supabase = makeFakeSupabase({
      orders: [{ id: "order-2", final_price_usd: 300, status: "paid", payment_method: "installments" }],
      order_installments: [
        { order_id: "order-2", amount_usd: 150, status: "paid" },
        { order_id: "order-2", amount_usd: 150, status: "scheduled" },
      ],
    });
    const result = await getProjectPaymentSummaries(supabase, [{ id: "proj-2", orderId: "order-2" }]);
    expect(result.get("proj-2")).toEqual({
      totalAmountUsd: 300,
      paidAmountUsd: 150,
      remainingAmountUsd: 150,
      paymentStatus: "partially_paid",
      hasInstallments: true,
    });
  });

  it("falls back to orders.status for a legacy order with no order_installments rows at all", async () => {
    const supabase = makeFakeSupabase({
      orders: [{ id: "order-3", final_price_usd: 300, status: "paid", payment_method: null }],
      order_installments: [],
    });
    const result = await getProjectPaymentSummaries(supabase, [{ id: "proj-3", orderId: "order-3" }]);
    expect(result.get("proj-3")).toEqual({
      totalAmountUsd: 300,
      paidAmountUsd: 300,
      remainingAmountUsd: 0,
      paymentStatus: "paid",
      hasInstallments: false,
    });
  });

  it("handles multiple projects in one batch without cross-contaminating each other's installments", async () => {
    const supabase = makeFakeSupabase({
      orders: [
        { id: "order-a", final_price_usd: 200, status: "paid", payment_method: "full_payment" },
        { id: "order-b", final_price_usd: 500, status: "paid", payment_method: "installments" },
      ],
      order_installments: [
        { order_id: "order-a", amount_usd: 200, status: "paid" },
        { order_id: "order-b", amount_usd: 250, status: "paid" },
        { order_id: "order-b", amount_usd: 250, status: "scheduled" },
      ],
    });
    const result = await getProjectPaymentSummaries(supabase, [
      { id: "proj-a", orderId: "order-a" },
      { id: "proj-b", orderId: "order-b" },
    ]);
    expect(result.get("proj-a")?.paidAmountUsd).toBe(200);
    expect(result.get("proj-a")?.remainingAmountUsd).toBe(0);
    expect(result.get("proj-b")?.paidAmountUsd).toBe(250);
    expect(result.get("proj-b")?.remainingAmountUsd).toBe(250);
  });

  it("returns an empty map without querying anything when every project has order_id null", async () => {
    let calledFrom = false;
    const supabase = {
      from() {
        calledFrom = true;
        return { select: () => ({ in: () => Promise.resolve({ data: [] }) }) };
      },
    };
    const result = await getProjectPaymentSummaries(supabase, [
      { id: "proj-1", orderId: null },
      { id: "proj-2", orderId: null },
    ]);
    expect(result.size).toBe(0);
    expect(calledFrom).toBe(false);
  });
});
