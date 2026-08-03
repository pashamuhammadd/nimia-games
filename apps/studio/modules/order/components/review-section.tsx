"use client";

import { Check, FileText } from "lucide-react";
import { cn } from "@nimia/ui";
import type { CategoryDefinition, ProjectBrief, ServiceDefinition, StepId, UploadedFileMeta, ConfigSelections } from "../types";
import type { Estimate } from "../pricing";
import { summarizeSelections } from "../pricing/summarize-selections";
import { SummaryCard } from "./summary-card";

export interface ReviewSectionProps {
  category: CategoryDefinition | null;
  service: ServiceDefinition | null;
  packageName: string | null;
  configSelections: ConfigSelections;
  brief: ProjectBrief;
  files: UploadedFileMeta[];
  estimate: Estimate;
  agreedToTerms: boolean;
  onAgreedToTermsChange: (agreed: boolean) => void;
  onEditStep: (step: StepId) => void;
  submitError: string | null;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// STEP 7 — the whole order recapped through SummaryCard, the same building
// block PriceEstimator uses, so Review and the sidebar never disagree about
// how a given section is labeled or formatted.
export function ReviewSection({
  category,
  service,
  packageName,
  configSelections,
  brief,
  files,
  estimate,
  agreedToTerms,
  onAgreedToTermsChange,
  onEditStep,
  submitError,
}: ReviewSectionProps) {
  if (!service) return null;

  const configRows = summarizeSelections(service, configSelections).map((row) => ({
    label: row.label,
    value: row.value,
  }));

  const briefRows = [
    { label: "Title", value: brief.projectTitle || "—" },
    { label: "Description", value: brief.projectDescription || "—" },
    { label: "Target Platform", value: brief.targetPlatform || "—" },
    { label: "Deadline", value: brief.deadline || "—" },
    { label: "Reference Link", value: brief.referenceLink || "—" },
    { label: "Additional Notes", value: brief.additionalNotes || "—" },
  ];

  return (
    <div>
      <h2 className="nimia-font-display text-2xl font-bold text-white sm:text-3xl">
        Review your order
      </h2>
      <p className="mt-2 text-white/55">Double-check everything before submitting.</p>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <SummaryCard
          title="Category & Service"
          onEdit={() => onEditStep("service")}
          rows={[
            { label: "Category", value: category?.name ?? "—" },
            { label: "Service", value: service.name },
            ...(packageName ? [{ label: "Package", value: packageName }] : []),
          ]}
        />
        <SummaryCard title="Configuration" onEdit={() => onEditStep("configure")} rows={configRows} />
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
        <SummaryCard
          title="Estimate"
          rows={[
            { label: "Estimated Price", value: `$${estimate.totalPrice}` },
            { label: "Estimated Delivery", value: `${estimate.totalDeliveryDays} Days` },
          ]}
          className="sm:col-span-2"
        />
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

      <button
        type="button"
        onClick={() => onAgreedToTermsChange(!agreedToTerms)}
        className="mt-7 flex w-full items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-left transition-colors hover:bg-white/[0.05]"
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
          I confirm the details above are correct and agree to Nimia Studio's project terms — a
          final quotation may be negotiated with the team before production begins.
        </span>
      </button>

      {submitError ? <p className="mt-3 text-sm text-red-400">{submitError}</p> : null}
    </div>
  );
}
