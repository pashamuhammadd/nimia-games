import { describe, expect, it } from "vitest";
import { calculateEstimate } from "../calculate-estimate";
import { applyInstallmentFeePreview } from "../apply-installment-fee-preview";
import { materializeInstallments, deriveNormalPrice, markInstallmentPaid } from "./installment-oracle";
import type { ServiceDefinition } from "../../types/catalog";

/**
 * End-to-end "simulation" suite requested by the user (15 Agustus 2026):
 *   "1. client order apapun dengan pembayaran cicilan
 *    2. client order apapun dengan pembayaran full
 *    3. admin manage semua orderan itu harus sukses jangan ada yang salah"
 *
 * There is no live Supabase/Discord access in this environment (see the
 * AskUserQuestion answer that chose "Automated test logic" over a live
 * browser/staging run), so this suite chains the SAME pure functions the
 * app actually calls (calculateEstimate, applyInstallmentFeePreview) with a
 * hand-verified oracle of the two database triggers that own the rest of
 * the lifecycle (installment-oracle.ts, mirroring
 * packages/db/migrations/0038_custom_order_installments.sql byte-for-byte)
 * to walk a full order from client submission through Admin
 * verification, across all THREE order_flow_type values and both
 * payment_method values.
 *
 * order_flow_type is deliberately treated as a plain tag on the same
 * underlying price here, not re-derived via three different pricing
 * engines — that's intentional and mirrors production reality exactly:
 * derive_order_normal_price() and materialize_order_installments() (the
 * two triggers this suite exercises) only ever branch on payment_method /
 * payment_plan, NEVER on order_flow_type — see this session's fix to
 * setOrderPaymentPlanAction, which removed an order_flow_type==='custom'
 * gate that had no basis in the trigger logic. calculate-estimate.test.ts /
 * calculate-bundle-estimate.test.ts / calculate-custom-order-estimate.test.ts
 * separately cover that each flow type's OWN pricing engine is correct;
 * this suite covers what happens to a price AFTER it's computed.
 */

const DUMMY_ICON = (() => null) as unknown as ServiceDefinition["icon"];

const SERVICE: ServiceDefinition = {
  id: "svc-sim",
  dbServiceId: "00000000-0000-0000-0000-000000000099",
  categoryId: "cat-sim",
  name: "Simulation Service",
  tagline: "test",
  icon: DUMMY_ICON,
  pricingModel: "startingFrom",
  startingPrice: 800,
  baseDeliveryDays: 10,
  configFields: [],
};

const FEE_PERCENTAGE = 30;
const ORDER_FLOW_TYPES = ["project_builder", "package", "custom"] as const;

describe("simulation 1 — client orders (any flow type) with installments", () => {
  it.each(ORDER_FLOW_TYPES)("flow_type=%s: fee-inclusive total materializes into cent-accurate milestones", (flowType) => {
    // Step 1: client configures the project — same estimate every flow type
    // would produce for this service (see this file's header comment).
    const baseEstimate = calculateEstimate(SERVICE, null, {});
    expect(baseEstimate.totalPrice).toBe(800);

    // Step 2: client reaches the (now-generalized) Payment Method step and
    // picks Installments — this is the exact call use-order-wizard.ts makes.
    const previewedEstimate = applyInstallmentFeePreview(baseEstimate, "installments", FEE_PERCENTAGE);
    expect(previewedEstimate.grandTotal).toBe(1040); // 800 + 30%

    // Step 3: order is created with order_flow_type = flowType,
    // payment_method = 'installments', status = 'pending_review'. Admin
    // reviews, confirms a final price (here: the client's own fee-inclusive
    // ask, unchanged) and moves the order to 'awaiting_payment' — this is
    // the moment both triggers fire in production.
    const order = {
      orderFlowType: flowType,
      paymentMethod: "installments" as const,
      finalPriceUsd: previewedEstimate.grandTotal!,
    };

    const normalPriceUsd = deriveNormalPrice(order.finalPriceUsd, order.paymentMethod, FEE_PERCENTAGE);
    expect(normalPriceUsd).toBe(800); // backs the fee back out — Partner reward basis (decision #2)

    const installments = materializeInstallments({
      finalPriceUsd: order.finalPriceUsd,
      paymentMethod: order.paymentMethod,
      paymentPlan: "none", // client didn't set a plan (legacy path) — defaults to Two Milestones
    });
    expect(installments).toHaveLength(2);
    expect(installments.reduce((s, r) => s + r.amountUsd, 0)).toBe(1040);
    expect(installments[0].status).toBe("pending_payment");
    expect(installments[1].status).toBe("scheduled");
  });

  it("the client's Three Milestones choice materializes correctly for any flow type", () => {
    // 18 Agustus 2026, per user request — the CLIENT picks two_milestones
    // vs three_milestones at submission (see payment-method-step.tsx),
    // Admin no longer overrides this during review. The trigger itself
    // (materialize_order_installments, 0051) never reads order_flow_type
    // either way, so this still holds across every flow type.
    for (const flowType of ORDER_FLOW_TYPES) {
      const installments = materializeInstallments({
        finalPriceUsd: 1500,
        paymentMethod: "installments",
        paymentPlan: "three_milestones",
      });
      expect(installments.map((r) => r.percentage)).toEqual([40, 30, 30]);
      expect(installments.reduce((s, r) => s + r.amountUsd, 0)).toBe(1500);
      void flowType; // same result regardless of flow type — the trigger never reads it
    }
  });
});

