"use client";

import * as React from "react";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "../lib/cn";

// Hand-rolled dropdown (no Radix — same "no unverified dependency" philosophy
// as Modal.tsx/Button.tsx), added 3 Agustus 2026, fifth pass, per user
// report/audit request — a plain <select>'s OPEN option list is drawn by the
// browser/OS as native chrome, entirely outside the page's own paint layer.
// No CSS reaches it beyond `color-scheme` (a binary light/dark hint, see
// Select.tsx's own history of trying that) — it can never pick up our actual
// brand tokens (--nimia-surface, --nimia-border, --nimia-crimson, the
// translucent "glass card" look every other @nimia/ui surface uses). This
// renders the trigger AND the option list as regular DOM instead, so BOTH
// re-theme via the same CSS custom properties (and .nimia-dark/
// .nimia-dark-vars scoping) as every other component here — no native-chrome
// ceiling on how on-brand it can look.
//
// Use this instead of <Select> wherever the open list itself needs to read
// as on-brand (e.g. inside a Modal, like
// apps/studio/app/dashboard/orders/PaymentPanel.tsx's Network/Currency
// pickers). <Select> stays for cases where a plain native control is enough.
export interface ListboxOption {
  value: string;
  label: string;
}

export interface ListboxProps {
  value: string;
  onChange: (value: string) => void;
  options: ListboxOption[];
  placeholder?: string;
  disabled?: boolean;
  invalid?: boolean;
  id?: string;
  className?: string;
}

export function Listbox({
  value,
  onChange,
  options,
  placeholder = "Select…",
  disabled,
  invalid,
  id,
  className,
}: ListboxProps) {
  const [open, setOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const selected = options.find((option) => option.value === value) ?? null;

  // Click-outside + Escape to close — same pattern as Modal.tsx's own
  // Escape listener, scoped to only listen while actually open.
  React.useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  // Closing whenever `disabled` flips true mid-open (e.g. PaymentPanel's
  // currency picker disables itself when its network changes) avoids a
  // stray open panel sitting on top of a now-disabled trigger.
  React.useEffect(() => {
    if (disabled) setOpen(false);
  }, [disabled]);

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <button
        type="button"
        id={id}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex h-10 w-full items-center justify-between gap-2 rounded-md border bg-[var(--nimia-surface)] px-3 text-left text-sm text-[var(--foreground)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--nimia-crimson)] disabled:cursor-not-allowed disabled:opacity-50",
          invalid ? "border-red-500 focus-visible:ring-red-500" : "border-[var(--nimia-border)]",
        )}
      >
        <span className={cn("truncate", !selected && "text-[var(--nimia-muted)]")}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-[var(--nimia-muted)] transition-transform",
            open && "rotate-180",
          )}
          aria-hidden="true"
        />
      </button>

      {open ? (
        <div
          role="listbox"
          // bg-[var(--nimia-popover)] (added 3 Agustus 2026, sixth pass, per
          // user report/screenshot — the option list used
          // --nimia-surface-hover, which is only 8% white on dark scopes.
          // That's fine for a card sitting flush against the page, but this
          // panel floats OVER whatever content is already below it (e.g.
          // PaymentPanel.tsx's payment-details block), and at 8% opacity
          // that content read straight through and visually collided with
          // the option labels. --nimia-popover is a near-opaque (~97%)
          // token defined alongside the other brand vars in globals.css
          // specifically for floating panels like this one — see its
          // comment there. backdrop-blur-md softens the ~3% that's still
          // technically see-through so the edge never looks like a hard cut.
          className="absolute left-0 right-0 top-full z-50 mt-1.5 max-h-60 overflow-y-auto rounded-md border border-[var(--nimia-border)] bg-[var(--nimia-popover)] py-1 shadow-xl backdrop-blur-md"
        >
          {options.length === 0 ? (
            <p className="px-3 py-2 text-sm text-[var(--nimia-muted)]">No options</p>
          ) : (
            options.map((option) => {
              const isSelected = option.value === value;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  className={cn(
                    // Hardcoded rgba (not a `/opacity` modifier on the
                    // --nimia-crimson/--foreground CSS vars) — deliberately,
                    // since Tailwind's opacity-modifier syntax on an
                    // arbitrary var() isn't guaranteed to resolve the same
                    // way across Tailwind versions, and this needs to just
                    // work. text-white/80 mirrors how the rest of this
                    // dashboard already dims text (OrderDetail.tsx,
                    // PaymentPanel.tsx, etc. all use literal text-white/NN
                    // rather than var(--foreground) directly).
                    "flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm text-white transition-colors hover:bg-[rgba(193,18,77,0.15)]",
                    !isSelected && "text-white/80",
                  )}
                >
                  {option.label}
                  {isSelected ? (
                    <Check className="h-3.5 w-3.5 shrink-0 text-[var(--nimia-crimson)]" aria-hidden="true" />
                  ) : null}
                </button>
              );
            })
          )}
        </div>
      ) : null}
    </div>
  );
}
