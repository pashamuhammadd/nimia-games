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

// Category/Service/Package/Browse steps auto-advance on selection (see
// useOrderWizard#selectCategory/selectService/selectPackage/
// selectBundlePackage) and render no "Continue" button here —
// Configure/Package Detail/Brief/Upload need an explicit confirmation since
// they involve reading multiple fields or validating a selection (Package
// Detail added 10 Agustus 2026 — Package/Bundle system's slot-selection
// step, gated by useOrderWizard's canGoNext until every creative-content
// slot is filled), and Review ends in two buttons instead of Continue:
// Submit Order (accept the estimate as-is) and Negotiate Price (3 Agustus
// 2026, per user request — attaches the offer typed into ReviewSection's
// negotiation field instead). Custom Order Builder (12 Agustus 2026) adds
// three more explicit-Continue steps of its own: "custom-services" (needs
// at least one service picked), "custom-configure" (nothing to validate
// here beyond having selections, which the previous step already
// guarantees — still an explicit Continue since it's a multi-service page,
// not an auto-advancing single choice), and "custom-payment" (needs a
// payment method chosen — see useOrderWizard#canGoNext). "payment" (15
// Agustus 2026) is Project Builder/Package's own copy of that same
// Continue-gated step, added here alongside "custom-payment" — MUST stay
// in this list, not just in useOrderWizard#canGoNext's validation: without
// a matching entry here, a client who reached the Payment Method step on a
// Project Builder or Package order would see NO Continue button at all
// (showContinue/showSubmit/canGoBack all false on a step with canGoBack
// already true mid-wizard would still render the Back button, but never a
// way forward) and be stuck.
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
  const showContinue =
    step === "configure" ||
    step === "package-detail" ||
    step === "brief" ||
    step === "upload" ||
    step === "custom-services" ||
    step === "custom-configure" ||
    step === "custom-payment" ||
    step === "payment";
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