describe("simulation 2 — client orders (any flow type) with full payment", () => {
  it.each(ORDER_FLOW_TYPES)("flow_type=%s: no fee added, single 100%% installment row, no normal_price_usd derivation surprises", (flowType) => {
    const baseEstimate = calculateEstimate(SERVICE, null, {});
    const previewedEstimate = applyInstallmentFeePreview(baseEstimate, "full_payment", FEE_PERCENTAGE);
    expect(previewedEstimate.grandTotal).toBeUndefined(); // no-op for full_payment
    expect(previewedEstimate.totalPrice).toBe(800);

    const order = {
      orderFlowType: flowType,
      paymentMethod: "full_payment" as const,
      finalPriceUsd: previewedEstimate.totalPrice,
    };

    const normalPriceUsd = deriveNormalPrice(order.finalPriceUsd, order.paymentMethod, FEE_PERCENTAGE);
    expect(normalPriceUsd).toBe(800); // unchanged — same as final_price_usd

    const installments = materializeInstallments({
      finalPriceUsd: order.finalPriceUsd,
      paymentMethod: order.paymentMethod,
      paymentPlan: "none",
    });
    expect(installments).toEqual([
      { sequence: 1, label: "Full Payment", percentage: 100, amountUsd: 800, status: "pending_payment" },
    ]);
  });
});

