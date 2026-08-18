import { describe, expect, it } from "vitest";
import { computeOperationalBucket } from "./operationalStatus";
import type { OrderPaymentSummary } from "./orderPaymentSummary";

// Fase 12 (Testing) of the 16 Agustus 2026 refactor. computeOperationalBucket
// is the highest-value new target added this refactor (Fase 9) — it is a
// pure classifier combining 3 dimensions (order status, payment summary,
// linked project status), it drives what admin sees as the primary
// Operational View tabs, and its bucket boundaries are a documented
// INTERPRETATION call (see the source file's own header comment), not a
// literal spec — exactly the kind of logic a silent regression in would
// be very easy to miss by eye but immediately obvious in a table like this.

function summary(overrides: Partial<OrderPaymentSummary> = {}): OrderPaymentSummary {
  return {
    totalAmountUsd: 300,
    paidAmountUsd: 0,
    remainingAmountUsd: 300,
    paymentStatus: "unpaid",
    hasInstallments: false,
    ...overrides,
  };
}

describe("computeOperationalBucket — rejected orders", () => {
  it("is always 'cancelled', regardless of payment summary or project status", () => {
    expect(computeOperationalBucket({ status: "rejected" }, summary(), null)).toBe("cancelled");
    expect(computeOperationalBucket({ status: "rejected" }, summary({ paymentStatus: "paid" }), "completed")).toBe(
      "cancelled",
    );
  });
});

describe("computeOperationalBucket — no linked project yet (pre-payment orders)", () => {
  it("'pending_review' -> new", () => {
    expect(computeOperationalBucket({ status: "pending_review" }, summary(), null)).toBe("new");
  });

  it("every other pre-payment status -> awaiting_payment", () => {
    for (const status of ["quotation_sent", "negotiating", "awaiting_payment", "payment_submitted"]) {
      expect(computeOperationalBucket({ status }, summary(), null)).toBe("awaiting_payment");
    }
  });

  it("'paid'/'converted' with no project row yet (edge case, trigger race) falls back to 'active', never throws", () => {
    expect(computeOperationalBucket({ status: "paid" }, summary({ paymentStatus: "paid" }), null)).toBe("active");
    expect(computeOperationalBucket({ status: "converted" }, summary({ paymentStatus: "paid" }), null)).toBe(
      "active",
    );
  });
});

describe("computeOperationalBucket — linked project exists", () => {
  it("project 'cancelled' -> cancelled, even though orders.status itself is not 'rejected'", () => {
    expect(computeOperationalBucket({ status: "converted" }, summary({ paymentStatus: "paid" }), "cancelled")).toBe(
      "cancelled",
    );
  });

  it("project 'completed' -> completed regardless of payment status", () => {
    expect(computeOperationalBucket({ status: "paid" }, summary({ paymentStatus: "partially_paid" }), "completed")).toBe(
      "completed",
    );
  });

  it("project 'ready_for_delivery' -> ready_for_delivery regardless of payment status", () => {
    expect(
      computeOperationalBucket({ status: "paid" }, summary({ paymentStatus: "partially_paid" }), "ready_for_delivery"),
    ).toBe("ready_for_delivery");
  });

  it("'new'/'approved'/'in_production'/'revision' project + partially_paid -> awaiting_final_payment (the 'utang teknis' state)", () => {
    for (const projectStatus of ["new", "approved", "in_production", "revision"]) {
      expect(
        computeOperationalBucket({ status: "paid" }, summary({ paymentStatus: "partially_paid" }), projectStatus),
      ).toBe("awaiting_final_payment");
    }
  });

  it("'new'/'approved'/'in_production'/'revision' project + fully paid -> active, not awaiting_final_payment", () => {
    for (const projectStatus of ["new", "approved", "in_production", "revision"]) {
      expect(computeOperationalBucket({ status: "paid" }, summary({ paymentStatus: "paid" }), projectStatus)).toBe(
        "active",
      );
    }
  });
});
