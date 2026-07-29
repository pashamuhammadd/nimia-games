"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";
import { CORE_SERVICES } from "../data";
import { CoreServiceCard } from "./CoreServiceCard";

// SECTION 2 — Core Services. The main focus of the page: exactly 3 services,
// one row on desktop (lg:grid-cols-3), single column on mobile, all cards
// the same height via lg:auto-rows-fr.
export function CoreServicesSection() {
  const shouldReduceMotion = useReducedMotion();

  const headingContainer: Variants = {
    hidden: {},
    visible: {
      transition: { staggerChildren: shouldReduceMotion ? 0 : 0.12, delayChildren: 0.05 },
    },
  };
  const headingItem: Variants = {
    hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } },
  };

  const cardContainer: Variants = {
    hidden: {},
    visible: {
      transition: { staggerChildren: shouldReduceMotion ? 0 : 0.12, delayChildren: 0.1 },
    },
  };
  const cardItem: Variants = {
    hidden: {
      opacity: 0,
      y: shouldReduceMotion ? 0 : 28,
      filter: shouldReduceMotion ? "blur(0px)" : "blur(8px)",
    },
    visible: {
      opacity: 1,
      y: 0,
      filter: "blur(0px)",
      transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] },
    },
  };

  return (
    <section id="core-services" className="relative scroll-mt-20 overflow-hidden px-4 py-20 sm:px-6 sm:py-28">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-0 h-[34rem] w-[34rem] -translate-x-1/2 rounded-full bg-[var(--nimia-crimson)]/15 blur-[140px]"
      />

      <motion.div
        variants={headingContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        className="relative mx-auto max-w-3xl text-center"
      >
        <motion.span
          variants={headingItem}
          className="inline-block rounded-full border border-[var(--nimia-crimson)]/30 bg-[var(--nimia-crimson)]/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--nimia-pink)]"
        >
          What We Offer
        </motion.span>
        <motion.h2
          variants={headingItem}
          className="nimia-font-display mt-5 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl"
        >
          Three Disciplines. One Studio.
        </motion.h2>
        <motion.p
          variants={headingItem}
          className="mx-auto mt-5 max-w-2xl text-lg text-[var(--nimia-muted)]"
        >
          Every project we take on falls into one of three core services.
          Pick a starting point below, or scroll further to see everything
          each one covers.
        </motion.p>
      </motion.div>

      <motion.div
        variants={cardContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        className="relative mx-auto mt-16 grid max-w-6xl gap-6 sm:mt-20 lg:auto-rows-fr lg:grid-cols-3 lg:gap-8"
      >
        {CORE_SERVICES.map((service) => (
          <motion.div key={service.id} variants={cardItem} className="h-full">
            <CoreServiceCard
              title={service.title}
              badge={service.badge}
              price={service.price}
              description={service.description}
              icon={service.icon}
              href={`#${service.id}`}
            />
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}
