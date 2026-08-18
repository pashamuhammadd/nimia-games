"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";
import { CreditCard, Layers3 } from "lucide-react";
import type { CustomOrderPaymentMethod, CustomOrderInstallmentPlan } from "../types";
import type { InstallmentFeePercentages } from "../state/get-installment-fee-action";
import { INSTALLMENT_PLANS, INSTALLMENT_PLAN_ORDER, splitAmountForPlan } from "../pricing/installment-plans";
import { OptionCard } from "./option-card";

export interface PaymentMethodStepProps {
  paymentMethod: CustomOrderPaymentMethod | null;
  /** 18 Agustus 2026, per user request — the client now picks the
   * installment PLAN (2 vs 3) themselves, in this same step, instead of
   * Admin picking it during review (see ../types/custom-order.ts's
   * CustomOrderInstallmentPlan for the full context). Null whenever
   * paymentMethod isn't "installments". */
  installmentPlan: CustomOrderInstallmentPlan | null;
  /** Replaces the old separate `onSelect` — a single card click now
   * always carries both the method AND (for the two installment cards)
   * the plan, so there is no intermediate state where "installments" is
   * chosen but which plan isn't. */
  onChoose: (method: CustomOrderPaymentMethod, plan: CustomOrderInstallmentPlan | null) => void;
  /** Narrowed from `CustomOrderEstimate` to just what this component
   * actually reads (15 Agustus 2026, generalized to Project Builder/Package
   * — see order-wizard.tsx's callers). Custom Order still passes its full
   * `CustomOrderEstimate` here (structurally compatible, has `.subtotal`
   * too); Project Builder/Package pass a plain `{ subtotal: estimate.totalPrice }`
   * literal instead of force-fitting the multi-service `CustomOrderEstimate`
   * shape onto a single-service/fixed-price order that has no service lines
   * to speak of. */
  estimate: { subtotal: number };
  /** 18 Agustus 2026 — both tiered fees (see
   * ../state/get-installment-fee-action.ts), replacing the old single flat
   * `installmentFeePercentage`. 3 installments always costs more than 2 —
   * see packages/db/migrations/0051_tiered_installment_plans.sql's
   * `installment_settings_three_gte_two` constraint. */
  installmentFeePercentages: InstallmentFeePercentages;
}

// Payment Method step (originally Custom Order Builder-only, spec section
// 10; generalized 15 Agustus 2026 to Project Builder's "payment" step and
// Package's "payment" step too). Rewritten 18 Agustus 2026 (per user
// request) from a two-card Full Payment / Installments layout into three
// cards — Full Payment / 2 Installments / 3 Installments — so the client
// picks the exact milestone plan themselves, right here, with a real
// (not "e.g.") breakdown of what each milestone costs. This REVERSES the
// 12 Agustus 2026 product decision that Admin picked the plan during
// review (see ../types/custom-order.ts's CustomOrderInstallmentPlan for
// the full history) — Admin's role on the payment side is now limited to
// verifying a submitted payment, never deciding the plan or its price.
//
// The numbers shown here are a PREVIEW only, computed from the
// admin-configurable installmentFeePercentages useOrderWizard already
// fetched (see get-installment-fee-action.ts) — submitCustomOrderAction/
// submitOrderAction both re-read the authoritative percentages and
// recompute this exact same math server-side before ever writing a price,
// per this codebase's standing "server must recalculate, never trust the
// client" rule.
export function PaymentMethodStep({
  paymentMethod,
  installmentPlan,
  onChoose,
  estimate,
  installmentFeePercentages,
}: PaymentMethodStepProps) {
  const shouldReduceMotion = useReducedMotion();

  const container: Variants = {
    hidden: {},
    visible: { transition: { staggerChildren: shouldReduceMotion ? 0 : 0.08 } },
  };
  const item: Variants = {
    hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 16 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } },
  };

  const feeFor = (planId: CustomOrderInstallmentPlan) =>
    planId === "three_milestones" ? installmentFeePercentages.threeMilestones : installmentFeePercentages.twoMilestones;

  return (
    <div>
      <h2 className="nimia-font-display text-2xl font-bold text-white sm:text-3xl">Choose how to pay</h2>
      <p className="mt-2 text-white/55">
        Pay the full estimate up front, or split it into 2 or 3 milestones — you pick the exact schedule.
      </p>

      <motion.div
        variants={container}
        initial="hidden"
        animate="visible"
        className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3"
      >
        <motion.div variants={item}>
          <OptionCard
            size="lg"
            title="Pay in Full"
            description="One payment, no extra fee."
            icon={CreditCard}
            selected={paymentMethod === "full_payment"}
            onClick={() => onChoose("full_payment", null)}
            className="min-h-[12rem]"
            meta={
              <div className="mt-3 border-t border-white/10 pt-3">
                <p className="nimia-gradient-text nimia-font-display text-3xl font-bold">
                  ${estimate.subtotal}
                </p>
                <p className="mt-1 text-xs text-white/45">Charged once your order is confirmed</p>
              </div>
            }
          />
        </motion.div>

        {INSTALLMENT_PLAN_ORDER.map((planId) => {
          const plan = INSTALLMENT_PLANS[planId];
          const feePercentage = feeFor(planId);
          const installmentTotal = Math.round(estimate.subtotal * (1 + feePercentage / 100) * 100) / 100;
          const milestoneAmounts = splitAmountForPlan(planId, installmentTotal);

          return (
            <motion.div key={planId} variants={item}>
              <OptionCard
                size="lg"
                title={plan.label}
                description={`${plan.splitLabel} (+${feePercentage}% flexibility fee).`}
                icon={Layers3}
                selected={paymentMethod === "installments" && installmentPlan === planId}
                onClick={() => onChoose("installments", planId)}
                className="min-h-[12rem]"
                meta={
                  <div className="mt-3 border-t border-white/10 pt-3">
                    <p className="nimia-gradient-text nimia-font-display text-3xl font-bold">
                      ${installmentTotal}
                    </p>
                    <p className="mt-1 text-xs text-white/45">
                      {plan.milestoneLabels
                        .map((label, index) => `$${milestoneAmounts[index]} — ${label}`)
                        .join(" · ")}
                    </p>
                  </div>
                }
              />
            </motion.div>
          );
        })}
      </motion.div>

      <div className="mt-6 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-white/55">
        Your chosen schedule is locked in the moment you submit — no further decision needed from our team.
        Later milestones stay locked until earlier ones are paid.
      </div>
    </div>
  );
}