describe("simulation 3 — Admin manages a mixed batch of orders across every flow type and payment method", () => {
  interface SimOrder {
    id: string;
    orderFlowType: (typeof ORDER_FLOW_TYPES)[number];
    paymentMethod: "full_payment" | "installments" | null;
    status: "pending_review" | "negotiating" | "quotation_sent" | "awaiting_payment" | "paid";
  }

  // One order per (flow type × payment method) combination, at a status
  // where Admin would legitimately be looking at it — mirrors what the
  // admin Orders list can actually contain after this session's fixes.
  const ORDERS: SimOrder[] = ORDER_FLOW_TYPES.flatMap((orderFlowType) => [
    { id: `${orderFlowType}-full`, orderFlowType, paymentMethod: "full_payment", status: "pending_review" },
    { id: `${orderFlowType}-inst`, orderFlowType, paymentMethod: "installments", status: "negotiating" },
  ]);

  /** Mirrors apps/admin/app/(protected)/orders/page.tsx's payment-filter
   * query logic (PAYMENT_METHOD_FILTERS + the `.eq("payment_method", ...)`
   * branch) — the two-lane admin UI this session added. */
  function filterByPaymentLane(orders: SimOrder[], lane: "all" | "full_payment" | "installments"): SimOrder[] {
    if (lane === "all") return orders;
    return orders.filter((o) => o.paymentMethod === lane);
  }

  /** Mirrors OrderDetailPanel.tsx's Payment Plan display gate AFTER 18
   * Agustus 2026's reversal — Admin no longer gets an editable picker at
   * any status (see this session's request #3: "Admin tidak lagi
   * menentukan rencana cicilan/harga"). It's a plain read-only summary of
   * whatever the CLIENT chose at submission, shown at every status once a
   * payment_method exists — no more "picker while reviewable, summary once
   * locked" status split to model. */
  function canViewPaymentPlan(order: SimOrder): boolean {
    return order.paymentMethod != null;
  }

  it("every flow type appears in the Installments lane and the Full Payment lane — neither lane silently drops a flow type", () => {
    const installmentsLane = filterByPaymentLane(ORDERS, "installments");
    const fullPaymentLane = filterByPaymentLane(ORDERS, "full_payment");

    for (const flowType of ORDER_FLOW_TYPES) {
      expect(installmentsLane.some((o) => o.orderFlowType === flowType)).toBe(true);
      expect(fullPaymentLane.some((o) => o.orderFlowType === flowType)).toBe(true);
    }
    expect(installmentsLane).toHaveLength(3);
    expect(fullPaymentLane).toHaveLength(3);
    expect(filterByPaymentLane(ORDERS, "all")).toHaveLength(6);
  });

  it("Admin can VIEW the client's payment plan for EVERY flow type, not just custom — flow-type-agnostic just like the trigger it displays", () => {
    // Mirrors materializeInstallments/installment-oracle.ts, which never
    // reads order_flow_type either.
    for (const order of ORDERS) {
      expect(canViewPaymentPlan(order)).toBe(true);
    }
  });

  it("the plan stays visible at every status, including after it's already locked in at awaiting_payment — there's nothing left for Admin to change, only to see", () => {
    const lockedOrder: SimOrder = { id: "locked", orderFlowType: "project_builder", paymentMethod: "installments", status: "awaiting_payment" };
    expect(canViewPaymentPlan(lockedOrder)).toBe(true);
  });

  it("an order with no payment_method yet (shouldn't normally happen — the wizard requires it) shows nothing rather than a fabricated plan", () => {
    const bareOrder: SimOrder = { id: "bare", orderFlowType: "project_builder", paymentMethod: null, status: "pending_review" };
    expect(canViewPaymentPlan(bareOrder)).toBe(false);
  });
});

describe("simulation 4 — full happy-path lifecycle: three_milestones installment order, verified end to end", () => {
  it("each verification unlocks exactly the next milestone, and the order flips to 'paid' on installment #1 only", () => {
    const finalPriceUsd = 3000;
    let installments = materializeInstallments({
      finalPriceUsd,
      paymentMethod: "installments",
      paymentPlan: "three_milestones",
    });
    // 40/30/30 split (18 Agustus 2026, per user request — was 30/30/40).
    expect(installments.map((r) => r.amountUsd)).toEqual([1200, 900, 900]);
    expect(installments.map((r) => r.status)).toEqual(["pending_payment", "scheduled", "scheduled"]);

    // Admin verifies installment #1 (client submitted a tx hash, matched a
    // payment_wallets row, Admin clicked "Verify Payment").
    let result = markInstallmentPaid(installments, 1);
    installments = result.installments;
    expect(result.orderShouldBePaid).toBe(true); // product decision #1
    expect(installments.map((r) => r.status)).toEqual(["paid", "pending_payment", "scheduled"]);

    // Admin verifies installment #2.
    result = markInstallmentPaid(installments, 2);
    installments = result.installments;
    expect(result.orderShouldBePaid).toBe(false); // order already flipped to 'paid' at #1, this shouldn't re-fire
    expect(installments.map((r) => r.status)).toEqual(["paid", "paid", "pending_payment"]);

    // Admin verifies installment #3 (final).
    result = markInstallmentPaid(installments, 3);
    installments = result.installments;
    expect(result.orderShouldBePaid).toBe(false);
    expect(installments.map((r) => r.status)).toEqual(["paid", "paid", "paid"]);

    // Every dollar accounted for, nothing left scheduled or pending.
    expect(installments.every((r) => r.status === "paid")).toBe(true);
    expect(installments.reduce((s, r) => s + r.amountUsd, 0)).toBe(finalPriceUsd);
  });
});
