"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@nimia/ui";
import type { StepId } from "../types";

export interface StepNavigationProps {
  step: StepId;
  canGoBack: boolean;
  canGoNext: boolean;
  isSubmitting?: boolean;
  onBack: () => void;
  onNext: () => void;
  onSubmit: () => void;
}

// Category/Service/Package steps auto-advance on selection (see
// useOrderWizard#selectCategory/selectService/selectPackage) and render no
// "Continue" button here — Configure/Brief/Upload need an explicit
// confirmation since they involve reading multiple fields, and Review ends
// in Submit instead of Continue.
export function StepNavigation({
  step,
  canGoBack,
  canGoNext,
  isSubmitting,
  onBack,
  onNext,
  onSubmit,
}: StepNavigationProps) {
  const showContinue = step === "configure" || step === "brief" || step === "upload";
  const showSubmit = step === "review";

  if (!showContinue && !showSubmit && !canGoBack) return null;

  return (
    <div className="flex items-center justify-between gap-3 border-t border-white/10 pt-5">
      {canGoBack ? (
        <Button type="button" variant="ghost" onClick={onBack} className="text-white/70 hover:text-white">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back
        </Button>
      ) : (
        <span />
      )}

      {showContinue ? (
        <Button type="button" onClick={onNext} disabled={!canGoNext}>
          Continue
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Button>
      ) : null}

      {showSubmit ? (
        <Button type="button" onClick={onSubmit} isLoading={isSubmitting} className="min-w-[10rem]">
          Submit Order
        </Button>
      ) : null}
    </div>
  );
}
