"use client";

import { Check } from "lucide-react";
import { cn } from "@nimia/ui";
import type { JourneyStep } from "../data";
import { FlowDiagram } from "./FlowDiagram";

// The single active-step card for the "product tour" redesign of Section 2
// (30 Juli 2026 — replaces the old show-all-7-steps-at-once grid). Only
// one of these is ever mounted at a time, swapped via AnimatePresence in
// JourneyTimeline.tsx. Every field that was on a step before (title,
// description, badge, flow, checklist, chips) is still rendered here in
// full — nothing was shortened, only the surrounding layout changed from
// "small card in a row of 7" to "one large centered hero card".
//
// `highlight` (true only for Step 4, "Negotiate the Price") switches to a
// tinted crimson/pink background and a larger icon/title so it visibly
// reads as the flagship step the moment autoplay reaches it — the "wow"
// beat of the tour.
export function JourneyStepCard({ step }: { step: JourneyStep }) {
  const Icon = step.icon;

  return (
    <div
      className={cn(
        "relative mx-auto max-w-2xl overflow-hidden rounded-3xl border px-6 py-10 text-center transition-colors sm:px-12 sm:py-14",
        step.highlight
          ? "border-[var(--nimia-pink)]/30 bg-gradient-to-b from-[var(--nimia-crimson)]/15 via-white/[0.04] to-white/[0.02] shadow-[0_35px_90px_-30px_rgba(193,18,77,0.55)]"
          : "border-white/10 bg-white/[0.03] shadow-[0_25px_70px_-35px_rgba(0,0,0,0.6)]",
      )}
    >
      {/* Ambient glow behind the icon, purely decorative */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-0 h-56 w-56 -translate-x-1/2 -translate-y-1/4 rounded-full bg-[var(--nimia-crimson)]/25 blur-[90px]"
      />

      {step.badge ? (
        <span className="relative mb-5 inline-flex items-center rounded-full border border-[var(--nimia-pink)]/30 bg-[var(--nimia-pink)]/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--nimia-pink)]">
          {step.badge}
        </span>
      ) : null}

      <div className="relative mx-auto flex items-center justify-center">
        <Icon
          className={cn(
            "relative text-[var(--nimia-pink)]",
            step.highlight ? "h-24 w-24" : "h-20 w-20",
          )}
          strokeWidth={1.1}
          aria-hidden="true"
        />
      </div>

      <p className="nimia-font-display relative mt-5 text-xs font-bold uppercase tracking-[0.3em] text-[var(--nimia-muted)]">
        Step {step.number}
      </p>

      <h3
        className={cn(
          "nimia-font-display relative mt-2 font-bold",
          step.highlight ? "text-3xl sm:text-4xl" : "text-2xl sm:text-3xl",
        )}
      >
        {step.title}
      </h3>

      <p className="relative mx-auto mt-4 max-w-lg text-[15px] leading-relaxed text-[var(--nimia-muted)] sm:text-base">
        {step.description}
      </p>

      {step.chips ? (
        <div className="relative mt-6 flex flex-wrap items-center justify-center gap-2">
          {step.chips.map((chip) => (
            <span
              key={chip}
              className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs font-medium text-[var(--foreground)]/80"
            >
              {chip}
            </span>
          ))}
        </div>
      ) : null}

      {step.flow ? (
        <div className="relative mx-auto mt-2 max-w-[15rem]">
          <FlowDiagram items={step.flow} size={step.highlight ? "lg" : "sm"} />
        </div>
      ) : null}

      {step.checklist ? (
        <div className="relative mx-auto mt-6 flex max-w-sm flex-col gap-2 rounded-xl border border-[var(--nimia-pink)]/20 bg-[var(--nimia-pink)]/[0.06] p-4 text-left">
          {step.checklist.map((line) => (
            <div key={line} className="flex items-center gap-2 text-sm font-medium text-[var(--foreground)]/90">
              <Check className="h-4 w-4 shrink-0 text-[var(--nimia-pink)]" aria-hidden="true" />
              {line}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
