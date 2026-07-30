"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { FULL_PORTFOLIO_URL } from "../data";

// SECTION 6 (final) — Closing CTA. Same solid-red treatment as the
// Services page's closing CTA (app/services/components/ServicesCta.tsx)
// so both pages' "final beat" sections read as one consistent pattern
// across the site — the one place per page where the background switches
// to full brand red instead of a glow accent on the dark base.
//
// Button copy changed (30 Juli 2026, third correction on this page):
// "Visit Portfolio" → "Explore 100+ Creative Works" — this is now the
// ONLY "go see the full portfolio" CTA on the page (the Featured Games
// section's own footer CTA, which duplicated this same idea with
// different copy, was removed).
//
// id="explore-portfolio" added (30 Juli 2026, fourth correction): the
// header's "View Full Portfolio" link now smooth-scrolls down to this
// section instead of navigating to the (not-yet-built)
// portfolio.nimiagames.com subdomain — see PortfolioHeader.tsx.
export function PortfolioCta() {
  const shouldReduceMotion = useReducedMotion();

  const fadeUp: Variants = {
    hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 24 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] } },
  };

  return (
    <section
      id="explore-portfolio"
      className="relative overflow-hidden px-4 py-24 sm:px-6 sm:py-32"
      style={{
        background:
          "linear-gradient(135deg, var(--nimia-crimson) 0%, #8a0f3d 55%, var(--nimia-maroon) 100%)",
      }}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.08]"
        style={{
          backgroundImage:
            "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          maskImage: "radial-gradient(ellipse 70% 70% at 50% 50%, black, transparent)",
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 h-[30rem] w-[30rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/10 blur-[140px]"
      />

      <motion.div
        variants={fadeUp}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        className="relative mx-auto max-w-3xl text-center"
      >
        <h2 className="nimia-font-display text-3xl font-bold tracking-tight text-white sm:text-5xl">
          Explore Our Complete Portfolio
        </h2>
        <p className="mx-auto mt-5 max-w-2xl text-white/85 sm:text-lg">
          Discover more animations, games, websites, and digital assets
          created by Nimia Studio.
        </p>
        <div className="mt-9">
          <a
            href={FULL_PORTFOLIO_URL}
            className="group inline-flex items-center gap-2 rounded-lg bg-white px-8 py-4 text-base font-semibold text-[var(--nimia-crimson)] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] transition-transform hover:scale-[1.03]"
          >
            Explore 100+ Creative Works
            <ArrowRight
              className="h-4 w-4 transition-transform group-hover:translate-x-1"
              aria-hidden="true"
            />
          </a>
        </div>
      </motion.div>
    </section>
  );
}
