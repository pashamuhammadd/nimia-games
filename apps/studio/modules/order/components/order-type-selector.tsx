"use client";

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
}

const ORDER_TYPE_OPTIONS: OrderTypeOption[] = [
  {
    type: "project-builder",
    title: "Project Builder",
    description:
      "Configure one professional service with real time pricing and project estimation. Perfect if you already know exactly what you need.",
    icon: Sparkles,
    badge: "Recommended",
    recommended: true,
  },
  {
    type: "packages",
    title: "Packages",
    description:
      "Browse ready to use service bundles for the best value. Perfect for clients who want a predefined package.",
    icon: Package,
  },
  {
    type: "custom",
    title: "Custom Order",
    description:
      "Combine multiple services into one project, like several GIFs, a trailer, and a landing page, and receive a single quotation.",
    icon: Layers,
  },
];

// STEP 0 — added 3 Agustus 2026, per user request: a new phase before
// Category that lets a visitor choose how they want to start their order at
// all. Deliberately its own top-level screen, not part of ORDER_STEPS/
// StepId — only "project-builder" hands off into the existing wizard
// exactly as it worked before this change (see
// state/use-order-wizard.ts's orderType field and
// components/order-wizard.tsx's render branch). "packages" and "custom"
// render their own placeholder screens instead, so those two can grow into
// real flows later without touching Project Builder's architecture at all.
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
  return (
    <motion.button
      type="button"
      onClick={onSelect}
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 320, damping: 26 }}
      className={cn(
        "group relative flex h-full w-full flex-col items-start gap-4 rounded-2xl border p-7 text-left transition-colors duration-200",
        option.recommended
          ? "border-[var(--nimia-crimson)]/60 bg-gradient-to-b from-[var(--nimia-crimson)]/15 to-white/[0.02] shadow-[0_20px_60px_-20px_rgba(193,18,77,0.5)]"
          : "border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.06]",
      )}
    >
      {option.badge ? (
        <span className="inline-flex w-fit items-center rounded-full border border-[var(--nimia-pink)]/30 bg-[var(--nimia-pink)]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--nimia-pink)]">
          {option.badge}
        </span>
      ) : null}

      <div
        className={cn(
          "flex h-14 w-14 items-center justify-center rounded-2xl border",
          option.recommended
            ? "border-[var(--nimia-crimson)]/50 bg-[var(--nimia-crimson)]/20"
            : "border-white/10 bg-white/[0.06] group-hover:border-white/20",
        )}
      >
        <Icon className="h-7 w-7 text-[var(--nimia-pink)]" strokeWidth={1.75} aria-hidden="true" />
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
        Continue
      </span>
    </motion.button>
  );
}
