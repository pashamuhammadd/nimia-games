import { Sparkles } from "lucide-react";
import type { StructuredProjectData } from "../types";

export interface BriefSummaryBlockProps {
  understanding: StructuredProjectData;
}

// The AI-written prose summary + rough price estimate (P9, 13 Agustus
// 2026) — shared between UnderstandingPreviewCard (pre-confirm) and
// CreativeBriefCard (post-confirm) so the two never disagree on how these
// two fields are labeled/caveated. Renders nothing for either field that's
// null, which is the normal case before enough is known.
export function BriefSummaryBlock({ understanding }: BriefSummaryBlockProps) {
  if (!understanding.briefSummary && !understanding.estimatedPriceRange) return null;

  return (
    <div className="mb-4 space-y-3">
      {understanding.briefSummary ? (
        <p className="text-sm leading-relaxed text-[var(--foreground)]">{understanding.briefSummary}</p>
      ) : null}

      {understanding.estimatedPriceRange ? (
        <div className="flex items-start gap-2 rounded-xl border border-[var(--nimia-gold-soft)] bg-[var(--nimia-gold-soft)]/40 px-3.5 py-2.5">
          <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--nimia-gold)]" aria-hidden="true" />
          <p className="text-sm text-[var(--foreground)]">
            <span className="font-semibold text-[var(--nimia-gold)]">{understanding.estimatedPriceRange}</span>
            <span className="text-[var(--nimia-muted)]"> — a rough estimate only, not a final quote.</span>
          </p>
        </div>
      ) : null}
    </div>
  );
}
