"use client";

import Link from "next/link";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import { ArrowRight } from "lucide-react";

export function ClosingCta() {
  const shouldReduceMotion = useReducedMotion();

  const fadeUp: Variants = {
    hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 24 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] } },
  };

  return (
    <section className="relative overflow-hidden px-4 py-24 sm:px-6 sm:py-32">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 h-[30rem] w-[30rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--nimia-crimson)]/15 blur-[140px]"
      />

      <motion.div
        variants={fadeUp}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        className="relative mx-auto max-w-3xl text-center"
      >
        <h2 className="nimia-font-display text-3xl font-bold tracking-tight sm:text-5xl">
          AI Creates Possibilities.
          <br />
          <span className="nimia-gradient-text">Nimia Delivers Results.</span>
        </h2>
        <p className="mx-auto mt-5 max-w-2xl text-[var(--nimia-muted)] sm:text-lg">
          From concept to final delivery, we help studios build games,
          animations, and digital assets faster with AI-assisted production
          and experienced creative professionals.
        </p>
        <div className="mt-9">
          <Link
            href="/services"
            className="nimia-cta-gradient group inline-flex items-center gap-2 rounded-lg px-8 py-4 text-base font-semibold text-white shadow-[0_20px_60px_-15px_rgba(193,18,77,0.55)] transition-transform hover:scale-[1.03]"
          >
            Start Your Project
            <ArrowRight
              className="h-4 w-4 transition-transform group-hover:translate-x-1"
              aria-hidden="true"
            />
          </Link>
        </div>
      </motion.div>
    </section>
  );
}
