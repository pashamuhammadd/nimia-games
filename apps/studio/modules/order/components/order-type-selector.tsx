"use client";

import * as React from "react";
import Image from "next/image";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import { Sparkles, Package, Layers, type LucideIcon } from "lucide-react";
import { cn } from "@nimia/ui";
import type { OrderType } from "../types";

export interface OrderTypeSelectorProps {
  onSelect: (type: OrderType) => void;
}

interface OrderTypeOption {
  type: OrderType;
  title: string;
  description: string;
  icon: LucideIcon;
  badge?: string;
  recommended?: boolean;
  /** Card-specific CTA copy (Package/Bundle system, 10 Agustus 2026) — the
   * Packages card reads "Browse Packages" instead of the generic
   * "Continue" every other card still uses, per the brief. */
  ctaLabel?: string;
  /** Optional real icon/image (10 Agustus 2026, per user request — all 3
   * Step 0 cards get a real icon image). When set, this renders in place
   * of the plain lucide `icon` inside the same rounded box — `icon` stays
   * required on every option as the fallback so the page still renders
   * correctly (icon-only) before the actual image files exist on disk. */
  imageSrc?: string;
}

const ORDER_TYPE_OPTIONS: OrderTypeOption[] = [
  {
    type: "project-builder",
    title: "Project Builder",
    description:
      "Configure one professional service with real time pricing and project estimation. Perfect if you already know exactly what you need.",
    icon: Sparkles,
    imageSrc: "/order-types/project-builder.webp",
  },
  {
    type: "packages",
    title: "Packages",
    description:
      "6 curated packages designed to help you launch, build, and grow — the best value for a multi-service project.",
    icon: Package,
    // Moved here from Project Builder (10 Agustus 2026, per user request) —
    // Packages is now the card that carries the "Recommended" badge and its
    // matching highlighted-border/gradient/filled-button treatment.
    badge: "Recommended",
    recommended: true,
    ctaLabel: "Browse Packages",
    imageSrc: "/order-types/packages.webp",
  },
  {
    type: "custom",
    title: "Custom Order",
    description:
      "Combine multiple services into one project, like several GIFs, a trailer, and a landing page, and receive a single quotation.",
    icon: Layers,
    imageSrc: "/order-types/custom-order.webp",
  },
];

// STEP 0 — added 3 Agustus 2026, per user request: a new phase before
// Category that lets a visitor choose how they want to start their order at
// all. Deliberately its own top-level screen, not part of ORDER_STEPS/
// StepId — only "project-builder" hands off into the original step machine
// exactly as it worked before this change (see state/use-order-wizard.ts's
// orderType field and components/order-wizard.tsx's render branch).
// "packages" hands off into its own BUNDLE_STEPS flow (added 10 Agustus
// 2026 — Package/Bundle system), "custom" still renders a placeholder
// screen, so it can grow into a real flow later without touching Project
// Builder's or Packages' architecture at all.
export function OrderTypeSelector({ onSelect }: OrderTypeSelectorProps) {
  const shouldReduceMotion = useReducedMotion();

  const container: Variants = {
    hidden: {},
    visible: { transition: { staggerChildren: shouldReduceMotion ? 0 : 0.1 } },
  };
  const item: Variants = {
    hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 24 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
  };

  return (
    <div>
      <h2 className="nimia-font-display text-2xl font-bold text-white sm:text-3xl">
        How would you like to start?
      </h2>
      <p className="mt-2 text-white/55">Pick the path that fits your project.</p>

      <motion.div
        variants={container}
        initial="hidden"
        animate="visible"
        className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-3"
      >
        {ORDER_TYPE_OPTIONS.map((option) => (
          <motion.div key={option.type} variants={item} className="h-full">
            <OrderTypeCard option={option} onSelect={() => onSelect(option.type)} />
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}

function OrderTypeCard({ option, onSelect }: { option: OrderTypeOption; onSelect: () => void }) {
  const Icon = option.icon;
  // Falls back to the lucide icon if imageSrc is missing on disk (10
  // Agustus 2026 — user is preparing the 3 image files separately, so this
  // avoids a broken-image box showing up between shipping this code and
  // the actual files landing in public/order-types/). Once the real file
  // exists, this never fires and the image renders normally.
  const [imageFailed, setImageFailed] = React.useState(false);
  const showImage = Boolean(option.imageSrc) && !imageFailed;

  return (
    <motion.button
      type="button"
      onClick={onSelect}
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 320, damping: 26 }}
      className={cn(
        "group relative flex h-full w-full flex-col items-center gap-4 rounded-2xl border p-7 text-center transition-colors duration-200",
        option.recommended
          ? "border-[var(--nimia-crimson)]/60 bg-gradient-to-b from-[var(--nimia-crimson)]/15 to-white/[0.02] shadow-[0_20px_60px_-20px_rgba(193,18,77,0.5)]"
          : "border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.06]",
      )}
    >
      {/* Fixed-height badge slot, always rendered even when empty (10
          Agustus 2026, per user feedback) — otherwise a card with a badge
          pushes its icon box lower than the other two cards, so the 3
          icons no longer line up at the same height. Reserving this row
          unconditionally keeps every card's icon box aligned regardless of
          which single card currently carries "Recommended". */}
      <div className="flex h-7 items-center justify-center">
        {option.badge ? (
          <span className="inline-flex w-fit items-center rounded-full border border-[var(--nimia-pink)]/30 bg-[var(--nimia-pink)]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--nimia-pink)]">
            {option.badge}
          </span>
        ) : null}
      </div>

      <div
        className={cn(
          // Landscape box (10 Agustus 2026 — user's icon images are
          // 1536x1024, a 3:2 ratio; a square box would crop them left/right
          // via object-cover, so the box matches the image's own aspect
          // ratio instead and shows it in full). `aspect-[3/2]` with a
          // fixed width, not a fixed height, so this stays consistent
          // whether an image or the lucide fallback icon is showing.
          // Enlarged (w-20 -> w-28) same day per user feedback ("agak
          // besar") and centered in the card (parent is now items-center).
          "relative flex aspect-[3/2] w-28 shrink-0 items-center justify-center overflow-hidden rounded-2xl border",
          option.recommended
            ? "border-[var(--nimia-crimson)]/50 bg-[var(--nimia-crimson)]/20"
            : "border-white/10 bg-white/[0.06] group-hover:border-white/20",
        )}
      >
        {showImage ? (
          <Image
            src={option.imageSrc as string}
            alt=""
            fill
            sizes="112px"
            className="object-cover"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <Icon className="h-9 w-9 text-[var(--nimia-pink)]" strokeWidth={1.75} aria-hidden="true" />
        )}
      </div>

      <div className="flex-1">
        <p className="nimia-font-display text-xl font-bold text-white">{option.title}</p>
        <p className="mt-2 text-sm leading-relaxed text-white/60">{option.description}</p>
      </div>

      <span
        className={cn(
          "mt-2 inline-flex w-full items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors",
          option.recommended
            ? "bg-[var(--nimia-crimson)] text-white group-hover:bg-[var(--nimia-crimson-hover)]"
            : "border border-white/15 text-white/80 group-hover:border-white/30 group-hover:text-white",
        )}
      >
        {option.ctaLabel ?? "Continue"}
      </span>
    </motion.button>
  );
}
