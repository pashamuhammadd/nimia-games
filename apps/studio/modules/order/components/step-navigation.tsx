"use client";

import { ArrowLeft, ArrowRight, Handshake } from "lucide-react";
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
  onNegotiate: () => void;
}

// Category/Service/Package steps auto-advance on selection (see
// useOrderWizard#selectCategory/selectService/selectPackage) and render no
// "Continue" button here — Configure/Brief/Upload need an explicit
// confirmation since they involve reading multiple fields, and Review ends
// in two buttons instead of Continue: Submit Order (accept the estimate
// as-is) and Negotiate Price (3 Agustus 2026, per user request — attaches
// the offer typed into ReviewSection's negotiation field instead).
export function StepNavigation({
  step,
  canGoBack,
  canGoNext,
  isSubmitting,
  onBack,
  onNext,
  onSubmit,
  onNegotiate,
}: StepNavigationProps) {
  const showContinue = step === "configure" || step === "brief" || step === "upload";
  const showSubmit = step === "review";

  if (!showContinue && !showSubmit && !canGoBack) return null;

  return (
    <div className="flex flex-col-reverse items-stretch justify-between gap-4 border-t border-white/10 pt-5 sm:flex-row sm:items-center">
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
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button
            type="button"
            variant="outline"
            onClick={onNegotiate}
            disabled={isSubmitting}
            className="gap-2 border-white/15 text-white/80 hover:border-[var(--nimia-crimson)]/50 hover:bg-white/[0.04] hover:text-white"
          >
            <Handshake className="h-4 w-4" aria-hidden="true" />
            Negotiate Price
          </Button>
          <Button type="button" onClick={onSubmit} isLoading={isSubmitting} className="min-w-[10rem]">
            Submit Order
          </Button>
        </div>
      ) : null}
    </div>
  );
}
