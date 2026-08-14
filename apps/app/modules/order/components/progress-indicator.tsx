"use client";

import { Check } from "lucide-react";
import { cn } from "@nimia/ui";
import type { StepId } from "../types";
import { STEP_META } from "../state/steps";

export interface ProgressIndicatorProps {
  steps: StepId[];
  currentStepIndex: number;
  maxStepIndexReached: number;
  onSelectStep: (step: StepId) => void;
}

// A compact, always-visible rail of the steps ahead — deliberately not a
// classic numbered-form "Step 3 of 7" text label, which would read more
// like Google Forms than a product configurator. Clicking any circle up to
// the furthest one reached jumps back there (see useOrderWizard#goToStep);
// steps not yet reached are inert.
export function ProgressIndicator({
  steps,
  currentStepIndex,
  maxStepIndexReached,
  onSelectStep,
}: ProgressIndicatorProps) {
  return (
    <nav aria-label="Order progress" className="w-full overflow-x-auto nimia-no-scrollbar">
      <ol className="flex min-w-max items-center gap-1.5 sm:gap-2">
        {steps.map((step, index) => {
          const meta = STEP_META[step];
          const isCompleted = index < currentStepIndex;
          const isCurrent = index === currentStepIndex;
          const isReachable = index <= maxStepIndexReached;
          const Icon = meta.icon;

          return (
            <li key={step} className="flex items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                disabled={!isReachable}
                onClick={() => onSelectStep(step)}
                aria-current={isCurrent ? "step" : undefined}
                className={cn(
                  "flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors sm:text-sm",
                  isCurrent
                    ? "border-[var(--nimia-crimson)] bg-[var(--nimia-crimson)]/15 text-white"
                    : isCompleted
                      ? "border-white/15 bg-white/[0.05] text-white/70 hover:bg-white/[0.09]"
                      : "border-white/10 text-white/30",
                  isReachable && !isCurrent && "cursor-pointer",
                  !isReachable && "cursor-not-allowed",
                )}
              >
                <span
                  className={cn(
                    "flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
                    isCurrent || isCompleted ? "bg-[var(--nimia-crimson)] text-white" : "bg-white/10 text-white/40",
                  )}
                >
                  {isCompleted ? (
                    <Check className="h-3 w-3" strokeWidth={3} aria-hidden="true" />
                  ) : (
                    <Icon className="h-3 w-3" strokeWidth={2.25} aria-hidden="true" />
                  )}
                </span>
                <span className="hidden sm:inline">{meta.shortLabel}</span>
              </button>
              {index < steps.length - 1 ? (
                <span
                  aria-hidden="true"
                  className={cn("h-px w-4 shrink-0 sm:w-6", isCompleted ? "bg-[var(--nimia-crimson)]/60" : "bg-white/10")}
                />
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
