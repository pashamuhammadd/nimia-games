"use client";

import { cn } from "@nimia/ui";
import type { ConfigSelectField } from "../../types";

export interface SelectFieldControlProps {
  field: ConfigSelectField;
  value: string;
  onChange: (optionId: string) => void;
}

// A row of pill/chip options — used for every "select" configFields entry
// (Duration, Background, Style, Platform, …). Kept visually lighter than
// OptionCard (no icon/description slot) since Step 4 can show several of
// these stacked at once; a full card per option would feel heavy here.
export function SelectFieldControl({ field, value, onChange }: SelectFieldControlProps) {
  return (
    <fieldset>
      <legend className="text-sm font-semibold text-white">{field.label}</legend>
      {field.helpText ? <p className="mt-1 text-xs text-white/45">{field.helpText}</p> : null}
      <div className="mt-3 flex flex-wrap gap-2">
        {field.options.map((option) => {
          const selected = value === option.id;
          return (
            <button
              key={option.id}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(option.id)}
              className={cn(
                "rounded-xl border px-4 py-2.5 text-sm font-medium transition-all duration-150",
                selected
                  ? "border-[var(--nimia-crimson)] bg-[var(--nimia-crimson)]/15 text-white"
                  : "border-white/10 bg-white/[0.03] text-white/65 hover:border-white/20 hover:bg-white/[0.06] hover:text-white",
              )}
            >
              {option.label}
              {option.effect?.priceDelta ? (
                <span className="ml-1.5 text-xs text-[var(--nimia-pink)]">
                  +${option.effect.priceDelta}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
