"use client";

import { Check, FileText } from "lucide-react";
import { cn } from "@nimia/ui";
import type { CustomOrderEstimate } from "../pricing";
import type { CustomServiceSelection, CustomOrderPaymentMethod, ProjectBrief, StepId, UploadedFileMeta } from "../types";
import { SummaryCard } from "./summary-card";

// Same fallback pattern as review-section.tsx (the Terms of Service page
// only exists on apps/www, not here).
const WWW_URL = process.env.NEXT_PUBLIC_WWW_URL ?? "https://nimiagames.com";

export interface CustomOrderReviewSectionProps {
  selections: CustomServiceSelection[];
  paymentMethod: CustomOrderPaymentMethod | null;
  estimate: CustomOrderEstimate;
  brief: ProjectBrief;
  files: UploadedFileMeta[];
  agreedToTerms: boolean;
  onAgreedToTermsChange: (agreed: boolean) => void;
  onEditStep: (step: StepId) => void;
  submitError: string | null;
  negotiationOffer: string;
  onNegotiationOfferChange: (value: string) => void;
  /** Animation Validation (16 Agustus 2026, Fase 5) — see
   * review-section.tsx's identical props for the meaning of both. */
  isAnimationOrder?: boolean;
  characterReferenceFiles?: UploadedFileMeta[];
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Custom Order Builder's own Review step — a dedicated component rather
// than more prop-surgery on review-section.tsx (which already branches once
// for `bundle`; a second, structurally different branch for N services +
// a payment method would make that file harder to reason about for every
// existing caller). Reuses the exact same SummaryCard building block and the
// exact same negotiation-offer/agree-to-terms UI/copy as review-section.tsx
// so the three order types never visually disagree about what those two
// pieces look like — only the content above them differs.
export function CustomOrderReviewSection({
  selections,
  paymentMethod,
  estimate,
  brief,
  files,
  agreedToTerms,
  onAgreedToTermsChange,
  onEditStep,
  submitError,
  negotiationOffer,
  onNegotiationOfferChange,
  isAnimationOrder = false,
  characterReferenceFiles = [],
}: CustomOrderReviewSectionProps) {
  if (selections.length === 0) return null;

  const serviceCardRows = estimate.serviceLines.map((line) => ({
    label: `${line.categoryName}: ${line.serviceName}${line.packageLabel ? ` (${line.packageLabel})` : ""}`,
    value: `$${line.lineTotal}`,
  }));

  const briefRows = [
    { label: "Title", value: brief.projectTitle || "-" },
    { label: "Description", value: brief.projectDescription || "-" },
    { label: "Target Platform", value: brief.targetPlatform || "-" },
    { label: "Deadline", value: brief.deadline || "-" },
    // Animation Validation (16 Agustus 2026, Fase 5) — see
    // review-section.tsx's identical branch.
    ...(isAnimationOrder ? [{ label: "Script / Story", value: brief.script || "-" }] : []),
    { label: "Reference Link", value: brief.referenceLink || "-" },
    { label: "Additional Notes", value: brief.additionalNotes || "-" },
  ];

  const estimateRows = [
    { label: "Subtotal", value: `$${estimate.subtotal}` },
    ...(paymentMethod === "installments"
      ? [{ label: `Installment Fee (${estimate.installmentFeePercentage}%)`, value: `$${estimate.installmentFeeAmount}` }]
      : []),
    { label: "Estimated Total", value: `$${estimate.total}` },
    { label: "Estimated Delivery", value: `${estimate.totalDeliveryDays} Days` },
    {
      label: "Payment Method",
      value: paymentMethod === "installments" ? "Installments" : paymentMethod === "full_payment" ? "Full Payment" : "-",
    },
  ];

  return (
    <div>
      <h2 className="nimia-font-display text-2xl font-bold text-white sm:text-3xl">
        Review your order
      </h2>
      <p className="mt-2 text-white/55">Double-check everything before submitting.</p>

      <div className="mt-8 flex flex-col gap-4">
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-white/40">
              Services ({selections.length})
            </p>
            <button
              type="button"
              onClick={() => onEditStep("custom-services")}
              className="text-xs font-semibold text-[var(--nimia-pink)] hover:underline"
            >
              Edit
            </button>
          </div>
          <dl className="mt-2.5 flex flex-col gap-1.5">
            {serviceCardRows.map((row, index) => (
              <div key={index} className="flex items-start justify-between gap-3 text-sm">
                <dt className="text-white/55">{row.label}</dt>
                <dd className="text-right font-medium text-white">{row.value}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <SummaryCard title="Project Brief" onEdit={() => onEditStep("brief")} rows={briefRows} />
          <SummaryCard
            title="Files"
            onEdit={() => onEditStep("upload")}
            rows={
              files.length > 0
                ? files.map((file) => ({ label: file.name, value: formatBytes(file.size) }))
                : [{ label: "Attachments", value: "None" }]
            }
          />
          {/* Animation Validation (16 Agustus 2026, Fase 5) — see
              review-section.tsx's identical branch. */}
          {isAnimationOrder ? (
            <SummaryCard
              title="Character Reference Images"
              onEdit={() => onEditStep("upload")}
              rows={
                characterReferenceFiles.length > 0
                  ? characterReferenceFiles.map((file) => ({ label: file.name, value: formatBytes(file.size) }))
                  : [{ label: "Character Reference Images", value: "None — required" }]
              }
            />
          ) : null}
          <SummaryCard
            title="Estimate & Payment"
            onEdit={() => onEditStep("custom-payment")}
            rows={estimateRows}
            className="sm:col-span-2"
          />
        </div>
      </div>

      {files.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {files.map((file) => (
            <span
              key={file.id}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-white/60"
            >
              <FileText className="h-3 w-3" aria-hidden="true" />
              {file.name}
            </span>
          ))}
        </div>
      ) : null}

      <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-4">
        <label htmlFor="negotiation-offer" className="text-sm font-semibold text-white">
          Not the right price? Propose your own
        </label>
        <p className="mt-1 text-sm text-white/50">
          Enter what you&apos;d like to pay instead of the estimate above, then use the
          &quot;Negotiate Price&quot; button below. Our team will review it and either approve it or
          send a counter offer.
        </p>
        <div className="mt-3 flex max-w-xs items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2">
          <span className="text-sm font-semibold text-white/50">$</span>
          <input
            id="negotiation-offer"
            type="number"
            min={1}
            inputMode="decimal"
            placeholder={`e.g. ${estimate.total}`}
            value={negotiationOffer}
            onChange={(event) => onNegotiationOfferChange(event.target.value)}
            className="w-full bg-transparent text-sm text-white placeholder:text-white/30 focus:outline-none"
          />
        </div>
      </div>

      <div
        role="checkbox"
        aria-checked={agreedToTerms}
        aria-label="I confirm the details above are correct and agree to Nimia Studio's project terms"
        tabIndex={0}
        onClick={() => onAgreedToTermsChange(!agreedToTerms)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onAgreedToTermsChange(!agreedToTerms);
          }
        }}
        className="mt-7 flex w-full cursor-pointer items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-left transition-colors hover:bg-white/[0.05]"
      >
        <span
          className={cn(
            "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border",
            agreedToTerms ? "border-[var(--nimia-crimson)] bg-[var(--nimia-crimson)]" : "border-white/20",
          )}
        >
          {agreedToTerms ? <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} aria-hidden="true" /> : null}
        </span>
        <span className="text-sm text-white/70">
          I confirm the details above are correct and agree to Nimia Studio&apos;s{" "}
          <a
            href={`${WWW_URL}/terms`}
            target="_blank"
            rel="noreferrer"
            onClick={(event) => event.stopPropagation()}
            className="font-medium text-white underline decoration-white/30 underline-offset-2 hover:text-[var(--nimia-pink)]"
          >
            project terms
          </a>
          . A final quotation may be negotiated with the team before production begins.
        </span>
      </div>

      {submitError ? <p className="mt-3 text-sm text-red-400">{submitError}</p> : null}
    </div>
  );
}
