"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";
import { X, CheckCircle2 } from "lucide-react";

// Paired rows, same order the user specified. Each pair reads left-to-right
// as "what AI alone gives you" vs. "what working with Nimia adds on top of
// that same AI step" — never framed as AI being bad, just incomplete on its
// own for production work.
const ROWS: Array<{ aiOnly: string; nimia: string }> = [
  { aiOnly: "Generate images", nimia: "Complete production pipeline" },
  { aiOnly: "Inconsistent style", nimia: "Consistent visual identity" },
  { aiOnly: "No art direction", nimia: "Professional art direction" },
  { aiOnly: "No communication", nimia: "Dedicated creative team" },
  { aiOnly: "No revisions", nimia: "Collaborative revisions" },
  { aiOnly: "No optimization", nimia: "Production-ready assets" },
  { aiOnly: "No project management", nimia: "Live project dashboard" },
  { aiOnly: "No accountability", nimia: "Professional delivery" },
];

export function ComparisonSection() {
  const shouldReduceMotion = useReducedMotion();

  const rowVariants = (i: number): Variants => ({
    hidden: {},
    visible: {
      transition: { delayChildren: shouldReduceMotion ? 0 : i * 0.06 },
    },
  });

  const leftCell: Variants = {
    hidden: { opacity: 0, x: shouldReduceMotion ? 0 : -18 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
  };

  const rightCell: Variants = {
    hidden: { opacity: 0, x: shouldReduceMotion ? 0 : 18 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
  };

  return (
    <section className="relative px-4 py-20 sm:px-6 sm:py-28">
      <div className="mx-auto max-w-4xl text-center">
        <span className="inline-block rounded-full border border-[var(--nimia-crimson)]/30 bg-[var(--nimia-crimson)]/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--nimia-pink)]">
          The Difference
        </span>
        <h2 className="nimia-font-display mt-5 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
          Same starting point. Different finish line.
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-[var(--nimia-muted)]">
          Both sides start with AI. What happens after that is where a
          production-ready asset comes from.
        </p>
      </div>

      <div className="relative mx-auto mt-14 max-w-4xl">
        {/* Center divider line, purely decorative */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-1/2 hidden w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-[var(--nimia-crimson)]/40 to-transparent sm:block"
        />

        <div className="mb-4 grid grid-cols-2 gap-4 sm:gap-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--nimia-muted)]">
            AI Only
          </p>
          <p className="nimia-gradient-text text-xs font-bold uppercase tracking-widest">
            Nimia Studio
          </p>
        </div>

        <div className="rounded-3xl border border-[var(--nimia-border)] bg-[var(--nimia-surface)]/40 px-2 sm:px-4">
          {ROWS.map((row, i) => (
            <motion.div
              key={row.aiOnly}
              variants={rowVariants(i)}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-80px" }}
              className="grid grid-cols-2 items-center gap-3 border-b border-[var(--nimia-border)] py-4 sm:gap-8 sm:py-5 [&:last-child]:border-b-0"
            >
              <motion.div variants={leftCell} className="flex items-center gap-2.5 sm:gap-3">
                <X className="h-4 w-4 shrink-0 text-[var(--nimia-muted)]" aria-hidden="true" />
                <span className="text-sm text-[var(--nimia-muted)] sm:text-base">
                  {row.aiOnly}
                </span>
              </motion.div>

              <motion.div
                variants={rightCell}
                className="flex items-center gap-2.5 rounded-xl border border-[var(--nimia-crimson)]/25 bg-gradient-to-r from-[var(--nimia-crimson)]/12 via-[var(--nimia-crimson)]/5 to-transparent px-3 py-2.5 sm:gap-3 sm:px-4"
              >
                <CheckCircle2
                  className="h-4 w-4 shrink-0 text-[var(--nimia-pink)]"
                  aria-hidden="true"
                />
                <span className="text-sm font-semibold text-[var(--foreground)] sm:text-base">
                  {row.nimia}
                </span>
              </motion.div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
