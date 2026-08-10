"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";
import { ArrowRight, Layers } from "lucide-react";
import type { BundlePackage } from "../types/bundle";
import { OptionCard } from "./option-card";

export interface PackageBrowseGridProps {
  packages: BundlePackage[];
  onSelect: (packageId: string) => void;
  onCustomOrder: () => void;
}

// Package/Bundle system (10 Agustus 2026, per user request) — the "Browse
// Packages" step (BUNDLE_STEPS[0]): all 6 packages as a card grid, never a
// long single-column form. 3 columns on desktop, 2 on tablet, 1 on mobile —
// same responsive rhythm as CategorySelector/ServiceSelector's grids, no
// new breakpoints introduced. Web3 Growth is the only package with
// `featured: true` (see ../data/bundle-packages.ts), which OptionCard turns
// into the single strongest visual treatment on this page — no other card
// competes with it for attention.
export function PackageBrowseGrid({ packages, onSelect, onCustomOrder }: PackageBrowseGridProps) {
  const shouldReduceMotion = useReducedMotion();

  const container: Variants = {
    hidden: {},
    visible: { transition: { staggerChildren: shouldReduceMotion ? 0 : 0.06 } },
  };
  const item: Variants = {
    hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 16 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } },
  };

  return (
    <div>
      <h2 className="nimia-font-display text-2xl font-bold text-white sm:text-3xl">Browse Packages</h2>
      <p className="mt-2 text-white/55">
        6 curated packages designed to help you launch, build, and grow. Pick one to see exactly
        what&apos;s included.
      </p>

      <motion.div
        variants={container}
        initial="hidden"
        animate="visible"
        className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3"
      >
        {packages.map((pkg) => {
          const Icon = pkg.icon;
          return (
            <motion.div key={pkg.id} variants={item} className="h-full">
              <OptionCard
                size="lg"
                title={pkg.name}
                description={pkg.description}
                badge={pkg.badge}
                icon={Icon}
                imageSrc={pkg.thumbnailSrc}
                imageAlt={pkg.name}
                featured={pkg.featured}
                onClick={() => onSelect(pkg.id)}
                className="min-h-[16rem]"
                meta={
                  <div className="mt-3 flex w-full items-end justify-between border-t border-white/10 pt-3">
                    <p className="nimia-gradient-text nimia-font-display text-3xl font-bold">${pkg.price}</p>
                    <span className="inline-flex items-center gap-1 text-sm font-semibold text-white/70 transition-colors group-hover:text-white">
                      Choose Package
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </span>
                  </div>
                }
              />
            </motion.div>
          );
        })}
      </motion.div>

      {/* Subtle Custom Order CTA (per the brief — "without stealing focus
          from Package itself") — a plain text row below the grid, not
          another card competing visually with the 6 packages above. */}
      <div className="mt-8 flex flex-col items-center gap-2 rounded-xl border border-white/10 bg-white/[0.02] p-5 text-center sm:flex-row sm:justify-between sm:text-left">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/[0.06]">
            <Layers className="h-4 w-4 text-white/50" aria-hidden="true" />
          </span>
          <p className="text-sm text-white/60">
            Need something different? Build a custom project with our team.
          </p>
        </div>
        <button
          type="button"
          onClick={onCustomOrder}
          className="text-sm font-semibold text-[var(--nimia-pink)] transition-colors hover:text-white"
        >
          Custom Order →
        </button>
      </div>
    </div>
  );
}
