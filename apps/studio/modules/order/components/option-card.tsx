"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Check, type LucideIcon } from "lucide-react";
import { cn } from "@nimia/ui";

// The single "selectable card" building block used across the whole
// configurator — Category, Service, Package, and every select/multi-select
// field in Step 4 all render one of these instead of each owning its own
// card markup. Per the brief: cards everywhere, never a <select> dropdown.
export interface OptionCardProps {
  title: string;
  description?: string;
  meta?: React.ReactNode;
  icon?: LucideIcon;
  badge?: string;
  selected?: boolean;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
  onClick?: () => void;
  className?: string;
  /** Marks this card as the single most visually prominent option in its
   * group (Package/Bundle system, 10 Agustus 2026 — Web3 Growth's "Most
   * Popular" package on the browse grid). Layers a subtly stronger border,
   * a small scale bump, and extra elevation on top of the default resting
   * style — deliberately restrained (no glow/pulse/badge duplication) per
   * the brief's "not excessive/gimmicky" requirement. Has no visible effect
   * when `selected` is also true, since the selected style already carries
   * the strongest visual weight a card can have. */
  featured?: boolean;
}

export function OptionCard({
  title,
  description,
  meta,
  icon: Icon,
  badge,
  selected = false,
  disabled = false,
  size = "md",
  onClick,
  className,
  featured = false,
}: OptionCardProps) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      whileTap={disabled ? undefined : { scale: 0.98 }}
      className={cn(
        "group relative flex h-full w-full flex-col items-start rounded-2xl border text-left transition-all duration-200 ease-out",
        size === "lg" && "gap-4 p-6 sm:p-7",
        size === "md" && "gap-3 p-5",
        size === "sm" && "gap-2 p-4",
        selected
          ? "border-[var(--nimia-crimson)] bg-[var(--nimia-crimson)]/10 shadow-[0_10px_40px_-15px_rgba(193,18,77,0.45)]"
          : featured
            ? "scale-[1.02] border-[var(--nimia-crimson)]/50 bg-white/[0.04] shadow-[0_20px_60px_-25px_rgba(193,18,77,0.5)] hover:-translate-y-0.5 hover:border-[var(--nimia-crimson)]/70"
            : "border-white/10 bg-white/[0.03] hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.06]",
        disabled && "cursor-not-allowed opacity-40 hover:translate-y-0",
        className,
      )}
    >
      {selected ? (
        <span className="absolute right-4 top-4 flex h-6 w-6 items-center justify-center rounded-full bg-[var(--nimia-crimson)] text-white">
          <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden="true" />
        </span>
      ) : null}

      {badge ? (
        <span className="inline-flex w-fit items-center rounded-full border border-[var(--nimia-pink)]/30 bg-[var(--nimia-pink)]/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--nimia-pink)]">
          {badge}
        </span>
      ) : null}

      {Icon ? (
        <div
          className={cn(
            "flex items-center justify-center rounded-xl border transition-colors",
            size === "lg" ? "h-12 w-12" : "h-10 w-10",
            selected
              ? "border-[var(--nimia-crimson)]/50 bg-[var(--nimia-crimson)]/15"
              : "border-white/10 bg-white/[0.06] group-hover:border-white/20",
          )}
        >
          <Icon
            className={cn("text-[var(--nimia-pink)]", size === "lg" ? "h-6 w-6" : "h-5 w-5")}
            strokeWidth={1.75}
            aria-hidden="true"
          />
        </div>
      ) : null}

      <div className="flex-1">
        <p className={cn("nimia-font-display font-bold text-white", size === "lg" ? "text-xl" : "text-base")}>
          {title}
        </p>
        {description ? (
          <p className="mt-1 text-sm leading-relaxed text-white/55">{description}</p>
        ) : null}
      </div>

      {meta ? <div className="mt-1 w-full">{meta}</div> : null}
    </motion.button>
  );
}
