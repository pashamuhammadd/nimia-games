"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";
import { WHY_DIFFERENT } from "../data";

// SECTION 3 — "Why Our Process is Different". Exactly 4 cards, same visual
// treatment as the Add-ons cards on /services (AddonsSection.tsx) so this
// reads as one consistent card language across the site rather than a new
// style bolted on for this page.
export function WhyDifferentSection() {
  const shouldReduceMotion = useReducedMotion();

  const container: Variants = {
    hidden: {},
    visible: {
      transition: { staggerChildren: shouldReduceMotion ? 0 : 0.1, delayChildren: 0.1 },
    },
  };
  const card: Variants = {
    hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] } },
  };

  return (
    <section className="relative px-4 py-20 sm:px-6 sm:py-28">
      <div className="mx-auto max-w-3xl text-center">
        <span className="inline-block rounded-full border border-[var(--nimia-crimson)]/30 bg-[var(--nimia-crimson)]/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--nimia-pink)]">
          Why Nimia
        </span>
        <h2 className="nimia-font-display mt-5 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
          Why Our Process is Different
        </h2>
      </div>

      <motion.div
        variants={container}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        className="mx-auto mt-14 grid max-w-5xl gap-5 sm:mt-16 sm:grid-cols-2 lg:auto-rows-fr lg:grid-cols-4"
      >
        {WHY_DIFFERENT.map(({ icon: Icon, title, description }) => (
          <motion.div
            key={title}
            variants={card}
            className="group flex h-full flex-col items-start gap-3 rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.05] to-white/[0.015] p-6 transition-all duration-300 ease-out hover:-translate-y-1 hover:border-[var(--nimia-crimson)]/40 hover:shadow-[0_20px_50px_-25px_rgba(193,18,77,0.4)]"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] transition-all duration-300 ease-out group-hover:scale-110 group-hover:border-[var(--nimia-crimson)]/50 group-hover:bg-[var(--nimia-crimson)]/10">
              <Icon className="h-5 w-5 text-[var(--nimia-pink)]" strokeWidth={1.5} aria-hidden="true" />
            </div>
            <h3 className="nimia-font-display text-lg font-bold">{title}</h3>
            <p className="text-sm leading-relaxed text-[var(--nimia-muted)]">{description}</p>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}
