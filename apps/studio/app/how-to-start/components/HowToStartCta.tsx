"use client";

import Link from "next/link";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { cn } from "@nimia/ui";
import { SERVICES_HREF } from "../data";
import { StartProjectButton } from "../../components/StartProjectButton";

// SECTION 5 (final) — Closing CTA. Same solid-red treatment as the closing
// CTA on /services and /portfolio (ServicesCta.tsx / PortfolioCta.tsx) so
// every public page's "final beat" reads as one consistent pattern. Two
// buttons per the brief: "Start a Project" (white, matches the other pages'
// primary closing CTA) and a secondary "Explore Services" (outline on red,
// no page yet closes with a secondary CTA, but this page's Hero already
// established the Start a Project / View Services pairing, so the closing
// section repeats it instead of introducing a third label).
//
// "Start a Project" now uses StartProjectButton (3 Agustus 2026, per user
// request — modal login sitewide) instead of a plain Link, so a
// signed-out visitor gets the quick LoginModal in place instead of
// navigating to /login.
export function HowToStartCta({ isAuthenticated }: { isAuthenticated: boolean }) {
  const shouldReduceMotion = useReducedMotion();

  const fadeUp: Variants = {
    hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 24 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] } },
  };

  return (
    <section
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
          Let&apos;s Bring Your Vision to Life
        </h2>
        <p className="mx-auto mt-5 max-w-2xl text-white/85 sm:text-lg">
          Start your project today and receive a personalized quotation
          from our team.
        </p>
        <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <StartProjectButton
            isAuthenticated={isAuthenticated}
            className="group inline-flex items-center gap-2 rounded-lg bg-white px-8 py-4 text-base font-semibold text-[var(--nimia-crimson)] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] transition-transform hover:scale-[1.03]"
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
              "inline-flex items-center gap-2 rounded-lg border border-white/40 px-8 py-4 text-base font-semibold text-white transition-colors hover:bg-white/10",
            )}
          >
            Explore Services
          </Link>
        </div>
      </motion.div>
    </section>
  );
}
