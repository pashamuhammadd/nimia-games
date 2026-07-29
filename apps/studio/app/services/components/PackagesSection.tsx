"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { FEATURED_PACKAGES, ORDER_HREF } from "../data";

// SECTION 6 — Featured Packages. Bundled offers, each showing just name,
// short description, starting price, and a "View Details" CTA — kept
// intentionally lighter than the Section 2 cards (no icon/badge slot) since
// these are meant to read as a secondary, "if you want it pre-scoped"
// option rather than compete with the 3 core services above.
export function PackagesSection() {
  const shouldReduceMotion = useReducedMotion();

  const container: Variants = {
    hidden: {},
    visible: {
      transition: { staggerChildren: shouldReduceMotion ? 0 : 0.1, delayChildren: 0.1 },
    },
  };
  const card: Variants = {
    hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 22 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } },
  };

  return (
    <section className="relative px-4 py-20 sm:px-6 sm:py-28">
      <div className="mx-auto max-w-3xl text-center">
        <span className="inline-block rounded-full border border-[var(--nimia-crimson)]/30 bg-[var(--nimia-crimson)]/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--nimia-pink)]">
          Popular Bundles
        </span>
        <h2 className="nimia-font-display mt-5 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
          Featured Packages
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-[var(--nimia-muted)]">
          Pre-scoped bundles for common project types. Not sure which one
          fits? A custom quote is always available too.
        </p>
      </div>

      <motion.div
        variants={container}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        className="mx-auto mt-14 grid max-w-5xl gap-6 sm:mt-16 lg:auto-rows-fr lg:grid-cols-3 lg:gap-7"
      >
        {FEATURED_PACKAGES.map((pkg) => (
          <motion.a
            key={pkg.name}
            href={ORDER_HREF}
            variants={card}
            className="group relative flex h-full flex-col rounded-2xl border border-white/10 bg-white/[0.03] p-7 transition-all duration-300 ease-out hover:-translate-y-1.5 hover:border-[var(--nimia-crimson)]/40 hover:bg-white/[0.05]"
          >
            <h3 className="nimia-font-display text-xl font-bold">{pkg.name}</h3>
            <p className="mt-3 flex-1 text-sm leading-relaxed text-[var(--nimia-muted)]">
              {pkg.description}
            </p>
            <div className="mt-6">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--nimia-muted)]">
                Starting from
              </p>
              <p className="nimia-font-display mt-1 text-2xl font-bold">{pkg.price}</p>
            </div>
            <div className="mt-6 flex items-center gap-2 text-sm font-semibold text-[var(--nimia-pink)]">
              <span className="transition-transform duration-300 ease-out group-hover:translate-x-1.5">
                View Details
              </span>
              <ArrowRight
                className="h-4 w-4 transition-transform duration-300 ease-out group-hover:translate-x-1.5"
                aria-hidden="true"
              />
            </div>
          </motion.a>
        ))}
      </motion.div>
    </section>
  );
}
