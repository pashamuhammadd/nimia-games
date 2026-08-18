import type { CustomOrderInstallmentPlan } from "../types/custom-order";

/**
 * Single source of truth for the two standard installment plans a client
 * can pick in the wizard (18 Agustus 2026, per user request — reverses
 * 0038's original product decision that Admin picked the milestone
 * schedule during review; see ../types/custom-order.ts's
 * CustomOrderInstallmentPlan and payment-method-step.tsx's own comment
 * for the full context).
 *
 * IMPORTANT — keep this in lockstep BY HAND with
 * materialize_order_installments() in packages/db/migrations/
 * 0051_tiered_installment_plans.sql. Same caveat every other client-side
 * mirror of a SQL trigger body in this codebase already documents (see
 * pricing/__tests__/installment-oracle.ts's own header) — no codegen link
 * between the two, the SQL trigger is what actually runs and is the only
 * thing any money-critical write ever trusts. This file exists purely so
 * the wizard can show the client an exact, real preview (not a vague "our
 * team will decide") before they ever submit anything.
 *
 * 'custom' (Admin's own bespoke override for large projects, unchanged
 * from 0038's product decision #4) deliberately has NO entry here — it's
 * never a client-facing choice, only ever set by Admin directly for the
 * rare project that needs a schedule outside these two.
 */
export interface InstallmentPlanDefinition {
  id: CustomOrderInstallmentPlan;
  /** Short label for cards/buttons, e.g. "2 Installments". */
  label: string;
  /** One sentence describing the split, shown under the label. */
  splitLabel: string;
  /** Percentage of the grand total each milestone asks for, in order.
   * Always sums to 100. Mirrors materialize_order_installments()'s
   * `v_pct` array for this plan exactly. */
  splitPercentages: number[];
  /** Mirrors materialize_order_installments()'s `v_labels` array for this
   * plan exactly — the same text order_installments.label ends up with. */
  milestoneLabels: string[];
}

export const INSTALLMENT_PLANS: Record<CustomOrderInstallmentPlan, InstallmentPlanDefinition> = {
  two_milestones: {
    id: "two_milestones",
    label: "2 Installments",
    splitLabel: "60% now, 40% before final delivery",
    splitPercentages: [60, 40],
    milestoneLabels: ["Project Start", "Before Final Delivery"],
  },
  three_milestones: {
    id: "three_milestones",
    label: "3 Installments",
    splitLabel: "40% now, 30% at milestone, 30% at final delivery",
    splitPercentages: [40, 30, 30],
    milestoneLabels: ["Project Start", "Project Milestone", "Final Delivery"],
  },
};

/** Ordered list, cheapest-to-most-flexible — the order the Payment Method
 * step's cards render in, right after "Pay in Full". */
export const INSTALLMENT_PLAN_ORDER: CustomOrderInstallmentPlan[] = ["two_milestones", "three_milestones"];

/** Splits `total` into this plan's milestone amounts, cent-accurately —
 * the last milestone absorbs the rounding remainder, exactly mirroring
 * materialize_order_installments()'s own loop (0051). Used only for
 * PREVIEW display before submission (Payment Method step, Review step);
 * the real, authoritative amounts are always whatever the SQL trigger
 * actually writes to order_installments once Admin confirms a price. */
export function splitAmountForPlan(planId: CustomOrderInstallmentPlan, total: number): number[] {
  const plan = INSTALLMENT_PLANS[planId];
  const amounts: number[] = [];
  let running = 0;
  plan.splitPercentages.forEach((pct, index) => {
    if (index < plan.splitPercentages.length - 1) {
      const amount = Math.round(((total * pct) / 100) * 100) / 100;
      amounts.push(amount);
      running += amount;
    } else {
      amounts.push(Math.round((total - running) * 100) / 100);
    }
  });
  return amounts;
}
