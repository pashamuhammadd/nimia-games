"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";
import { CreditCard, Layers3 } from "lucide-react";
import type { CustomOrderEstimate } from "../pricing";
import type { CustomOrderPaymentMethod } from "../types";
import { OptionCard } from "./option-card";

export interface PaymentMethodStepProps {
  paymentMethod: CustomOrderPaymentMethod | null;
  onSelect: (method: CustomOrderPaymentMethod) => void;
  estimate: CustomOrderEstimate;
  installmentFeePercentage: number;
}

// Custom Order Builder Step 5 ("custom-payment", spec section 10) —
// deliberately placed right before Review, after every service/config
// decision, so the fee preview below reflects the client's REAL subtotal,
// never a placeholder number. Two cards, no default selection (spec: never
// silently default to one) — StepNavigation's Continue stays disabled until
// useOrderWizard#canGoNext sees a non-null customPaymentMethod.
//
// The number shown here is a PREVIEW only, computed from the
// admin-configurable installmentFeePercentage useOrderWizard already fetched
// (see get-installment-fee-action.ts) — submitCustomOrderAction re-reads the
// authoritative percentage and recomputes this exact same math server-side
// before ever writing a price, per spec section 6/27.
export function PaymentMethodStep({
  paymentMethod,
  onSelect,
  estimate,
  installmentFeePercentage,
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

  const installmentTotal = Math.round((estimate.subtotal * (1 + installmentFeePercentage / 100)) * 100) / 100;
  const installmentFeeAmount = Math.round((estimate.subtotal * installmentFeePercentage) / 100 * 100) / 100;
  const halfSplit = Math.round((installmentTotal / 2) * 100) / 100;

  return (
    <div>
      <h2 className="nimia-font-display text-2xl font-bold text-white sm:text-3xl">Choose how to pay</h2>
      <p className="mt-2 text-white/55">
        Pay the full estimate up front, or split it into milestones with a small flexibility fee.
      </p>

      <motion.div
        variants={container}
        initial="hidden"
        animate="visible"
        className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2"
      >
        <motion.div variants={item}>
          <OptionCard
            size="lg"
            title="Pay in Full"
            description="One payment, no extra fee."
            icon={CreditCard}
            selected={paymentMethod === "full_payment"}
            onClick={() => onSelect("full_payment")}
            className="min-h-[11rem]"
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

        <motion.div variants={item}>
          <OptionCard
            size="lg"
            title="Pay in Installments"
            description={`Split into milestones (+${installmentFeePercentage}% flexibility fee).`}
            icon={Layers3}
            selected={paymentMethod === "installments"}
            onClick={() => onSelect("installments")}
            className="min-h-[11rem]"
            meta={
              <div className="mt-3 border-t border-white/10 pt-3">
                <p className="nimia-gradient-text nimia-font-display text-3xl font-bold">
                  ${installmentTotal}
                </p>
                <p className="mt-1 text-xs text-white/45">
                  ${estimate.subtotal} + ${installmentFeeAmount} fee — e.g. two milestones of ${halfSplit} each
                </p>
              </div>
            }
          />
        </motion.div>
      </motion.div>

      <div className="mt-6 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-white/55">
        The exact milestone schedule (number of payments and their split) is confirmed by our team when they
        review your order — later milestones stay locked until earlier ones are paid.
      </div>
    </div>
  );
}
