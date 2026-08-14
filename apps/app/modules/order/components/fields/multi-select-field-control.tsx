"use client";

import { Check } from "lucide-react";
import { cn } from "@nimia/ui";
import type { ConfigMultiSelectField } from "../../types";

export interface MultiSelectFieldControlProps {
  field: ConfigMultiSelectField;
  value: string[];
  onChange: (optionIds: string[]) => void;
}

// A checkable grid — used for every "multi-select" configFields entry
// (Website's Add-ons: CMS, Dashboard, Blog, Payment Gateway, …). Any
// number of options can be active at once, unlike SelectFieldControl.
export function MultiSelectFieldControl({ field, value, onChange }: MultiSelectFieldControlProps) {
  const toggle = (optionId: string) => {
    onChange(value.includes(optionId) ? value.filter((id) => id !== optionId) : [...value, optionId]);
  };

  return (
    <fieldset>
      <legend className="text-sm font-semibold text-white">{field.label}</legend>
      {field.helpText ? <p className="mt-1 text-xs text-white/45">{field.helpText}</p> : null}
      <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {field.options.map((option) => {
          const checked = value.includes(option.id);
          return (
            <button
              key={option.id}
              type="button"
              aria-pressed={checked}
              onClick={() => toggle(option.id)}
              className={cn(
                "flex items-start gap-3 rounded-xl border p-3.5 text-left transition-all duration-150",
                checked
                  ? "border-[var(--nimia-crimson)] bg-[var(--nimia-crimson)]/15"
                  : "border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.06]",
              )}
            >
              <span
                className={cn(
                  "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border",
                  checked ? "border-[var(--nimia-crimson)] bg-[var(--nimia-crimson)]" : "border-white/20",
                )}
              >
                {checked ? <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} aria-hidden="true" /> : null}
              </span>
              <span>
                <span className="block text-sm font-medium text-white">
                  {option.label}
                  {option.effect?.priceDelta ? (
                    <span className="ml-1.5 font-normal text-[var(--nimia-pink)]">
                      +${option.effect.priceDelta}
                    </span>
                  ) : null}
                </span>
                {option.description ? (
                  <span className="mt-0.5 block text-xs text-white/45">{option.description}</span>
                ) : null}
              </span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
