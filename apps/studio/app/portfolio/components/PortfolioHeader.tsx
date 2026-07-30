"use client";

import type { MouseEvent } from "react";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import { ArrowRight } from "lucide-react";

// SECTION 1 — Header. This doubles as the page's hero: title + subheadline
// on the left, a small "View Full Portfolio" link on the right. Kept short
// and left-aligned per the brief — this page is explicitly a teaser, not a
// full marketing hero, so the header stays compact instead of the bigger
// centered treatment used on /why-nimia and /services.
//
// Link behavior changed (30 Juli 2026, fourth correction): this used to
// navigate straight to the (not-yet-built) portfolio.nimiagames.com
// subdomain. It now smooth-scrolls down the page instead, to the closing
// CTA section's "Explore 100+ Creative Works" button
// (id="explore-portfolio" on PortfolioCta.tsx) — that's the page's real
// "go see more" action for now, so this link just gets people there faster
// instead of duplicating it with an external jump.
export function PortfolioHeader() {
  const shouldReduceMotion = useReducedMotion();

  const handleScrollToCta = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    document
      .getElementById("explore-portfolio")
      ?.scrollIntoView({ behavior: shouldReduceMotion ? "auto" : "smooth", block: "start" });
  };

  const container: Variants = {
    hidden: {},
    visible: {
      transition: { staggerChildren: shouldReduceMotion ? 0 : 0.1, delayChildren: 0.05 },
    },
  };
  const item: Variants = {
    hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] } },
  };

  return (
    <section className="relative overflow-hidden px-4 pb-14 pt-20 sm:px-6 sm:pt-28">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-0 h-[32rem] w-[32rem] -translate-x-1/2 rounded-full bg-[var(--nimia-crimson)]/15 blur-[140px]"
      />

      <motion.div
        variants={container}
        initial="hidden"
        animate="visible"
        className="relative mx-auto flex max-w-6xl flex-col gap-8 sm:flex-row sm:items-end sm:justify-between"
      >
        <div>
          <motion.span
            variants={item}
            className="inline-block rounded-full border border-[var(--nimia-crimson)]/30 bg-[var(--nimia-crimson)]/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--nimia-pink)]"
          >
            Selected Work
          </motion.span>

          <motion.h1
            variants={item}
            className="nimia-font-display mt-5 text-4xl font-bold leading-[1.05] tracking-tight sm:text-6xl"
          >
            Featured Work
          </motion.h1>

          <motion.p
            variants={item}
            className="mt-5 max-w-xl text-lg text-[var(--nimia-muted)]"
          >
            A curated selection of animations, games, and digital
            experiences crafted by Nimia Studio.
          </motion.p>
        </div>

        <motion.a
          variants={item}
          href="#explore-portfolio"
          onClick={handleScrollToCta}
          className="group inline-flex shrink-0 items-center gap-2 self-start rounded-full border border-[var(--nimia-border)] px-5 py-2.5 text-sm font-semibold text-[var(--foreground)] transition-colors duration-300 hover:border-[var(--nimia-crimson)]/50 hover:text-[var(--nimia-pink)] sm:self-auto"
        >
          View Full Portfolio
          <ArrowRight
            className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1"
            aria-hidden="true"
          />
        </motion.a>
      </motion.div>
    </section>
  );
}
