"use client";

import { motion } from "framer-motion";
import { ArrowLeft, Layers } from "lucide-react";

export interface CustomOrderPlaceholderProps {
  onBack: () => void;
}

// Placeholder for the "Custom Order" order type (added 3 Agustus 2026, per
// user request). The real Custom Builder (combining several services into
// one project and one quotation) is a later phase; for now this just
// confirms the choice and lets a visitor return to Step 0. Kept as its own
// small component (rather than inline in order-wizard.tsx) so it can be
// swapped for the real flow later without touching anything else.
export function CustomOrderPlaceholder({ onBack }: CustomOrderPlaceholderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="flex flex-col items-center px-4 py-20 text-center sm:py-28"
    >
      <button
        type="button"
        onClick={onBack}
        className="mb-8 inline-flex items-center gap-1.5 text-sm font-medium text-white/50 transition-colors hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to order type
      </button>

      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--nimia-crimson)]/15">
        <Layers className="h-8 w-8 text-[var(--nimia-pink)]" aria-hidden="true" />
      </span>

      <h1 className="nimia-font-display mt-6 text-2xl font-bold text-white sm:text-3xl">
        Custom Order Builder is coming soon.
      </h1>
      <p className="mt-3 max-w-md text-white/60">
        Soon you will be able to combine several services, like GIFs, a trailer, a landing page, and
        game icons, into one project and receive a single quotation. For now, use Project Builder to
        configure one service at a time.
      </p>
    </motion.div>
  );
}
