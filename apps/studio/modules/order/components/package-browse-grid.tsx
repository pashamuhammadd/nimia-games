"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion, type Variants } from "framer-motion";
import { ArrowRight, ChevronLeft, ChevronRight, Layers } from "lucide-react";
import type { BundlePackage } from "../types/bundle";
import { OptionCard } from "./option-card";

export interface PackageBrowseGridProps {
  packages: BundlePackage[];
  onSelect: (packageId: string) => void;
  onCustomOrder: () => void;
}

// Package/Bundle system (10 Agustus 2026, per user request) — the "Browse
// Packages" step (BUNDLE_STEPS[0]).
//
// Hybrid layout, revised same day after user feedback that a 6-up grid on
// its own made thumbnails too small to read: mobile (<sm) renders a single
// full-width card at a time with swipe + Prev/Next (thumbnails read clearly
// on a small screen, and it replaces a long stacked scroll of 6 cards with
// something more deliberate). sm and up keeps a card GRID — 2 columns
// instead of the original 3, so each card (and its thumbnail) is bigger —
// because on tablet/desktop a B2B buyer comparing packages side by side
// still matters; that got weighed as more important than seeing all 6
// thumbnails at maximum size simultaneously. Both layouts are pure CSS
// (`hidden`/`sm:hidden`), not a JS media-query hook, so there's no
// hydration mismatch and resizing the window just works. Web3 Growth is the
// only package with `featured: true` (see ../data/bundle-packages.ts),
// which OptionCard turns into the single strongest visual treatment on this
// page in both layouts — no other card competes with it for attention.
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

  // [index, direction] — direction (-1/1) only drives which side the slide
  // animates in/out from; it carries no other meaning. Kept as one state
  // value (not two separate ones) so a click on the current slide's own dot
  // can't leave a stale direction from an earlier swipe.
  const [[index, direction], setSlide] = React.useState<[number, number]>([0, 0]);
  const current = packages[index];

  const paginate = (nextDirection: number) => {
    setSlide(([prevIndex]) => {
      const nextIndex = (prevIndex + nextDirection + packages.length) % packages.length;
      return [nextIndex, nextDirection];
    });
  };
  const goTo = (targetIndex: number) => {
    setSlide(([prevIndex]) => [targetIndex, targetIndex >= prevIndex ? 1 : -1]);
  };

  const slideVariants: Variants = {
    enter: (dir: number) => ({ x: shouldReduceMotion ? 0 : dir > 0 ? 48 : -48, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: shouldReduceMotion ? 0 : dir > 0 ? -48 : 48, opacity: 0 }),
  };

  function renderCard(pkg: BundlePackage, className?: string) {
    const Icon = pkg.icon;
    return (
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
        className={className}
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
    );
  }

  return (
    <div>
      <h2 className="nimia-font-display text-2xl font-bold text-white sm:text-3xl">Browse Packages</h2>
      <p className="mt-2 text-white/55">
        6 curated packages designed to help you launch, build, and grow. Pick one to see exactly
        what&apos;s included.
      </p>

      {/* Mobile: one card at a time, swipe or Prev/Next. */}
      <div className="mt-8 sm:hidden">
        <div className="relative overflow-hidden">
          <AnimatePresence mode="wait" custom={direction} initial={false}>
            <motion.div
              key={current.id}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: shouldReduceMotion ? 0 : 0.25, ease: [0.16, 1, 0.3, 1] }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.15}
              onDragEnd={(_event: unknown, info: { offset: { x: number } }) => {
                if (info.offset.x < -60) paginate(1);
                else if (info.offset.x > 60) paginate(-1);
              }}
            >
              {renderCard(current, "min-h-[16rem]")}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* aria-live announcement for screen readers — the visual slide
            transition alone doesn't announce anything on its own. */}
        <p className="sr-only" aria-live="polite">
          Package {index + 1} of {packages.length}: {current.name}
        </p>

        <div className="mt-5 flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={() => paginate(-1)}
            aria-label="Previous package"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/15 text-white/70 transition-colors hover:border-white/30 hover:text-white"
          >
            <ChevronLeft className="h-5 w-5" aria-hidden="true" />
          </button>

          <div className="flex items-center gap-1.5">
            {packages.map((pkg, i) => (
              <button
                key={pkg.id}
                type="button"
                onClick={() => goTo(i)}
                aria-label={`Go to ${pkg.name}`}
                aria-current={i === index}
                className={
                  i === index
                    ? "h-1.5 w-5 rounded-full bg-[var(--nimia-pink)] transition-all"
                    : "h-1.5 w-1.5 rounded-full bg-white/20 transition-all hover:bg-white/35"
                }
              />
            ))}
          </div>

          <button
            type="button"
            onClick={() => paginate(1)}
            aria-label="Next package"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/15 text-white/70 transition-colors hover:border-white/30 hover:text-white"
          >
            <ChevronRight className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Tablet/desktop: 2-column grid (was 3) — bigger cards and bigger
          thumbnails, while still letting a client compare more than one
          package at a glance. */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="visible"
        className="mt-8 hidden gap-5 sm:grid sm:grid-cols-2"
      >
        {packages.map((pkg) => (
          <motion.div key={pkg.id} variants={item} className="h-full">
            {renderCard(pkg, "min-h-[16rem]")}
          </motion.div>
        ))}
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
