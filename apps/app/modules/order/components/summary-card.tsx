import * as React from "react";
import { cn } from "@nimia/ui";

export interface SummaryRow {
  label: string;
  value: React.ReactNode;
}

export interface SummaryCardProps {
  title: string;
  rows: SummaryRow[];
  onEdit?: () => void;
  className?: string;
}

// A titled block of label/value rows — the one building block both
// PriceEstimator (desktop sidebar + mobile sheet) and ReviewSection reuse
// for every section of the order summary (Service, Configuration, Brief,
// Files, …), instead of each hand-rolling its own layout.
export function SummaryCard({ title, rows, onEdit, className }: SummaryCardProps) {
  if (rows.length === 0) return null;

  return (
    <div className={cn("rounded-xl border border-white/10 bg-white/[0.03] p-4", className)}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-white/40">{title}</p>
        {onEdit ? (
          <button
            type="button"
            onClick={onEdit}
            className="text-xs font-semibold text-[var(--nimia-pink)] hover:underline"
          >
            Edit
          </button>
        ) : null}
      </div>
      <dl className="mt-2.5 flex flex-col gap-1.5">
        {rows.map((row, index) => (
          <div key={index} className="flex items-start justify-between gap-3 text-sm">
            <dt className="text-white/55">{row.label}</dt>
            <dd className="text-right font-medium text-white">{row.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
