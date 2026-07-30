"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";
import { GameCard } from "./GameCard";
import { FEATURED_GAMES } from "../data";

// NEW SECTION — Featured Games (30 Juli 2026 brief), inserted between
// Featured Showcase (the animation/motion showreel) and the page's closing
// CTA. Purpose: after visitors see the animation showcase above, this
// section proves Nimia Studio also ships original games, not just motion
// work — so it's deliberately built as a premium game-storefront showcase
// (Steam/Epic Games Store/Riot/Supercell/Ubisoft/PlayStation reference),
// NOT a generic portfolio grid.
//
// REDESIGNED (30 Juli 2026, second pass, still same day): user sent an
// exact reference mockup and asked to match it pixel-for-pixel. Changes
// from the first version: eyebrow is now a plain letter-spaced red label
// flanked by thin divider lines (not a pill badge), the heading reads
// "Games by Nimia Studio" with "Nimia" in brand red, and each GameCard now
// carries its own accent color + feature-tag row + dual CTA — see
// GameCard.tsx for that detail.
//
// Footer CTA REMOVED (30 Juli 2026, third pass): the "More exciting
// projects are coming soon." banner that used to sit below the 2 cards is
// gone per user correction — the page's closing CTA (PortfolioCta.tsx,
// right below this section) already covers that "go explore more" beat,
// so this section now ends right after the game cards.
export function FeaturedGames() {
  const shouldReduceMotion = useReducedMotion();

  const header: Variants = {
    hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] } },
  };
  const container: Variants = {
    hidden: {},
    visible: {
      transition: { staggerChildren: shouldReduceMotion ? 0 : 0.15, delayChildren: 0.1 },
    },
  };
  const card: Variants = {
    hidden: {
      opacity: 0,
      y: shouldReduceMotion ? 0 : 28,
      filter: shouldReduceMotion ? "blur(0px)" : "blur(6px)",
    },
    visible: {
      opacity: 1,
      y: 0,
      filter: "blur(0px)",
      transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] },
    },
  };

  return (
    <section className="relative px-4 py-20 sm:px-6 sm:py-28">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute right-0 top-1/3 h-[26rem] w-[26rem] rounded-full bg-[var(--nimia-crimson)]/10 blur-[150px]"
      />

      <motion.div
        variants={header}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        className="relative mx-auto max-w-3xl text-center"
      >
        <div className="flex items-center justify-center gap-4">
          <span className="h-px w-12 bg-white/15 sm:w-16" aria-hidden="true" />
          <span className="text-xs font-semibold uppercase tracking-[0.35em] text-[var(--nimia-crimson)]">
            Featured Games
          </span>
          <span className="h-px w-12 bg-white/15 sm:w-16" aria-hidden="true" />
        </div>
        <h2 className="nimia-font-display mt-5 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
          Games by <span className="text-[var(--nimia-crimson)]">Nimia</span> Studio
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-[var(--nimia-muted)]">
          Original games crafted with passion, creativity, and the latest technology.
        </p>
      </motion.div>

      <motion.div
        variants={container}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        className="relative mx-auto mt-14 grid max-w-6xl gap-7 sm:mt-16 lg:grid-cols-2 lg:gap-8"
      >
        {FEATURED_GAMES.map((game) => (
          <motion.div key={game.id} variants={card}>
            <GameCard game={game} />
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}
