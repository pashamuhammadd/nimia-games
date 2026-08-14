"use client";

import { cn } from "@nimia/ui";
import type { ConfigToggleField } from "../../types";

export interface ToggleFieldControlProps {
  field: ConfigToggleField;
  value: boolean;
  onChange: (value: boolean) => void;
}

// A single on/off row — used for every "toggle" configFields entry (Voice
// Over, Source File, Express Delivery, …). Hand-rolled switch, same
// no-extra-dependency philosophy as @nimia/ui's other form controls.
export function ToggleFieldControl({ field, value, onChange }: ToggleFieldControlProps) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <div>
        <p className="text-sm font-semibold text-white">
          {field.label}
          {field.effect?.priceDelta ? (
            <span className="ml-1.5 font-normal text-[var(--nimia-pink)]">
              +${field.effect.priceDelta}
            </span>
          ) : null}
        </p>
        {field.helpText ? <p className="mt-0.5 text-xs text-white/45">{field.helpText}</p> : null}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={value}
        aria-label={field.label}
        onClick={() => onChange(!value)}
        className={cn(
          "relative h-6 w-11 shrink-0 rounded-full border transition-colors duration-200",
          value ? "border-[var(--nimia-crimson)] bg-[var(--nimia-crimson)]" : "border-white/15 bg-white/10",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-[18px] w-[18px] rounded-full bg-white transition-transform duration-200",
            value ? "translate-x-[22px]" : "translate-x-0.5",
          )}
        />
      </button>
    </div>
  );
}
