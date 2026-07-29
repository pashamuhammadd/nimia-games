"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";
import { ADDONS } from "../data";

// SECTION 5 — Optional Add-ons. Small glass cards, 4-across on desktop,
// 2-across on mobile. Deliberately no pricing here (brief only lists names)
// — these extend a project scoped through Section 2/6, not standalone
// products.
export function AddonsSection() {
  const shouldReduceMotion = useReducedMotion();

  const container: Variants = {
    hidden: {},
    visible: {
      transition: { staggerChildren: shouldReduceMotion ? 0 : 0.06, delayChildren: 0.1 },
    },
  };
  const card: Variants = {
    hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 18 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
  };

  return (
    <section className="relative px-4 py-20 sm:px-6 sm:py-28">
      <div className="mx-auto max-w-3xl text-center">
        <span className="inline-block rounded-full border border-[var(--nimia-crimson)]/30 bg-[var(--nimia-crimson)]/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--nimia-pink)]">
          Add-ons
        </span>
        <h2 className="nimia-font-display mt-5 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
          Expand Your Project
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-[var(--nimia-muted)]">
          Layer these onto any service or package to round out your project.
        </p>
      </div>

      <motion.div
        variants={container}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        className="mx-auto mt-12 grid max-w-5xl grid-cols-2 gap-4 sm:mt-14 sm:gap-5 lg:grid-cols-4"
      >
        {ADDONS.map(({ label, icon: Icon }) => (
          <motion.div
            key={label}
            variants={card}
            className="group flex flex-col items-center gap-3 rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.05] to-white/[0.015] px-4 py-7 text-center transition-all duration-300 ease-out hover:-translate-y-1 hover:border-[var(--nimia-crimson)]/40 hover:shadow-[0_20px_50px_-25px_rgba(193,18,77,0.4)]"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] transition-all duration-300 ease-out group-hover:scale-110 group-hover:border-[var(--nimia-crimson)]/50 group-hover:bg-[var(--nimia-crimson)]/10">
              <Icon className="h-5 w-5 text-[var(--nimia-pink)]" strokeWidth={1.5} aria-hidden="true" />
            </div>
            <span className="text-sm font-semibold">{label}</span>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}
