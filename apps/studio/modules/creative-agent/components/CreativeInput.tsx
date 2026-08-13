"use client";

import * as React from "react";
import { ArrowUp, Loader2 } from "lucide-react";
import { cn } from "@nimia/ui";

export interface CreativeInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  placeholder: string;
  helperText?: string;
  /** "hero" is the big idle-state input on first load; "composer" is the
   * same component reused at the bottom of the conversation once it's
   * underway (brief §7/§18 — same control, two moments, not two
   * components) — only sizing/copy differ between the two. */
  variant: "hero" | "composer";
  disabled?: boolean;
  loading?: boolean;
  autoFocus?: boolean;
}

// The Creative Input (brief §7) — one big, premium, elegant control. No
// upload icon in this pass (asset upload is a later phase; a visible but
// non-functional button would be worse than none). Focus state (gold glow
// + subtle expand + a more prominent send button) is brief §18's spec,
// implemented via .nimia-agent-focus-glow (globals.css) plus a couple of
// Tailwind focus-within: utilities here.
export function CreativeInput({
  value,
  onChange,
  onSubmit,
  placeholder,
  helperText,
  variant,
  disabled,
  loading,
  autoFocus,
}: CreativeInputProps) {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const canSubmit = value.trim().length > 0 && !disabled && !loading;

  // Auto-grow up to a sane cap, then let it scroll — same "big single
  // control" feel whether the client writes one line or a full paragraph.
  React.useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, variant === "hero" ? 220 : 160)}px`;
  }, [value, variant]);

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (canSubmit) onSubmit();
    }
  }

  return (
    <div className="w-full">
      <div
        className={cn(
          "nimia-agent-focus-glow flex items-end gap-3 rounded-2xl border border-[var(--nimia-border)] bg-[var(--nimia-surface)] px-5 py-4 transition-all duration-300 ease-out",
          variant === "hero" ? "shadow-[0_20px_60px_-25px_rgba(0,0,0,0.6)]" : "",
        )}
      >
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          autoFocus={autoFocus}
          rows={1}
          className={cn(
            "nimia-font-display max-h-55 min-h-8 flex-1 resize-none bg-transparent text-[var(--foreground)] placeholder:text-[var(--nimia-muted)] focus:outline-none",
            variant === "hero" ? "text-lg sm:text-xl" : "text-base",
          )}
        />
        <button
          type="button"
          onClick={onSubmit}
          disabled={!canSubmit}
          aria-label="Send"
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-all duration-300 ease-out",
            canSubmit
              ? "bg-[var(--nimia-gold)] text-[#1a0f14] shadow-[0_8px_25px_-8px_rgba(217,169,79,0.7)] hover:scale-105"
              : "bg-[var(--nimia-surface-hover)] text-[var(--nimia-muted)]",
          )}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <ArrowUp className="h-4 w-4" aria-hidden="true" />
          )}
        </button>
      </div>
      {helperText ? (
        <p className="mt-3 text-center text-sm text-[var(--nimia-muted)]">{helperText}</p>
      ) : null}
    </div>
  );
}
