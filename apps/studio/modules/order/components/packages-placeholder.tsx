"use client";

import { motion } from "framer-motion";
import { ArrowLeft, PackageSearch } from "lucide-react";

export interface PackagesPlaceholderProps {
  onBack: () => void;
}

// Placeholder for the "Packages" order type (added 3 Agustus 2026, per
// user request). The real package browsing and detail flow (Package List
// -> Package Details -> Review) is a later phase; for now this just
// confirms the choice and lets a visitor return to Step 0. Kept as its own
// small component (rather than inline in order-wizard.tsx) so it can be
// swapped for the real flow later without touching anything else.
export function PackagesPlaceholder({ onBack }: PackagesPlaceholderProps) {
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
        <PackageSearch className="h-8 w-8 text-[var(--nimia-pink)]" aria-hidden="true" />
      </span>

      <h1 className="nimia-font-display mt-6 text-2xl font-bold text-white sm:text-3xl">
        Packages are coming soon.
      </h1>
      <p className="mt-3 max-w-md text-white/60">
        We are building curated service bundles with better value. In the meantime, Project Builder
        already covers every service in our catalog with real time pricing.
      </p>
    </motion.div>
  );
}
