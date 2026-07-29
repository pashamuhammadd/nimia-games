"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";
import { Sparkles, Clock, CheckCircle2, ArrowRight } from "lucide-react";

// Deliberately abstract on the left (radial gradient blobs + a Sparkles
// icon) rather than a mocked-up screenshot of any specific AI tool's
// output — this represents "a raw AI pass" as a concept, not a claim about
// what any named product actually produces.
const DELIVERABLES = [
  "Character Sheet",
  "Multiple Expressions",
  "Turnaround",
  "Sprite Animation",
  "UI Portrait",
  "Unity Ready",
  "Source Files",
  "Optimized Assets",
];

export function ConceptVisual() {
  const shouldReduceMotion = useReducedMotion();

  const listContainer: Variants = {
    hidden: {},
    visible: {
      transition: { staggerChildren: shouldReduceMotion ? 0 : 0.08, delayChildren: 0.1 },
    },
  };

  const listItem: Variants = {
    hidden: { opacity: 0, x: shouldReduceMotion ? 0 : -12 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } },
  };

  const fadeUp: Variants = {
    hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } },
  };

  return (
    <section className="relative px-4 py-20 sm:px-6 sm:py-28">
      <div className="mx-auto max-w-4xl text-center">
        <span className="inline-block rounded-full border border-[var(--nimia-crimson)]/30 bg-[var(--nimia-crimson)]/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--nimia-pink)]">
          From Concept to Product
        </span>
        <h2 className="nimia-font-display mt-5 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
          AI generates an image. Nimia delivers a product.
        </h2>
      </div>

      <div className="mx-auto mt-14 grid max-w-6xl items-center gap-6 md:grid-cols-[1fr_auto_1fr] md:gap-8">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          className="rounded-2xl border border-dashed border-[var(--nimia-border)] bg-[var(--nimia-surface)]/30 p-6 sm:p-8"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-widest text-[var(--nimia-muted)]">
              AI Generated Concept
            </span>
            <Clock className="h-4 w-4 text-[var(--nimia-muted)]" aria-hidden="true" />
          </div>

          <div className="relative mt-6 flex h-48 items-center justify-center overflow-hidden rounded-xl bg-white/[0.03] sm:h-56">
            <div
              aria-hidden="true"
              className="absolute inset-0 opacity-60"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 30% 30%, rgba(255,77,141,0.22), transparent 60%), radial-gradient(circle at 70% 70%, rgba(193,18,77,0.18), transparent 55%)",
              }}
            />
            <Sparkles
              className="relative h-10 w-10 text-[var(--nimia-muted)]"
              strokeWidth={1.25}
              aria-hidden="true"
            />
          </div>

          <p className="mt-4 text-sm text-[var(--nimia-muted)]">
            Generated in seconds. One prompt, one pass, no art direction and
            no guarantee it matches anything else in your world.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: shouldReduceMotion ? 1 : 0.7 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="mx-auto flex h-12 w-12 rotate-90 items-center justify-center rounded-full border border-[var(--nimia-crimson)]/30 bg-[var(--nimia-crimson)]/10 md:rotate-0"
        >
          <ArrowRight className="h-5 w-5 text-[var(--nimia-pink)]" aria-hidden="true" />
        </motion.div>

        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          transition={{ delay: 0.15 }}
          className="relative rounded-2xl border border-[var(--nimia-crimson)]/30 bg-[var(--nimia-surface)] p-6 shadow-[0_0_70px_-20px_rgba(193,18,77,0.4)] sm:p-8"
        >
          <div className="flex items-center justify-between">
            <span className="nimia-gradient-text text-xs font-bold uppercase tracking-widest">
              Production Ready by Nimia
            </span>
            <span className="rounded-full bg-[var(--nimia-crimson)]/15 px-2.5 py-1 text-[10px] font-semibold text-[var(--nimia-pink)]">
              8/8 Delivered
            </span>
          </div>

          <motion.ul
            variants={listContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            className="mt-6 space-y-3"
          >
            {DELIVERABLES.map((label) => (
              <motion.li key={label} variants={listItem} className="flex items-center gap-2.5">
                <CheckCircle2
                  className="h-4 w-4 shrink-0 text-[var(--nimia-pink)]"
                  aria-hidden="true"
                />
                <span className="text-sm font-medium sm:text-base">{label}</span>
              </motion.li>
            ))}
          </motion.ul>
        </motion.div>
      </div>
    </section>
  );
}
