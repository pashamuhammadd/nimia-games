"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { StartProjectButton } from "../../components/StartProjectButton";

// SECTION 1 — Hero. Kept close to the visual language already used by the
// homepage hero and Why Nimia's HeroHeadline.tsx (ambient glow blobs + a
// faint grid texture) so this page reads as the same site, not a bolted-on
// template. Per the 29 Juli 2026 brief this page is NOT a pricing or
// portfolio page, so the hero stays intentionally short: headline,
// subheadline, one CTA.
//
// The CTA used to smooth-scroll to Core Services (id="core-services")
// instead of leaving the page. Changed (per explicit user instruction) so
// every "Start Your Project" / "Start a Project" CTA across apps/studio
// goes straight to /order, the Project Configurator — this one included,
// even though it means a visitor no longer gets nudged to browse Core
// Services first before landing in the wizard.
//
// Now uses StartProjectButton (3 Agustus 2026, per user request — modal
// login sitewide) instead of a plain Link, so a signed-out visitor gets
// the quick LoginModal in place instead of navigating to /login.
export function HeroSection({ isAuthenticated }: { isAuthenticated: boolean }) {
  const shouldReduceMotion = useReducedMotion();

  const container = {
    hidden: {},
    visible: {
      transition: { staggerChildren: shouldReduceMotion ? 0 : 0.12, delayChildren: 0.05 },
    },
  };

  const item = {
    hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 22 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] as const },
    },
  };

  return (
    <section className="relative overflow-hidden px-4 pb-20 pt-20 sm:px-6 sm:pt-28">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-0 h-[36rem] w-[36rem] -translate-x-1/2 rounded-full bg-[var(--nimia-crimson)]/20 blur-[140px]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-32 -left-10 h-[26rem] w-[26rem] rounded-full bg-[var(--nimia-pink)]/10 blur-[120px]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            "linear-gradient(to right, var(--foreground) 1px, transparent 1px), linear-gradient(to bottom, var(--foreground) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
          maskImage: "radial-gradient(ellipse 60% 60% at 50% 0%, black, transparent)",
        }}
      />

      <motion.div
        variants={container}
        initial="hidden"
        animate="visible"
        className="relative mx-auto max-w-4xl text-center"
      >
        <motion.span
          variants={item}
          className="inline-block rounded-full border border-[var(--nimia-crimson)]/30 bg-[var(--nimia-crimson)]/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--nimia-pink)]"
        >
          Nimia Studio
        </motion.span>

        <motion.h1
          variants={item}
          className="nimia-font-display mt-6 text-4xl font-bold leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl"
        >
          Our Services
        </motion.h1>

        <motion.p
          variants={item}
          className="mx-auto mt-6 max-w-2xl text-lg text-[var(--nimia-muted)] sm:text-xl"
        >
          From animations and game development to modern websites, we help
          businesses, startups, and studios turn ideas into exceptional
          digital products.
        </motion.p>

        <motion.div variants={item} className="mt-10">
          <StartProjectButton
            isAuthenticated={isAuthenticated}
            className="nimia-cta-gradient group inline-flex items-center gap-2 rounded-lg px-8 py-4 text-base font-semibold text-white shadow-[0_20px_60px_-15px_rgba(193,18,77,0.55)] transition-transform hover:scale-[1.03]"
          >
            Start a Project
            <ArrowRight
              className="h-4 w-4 transition-transform group-hover:translate-x-1"
              aria-hidden="true"
            />
          </StartProjectButton>
        </motion.div>
      </motion.div>
    </section>
  );
}
