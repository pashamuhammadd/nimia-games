import { cn } from "@nimia/ui";
import type { StructuredProjectData } from "../types";
import { structuredDataRows } from "../lib/structured-data-fields";
import { BriefSummaryBlock } from "./BriefSummaryBlock";

export interface UnderstandingPreviewCardProps {
  understanding: StructuredProjectData;
  onConfirm: () => void;
  onWantToChange: () => void;
  loading?: boolean;
}

// Understanding Preview (brief §12) — rendered inline in the conversation
// once the API signals readyToConfirm. Confirming is a deterministic
// client action (see CreativeAgentSection's onConfirm), never something
// the model decides on its own.
export function UnderstandingPreviewCard({
  understanding,
  onConfirm,
  onWantToChange,
  loading,
}: UnderstandingPreviewCardProps) {
  const rows = structuredDataRows(understanding);

  return (
    <div className="nimia-message-in ml-10 rounded-2xl border border-[var(--nimia-gold-soft)] bg-[var(--nimia-surface)] p-5 sm:p-6">
      <p className="nimia-font-display text-base font-semibold text-[var(--nimia-gold)]">
        Here&rsquo;s what I understand about your project
      </p>

      <div className="mt-4">
        <BriefSummaryBlock understanding={understanding} />
      </div>

      <dl className="mt-4 space-y-3">
        {rows.map((row) => (
          <div key={row.label} className="grid grid-cols-3 gap-3 text-sm sm:grid-cols-4">
            <dt className="col-span-1 text-[var(--nimia-muted)]">{row.label}</dt>
            <dd className="col-span-2 text-[var(--foreground)] sm:col-span-3">{row.value}</dd>
          </div>
        ))}
      </dl>

      <p className="mt-5 text-sm text-[var(--nimia-muted)]">Is this what you had in mind?</p>

      <div className="mt-3 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onConfirm}
          disabled={loading}
          className={cn(
            "rounded-full bg-[var(--nimia-gold)] px-5 py-2 text-sm font-semibold text-[#1a0f14] transition-transform duration-200 ease-out hover:scale-[1.03] disabled:pointer-events-none disabled:opacity-60",
          )}
        >
          Yes, create my brief
        </button>
        <button
          type="button"
          onClick={onWantToChange}
          disabled={loading}
          className="rounded-full border border-[var(--nimia-border)] px-5 py-2 text-sm font-medium text-[var(--foreground)] transition-colors duration-200 hover:border-[var(--nimia-gold-soft)] disabled:pointer-events-none disabled:opacity-60"
        >
          I want to change something
        </button>
      </div>
    </div>
  );
}
