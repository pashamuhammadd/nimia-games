"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronUp, Clock, Sparkles } from "lucide-react";
import type { CustomOrderEstimate } from "../pricing";
import type { CustomOrderPaymentMethod } from "../types";

export interface CustomOrderPriceEstimatorProps {
  estimate: CustomOrderEstimate;
  paymentMethod: CustomOrderPaymentMethod | null;
}

// Custom Order Builder's own PriceEstimator — same "renders twice, desktop
// sticky sidebar + mobile bottom sheet" shape as price-estimator.tsx, kept
// as its own component rather than another optional prop on that one since
// the breakdown itself is structurally different here: N service lines
// instead of N config-field line items off a single base price, plus an
// optional installment fee row. Both components stay simple to read on
// their own rather than one file branching on orderType internally.
export function CustomOrderPriceEstimator({ estimate, paymentMethod }: CustomOrderPriceEstimatorProps) {
  const [mobileExpanded, setMobileExpanded] = React.useState(false);

  if (estimate.serviceLines.length === 0) {
    return (
      <aside className="hidden lg:sticky lg:top-24 lg:block lg:h-fit lg:w-[22rem] lg:shrink-0">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center">
          <Sparkles className="mx-auto h-6 w-6 text-white/25" aria-hidden="true" />
          <p className="mt-3 text-sm text-white/45">
            Add services to start building your project summary and estimated price.
          </p>
        </div>
      </aside>
    );
  }

  const breakdown = (
    <>
      <div className="flex flex-col gap-1.5 border-b border-white/10 pb-3.5">
        {estimate.serviceLines.map((line) => (
          <div key={line.selectionId} className="flex items-start justify-between gap-3 text-sm">
            <span className="text-white/55">
              {line.serviceName}
              {line.packageLabel ? ` (${line.packageLabel})` : ""}
            </span>
            <span className="shrink-0 font-medium text-white">${line.lineTotal}</span>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-sm">
          <span className="text-white/55">Subtotal</span>
          <span className="font-medium text-white">${estimate.subtotal}</span>
        </div>
        {paymentMethod === "installments" ? (
          <div className="flex items-center justify-between text-sm">
            <span className="text-white/55">Installment Fee ({estimate.installmentFeePercentage}%)</span>
            <span className="font-medium text-[var(--nimia-pink)]">+${estimate.installmentFeeAmount}</span>
          </div>
        ) : null}
      </div>

      <div className="flex flex-col gap-2.5 border-t border-white/10 pt-3.5">
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-white/55">Estimated Total</span>
          <span className="nimia-gradient-text nimia-font-display text-3xl font-bold">${estimate.total}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-1.5 text-white/55">
            <Clock className="h-3.5 w-3.5" aria-hidden="true" />
            Estimated Delivery
          </span>
          <span className="font-semibold text-white">
            {estimate.totalDeliveryDays} {estimate.totalDeliveryDays === 1 ? "Day" : "Days"}
          </span>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop: sticky sidebar, always expanded */}
      <aside className="hidden lg:sticky lg:top-24 lg:block lg:h-fit lg:w-[22rem] lg:shrink-0">
        <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-6 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.7)]">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--nimia-pink)]">
            Custom Order Summary
          </p>
          {breakdown}
        </div>
      </aside>

      {/* Mobile: fixed bottom sheet, collapsed by default */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-[var(--background)]/95 backdrop-blur lg:hidden">
        <button
          type="button"
          onClick={() => setMobileExpanded((v) => !v)}
          className="flex w-full items-center justify-between gap-3 px-4 py-3"
          aria-expanded={mobileExpanded}
        >
          <div className="flex items-center gap-3 text-left">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-white/40">
                Estimated Total
              </p>
              <p className="nimia-gradient-text nimia-font-display text-xl font-bold">${estimate.total}</p>
            </div>
            <span className="h-8 w-px bg-white/10" aria-hidden="true" />
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-white/40">Delivery</p>
              <p className="text-sm font-semibold text-white">{estimate.totalDeliveryDays} Days</p>
            </div>
          </div>
          <ChevronUp
            className={`h-5 w-5 shrink-0 text-white/50 transition-transform duration-200 ${mobileExpanded ? "rotate-180" : ""}`}
            aria-hidden="true"
          />
        </button>

        <AnimatePresence>
          {mobileExpanded ? (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="overflow-hidden"
            >
              <div className="flex flex-col gap-4 border-t border-white/10 px-4 pb-5 pt-4">{breakdown}</div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </>
  );
}
