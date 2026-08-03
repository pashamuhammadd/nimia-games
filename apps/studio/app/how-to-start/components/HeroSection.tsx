"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { buttonVariants, cn } from "@nimia/ui";
import { SERVICES_HREF } from "../data";
import { StartProjectButton } from "../../components/StartProjectButton";

// SECTION 1 — Hero. Same ambient-glow + faint-grid visual language as the
// other public pages' heroes (HeroSection.tsx on /services, HeroHeadline.tsx
// on /why-nimia) so this reads as the same site. Two CTAs per the brief:
// "Start a Project" (primary, matches the navbar's own CTA styling and
// target) and "View Services" (secondary, sends undecided visitors to
// /services instead of bouncing them straight to the order form).
//
// "Start a Project" now uses StartProjectButton (3 Agustus 2026, per user
// request — modal login sitewide) instead of a plain Link, so a
// signed-out visitor gets the quick LoginModal in place instead of
// navigating to /login.
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
          Getting Started
        </motion.span>

        <motion.h1
          variants={item}
          className="nimia-font-display mt-6 text-4xl font-bold leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl"
        >
          How to Start Your Project
        </motion.h1>

        <motion.p
          variants={item}
          className="mx-auto mt-6 max-w-2xl text-lg text-[var(--nimia-muted)] sm:text-xl"
        >
          Working with Nimia Studio is simple, transparent, and flexible.
          From submitting your project to delivery, every step is designed
          to make collaboration smooth and professional.
        </motion.p>

        <motion.div variants={item} className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <StartProjectButton
            isAuthenticated={isAuthenticated}
            className={cn(
              buttonVariants({ size: "lg" }),
              "group gap-2 bg-[var(--nimia-crimson)] text-white hover:bg-[var(--nimia-crimson-hover)]",
            )}
          >
            Start a Project
            <ArrowRight
              className="h-4 w-4 transition-transform group-hover:translate-x-1"
              aria-hidden="true"
            />
          </StartProjectButton>
          <Link
            href={SERVICES_HREF}
            className={cn(
              buttonVariants({ variant: "outline", size: "lg" }),
              "border-[var(--foreground)]/30 hover:border-[var(--nimia-pink)]/70 hover:bg-[var(--nimia-surface-hover)]",
            )}
          >
            View Services
          </Link>
        </motion.div>
      </motion.div>
    </section>
  );
}
