"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronUp, Clock, Sparkles } from "lucide-react";
import type { Estimate } from "../pricing";
import type { CategoryDefinition, ServiceDefinition } from "../types";

export interface PriceEstimatorProps {
  category: CategoryDefinition | null;
  service: ServiceDefinition | null;
  packageName: string | null;
  estimate: Estimate;
  /** Package/Bundle system (10 Agustus 2026) — when set, the summary header
   * shows this in place of category/service (e.g. eyebrow "Package", title
   * "Web3 Growth") without touching the layout/estimate rendering below,
   * which is identical for both flows. Both null (the default) preserves
   * the exact original Project Builder behavior. */
  bundleLabel?: string | null;
  bundleTitle?: string | null;
}

// Live-updating order summary. Renders TWICE from the same props/estimate —
// once as a desktop sidebar (sticky, always fully expanded) and once as a
// mobile bottom sheet (collapsed to a single summary bar by default, tap to
// expand the breakdown) — so both surfaces always agree, there's no
// duplicated pricing logic between them, just two responsive presentations
// of the same `estimate` computed once in useOrderWizard.
export function PriceEstimator({
  category,
  service,
  packageName,
  estimate,
  bundleLabel = null,
  bundleTitle = null,
}: PriceEstimatorProps) {
  const [mobileExpanded, setMobileExpanded] = React.useState(false);

  if (!service && !bundleTitle) {
    return (
      <aside className="hidden lg:sticky lg:top-24 lg:block lg:h-fit lg:w-[22rem] lg:shrink-0">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center">
          <Sparkles className="mx-auto h-6 w-6 text-white/25" aria-hidden="true" />
          <p className="mt-3 text-sm text-white/45">
            Your project summary and estimated price will appear here as you configure.
          </p>
        </div>
      </aside>
    );
  }

  const deliveryDisplay =
    estimate.deliveryLabel ?? `${estimate.totalDeliveryDays} ${estimate.totalDeliveryDays === 1 ? "Day" : "Days"}`;

  const breakdown = (
    <>
      <div className="flex flex-col gap-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-white/40">
          {bundleTitle ? (bundleLabel ?? "Package") : category?.name}
        </p>
        <p className="nimia-font-display text-lg font-bold text-white">{bundleTitle ?? service?.name}</p>
        {packageName ? <p className="text-sm text-white/55">{packageName}</p> : null}
      </div>

      {estimate.lineItems.length > 0 ? (
        <div className="flex flex-col gap-1.5 border-t border-white/10 pt-3.5">
          {estimate.lineItems.map((item) => (
            <div key={item.fieldId} className="flex items-center justify-between gap-3 text-sm">
              <span className="text-white/55">{item.valueLabel}</span>
              <span className="font-medium text-[var(--nimia-pink)]">
                +${item.priceDelta}
              </span>
            </div>
          ))}
        </div>
      ) : null}

      <div className="flex flex-col gap-2.5 border-t border-white/10 pt-3.5">
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-white/55">Estimated Price</span>
          <span className="nimia-gradient-text nimia-font-display text-3xl font-bold">
            ${estimate.totalPrice}
          </span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-1.5 text-white/55">
            <Clock className="h-3.5 w-3.5" aria-hidden="true" />
            Estimated Delivery
          </span>
          <span className="font-semibold text-white">{deliveryDisplay}</span>
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
            Project Summary
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
                Estimated Price
              </p>
              <p className="nimia-gradient-text nimia-font-display text-xl font-bold">
                ${estimate.totalPrice}
              </p>
            </div>
            <span className="h-8 w-px bg-white/10" aria-hidden="true" />
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-white/40">
                Delivery
              </p>
              <p className="text-sm font-semibold text-white">{deliveryDisplay}</p>
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
              <div className="flex flex-col gap-4 border-t border-white/10 px-4 pb-5 pt-4">
                {breakdown}
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </>
  );
}
