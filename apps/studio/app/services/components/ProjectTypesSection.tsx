"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";
import { PROJECT_TYPES } from "../data";

// SECTION 4 — Project Types. Small chips, centered and wrapping, showing
// the range of projects Nimia takes on. Purely illustrative, no links.
export function ProjectTypesSection() {
  const shouldReduceMotion = useReducedMotion();

  const container: Variants = {
    hidden: {},
    visible: {
      transition: { staggerChildren: shouldReduceMotion ? 0 : 0.05, delayChildren: 0.1 },
    },
  };
  const chip: Variants = {
    hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 14, scale: shouldReduceMotion ? 1 : 0.94 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] },
    },
  };

  return (
    <section className="relative px-4 py-20 sm:px-6 sm:py-28">
      <div className="mx-auto max-w-3xl text-center">
        <span className="inline-block rounded-full border border-[var(--nimia-crimson)]/30 bg-[var(--nimia-crimson)]/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--nimia-pink)]">
          What We Build
        </span>
        <h2 className="nimia-font-display mt-5 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
          Projects We Love Building
        </h2>
      </div>

      <motion.div
        variants={container}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        className="mx-auto mt-12 flex max-w-4xl flex-wrap items-center justify-center gap-3 sm:mt-14 sm:gap-4"
      >
        {PROJECT_TYPES.map(({ emoji, label }) => (
          <motion.span
            key={label}
            variants={chip}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-5 py-2.5 text-sm font-medium text-[var(--foreground)]/90 transition-colors duration-200 hover:border-[var(--nimia-crimson)]/40 hover:bg-[var(--nimia-crimson)]/[0.08]"
          >
            <span aria-hidden="true">{emoji}</span>
            {label}
          </motion.span>
        ))}
      </motion.div>
    </section>
  );
}
