"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";
import { Check, Clock, RefreshCw } from "lucide-react";
import type { BundlePackage } from "../types/bundle";
import { OptionCard } from "./option-card";

export interface PackageDetailProps {
  pkg: BundlePackage | null;
  selectedOptionIds: string[];
  onToggleOption: (optionId: string) => void;
  onCustomOrder: () => void;
}

// Package/Bundle system (10 Agustus 2026, per user request) — the "Package
// Detail" step (BUNDLE_STEPS[1]): Name/Badge/Description/Price -> "What's
// Included" checklist -> "Choose Your Creative Content" slot selector ->
// Revisions -> Estimated Delivery, exactly the structure the brief asks
// for. The slot system's over-selection guard lives in two places by
// design: useOrderWizard#toggleBundleCreativeContent is the real one
// (state can never actually hold an invalid combination), and the
// `disabled` check below is the visible half of it — an option that would
// push the running total past pkg.creativeSlotCount is disabled before it
// can even be clicked, so a client never sees a click "fail" silently.
export function PackageDetail({ pkg, selectedOptionIds, onToggleOption, onCustomOrder }: PackageDetailProps) {
  const shouldReduceMotion = useReducedMotion();

  if (!pkg) return null;

  const usedSlots = selectedOptionIds.reduce((sum, id) => {
    const option = pkg.creativeOptions.find((candidate) => candidate.id === id);
    return sum + (option?.slots ?? 0);
  }, 0);
  const remainingSlots = pkg.creativeSlotCount - usedSlots;
  const isComplete = remainingSlots === 0;
  const showSlotCount = pkg.creativeSlotCount > 1;

  const container: Variants = {
    hidden: {},
    visible: { transition: { staggerChildren: shouldReduceMotion ? 0 : 0.06 } },
  };
  const item: Variants = {
    hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 14 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] } },
  };

  return (
    <div>
      {pkg.badge ? (
        <span className="mb-3 inline-flex w-fit items-center rounded-full border border-[var(--nimia-pink)]/30 bg-[var(--nimia-pink)]/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--nimia-pink)]">
          {pkg.badge}
        </span>
      ) : null}
      <h2 className="nimia-font-display text-2xl font-bold text-white sm:text-3xl">{pkg.name}</h2>
      <p className="mt-2 max-w-2xl text-white/55">{pkg.description}</p>
      <p className="nimia-gradient-text nimia-font-display mt-4 text-4xl font-bold">${pkg.price}</p>

      {/* What's Included */}
      <div className="mt-8">
        <h3 className="nimia-font-display text-lg font-bold text-white">What&apos;s Included</h3>
        <div className="mt-4 flex flex-col gap-3">
          {pkg.includedItems.map((included) => (
            <div key={included.label} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <div className="flex items-start gap-2.5">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--nimia-crimson)]/20">
                  <Check className="h-3 w-3 text-[var(--nimia-pink)]" strokeWidth={3} aria-hidden="true" />
                </span>
                <p className="text-sm font-semibold text-white">{included.label}</p>
              </div>
              {included.details && included.details.length > 0 ? (
                <ul className="ml-7 mt-2 grid grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-2">
                  {included.details.map((detail) => (
                    <li key={detail} className="text-xs text-white/50">
                      • {detail}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ))}
        </div>
      </div>

      {/* Choose Your Creative Content */}
      <div className="mt-8">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="nimia-font-display text-lg font-bold text-white">Choose Your Creative Content</h3>
          <span className="text-xs font-medium text-white/45">
            {pkg.creativeSlotLabel} · {usedSlots}/{pkg.creativeSlotCount} selected
          </span>
        </div>
        <p className="mt-1 text-sm text-white/55">
          {isComplete
            ? "You're all set — every creative content slot is filled."
            : `Please select ${remainingSlots} more creative content${remainingSlots > 1 ? "s" : ""} to continue.`}
        </p>

        <motion.div
          variants={container}
          initial="hidden"
          animate="visible"
          className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2"
        >
          {pkg.creativeOptions.map((option) => {
            const isSelected = selectedOptionIds.includes(option.id);
            const isDisabled = !isSelected && usedSlots + option.slots > pkg.creativeSlotCount;
            return (
              <motion.div key={option.id} variants={item}>
                <OptionCard
                  title={option.label}
                  description={showSlotCount ? `${option.slots} slot${option.slots > 1 ? "s" : ""}` : undefined}
                  selected={isSelected}
                  disabled={isDisabled}
                  onClick={() => onToggleOption(option.id)}
                  meta={
                    <span
                      className={
                        isSelected
                          ? "text-xs font-semibold text-[var(--nimia-pink)]"
                          : "text-xs font-medium text-white/40"
                      }
                    >
                      {isSelected ? "✓ Selected" : "Select"}
                    </span>
                  }
                />
              </motion.div>
            );
          })}
        </motion.div>

        <div className="mt-4 flex flex-col items-start gap-1.5 rounded-xl border border-white/10 bg-white/[0.02] p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-white/50">
            Need more content? Extra creative content beyond this package can be added as an add-on or
            through a Custom Order.
          </p>
          <button
            type="button"
            onClick={onCustomOrder}
            className="shrink-0 text-xs font-semibold text-[var(--nimia-pink)] transition-colors hover:text-white"
          >
            Custom Order →
          </button>
        </div>
      </div>

      {/* Revisions + Estimated Delivery */}
      <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/[0.06]">
            <RefreshCw className="h-4 w-4 text-white/60" aria-hidden="true" />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-white/40">Revisions</p>
            <p className="text-sm font-semibold text-white">{pkg.freeRevisions} Free Revisions</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/[0.06]">
            <Clock className="h-4 w-4 text-white/60" aria-hidden="true" />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-white/40">Estimated Delivery</p>
            <p className="text-sm font-semibold text-white">{pkg.estimatedDeliveryLabel}</p>
          </div>
        </div>
      </div>
      <p className="mt-2 text-xs text-white/35">
        Estimated delivery is a planning estimate, not a guaranteed date — your team will confirm exact
        timing after reviewing your project brief.
      </p>
    </div>
  );
}
