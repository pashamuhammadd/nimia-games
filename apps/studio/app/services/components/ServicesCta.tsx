"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { StartProjectButton } from "../../components/StartProjectButton";

// SECTION 7 — Closing CTA. Per brief this is the one section on the page
// with a solid red background (every other section sits on the page's dark
// base with only glow accents) — a deliberate final beat of color before
// the footer. Text/button switch to a light-on-red pairing for contrast
// instead of reusing the dark-surface button styles used elsewhere on this
// page.
//
// Now uses StartProjectButton (3 Agustus 2026, per user request — modal
// login sitewide) instead of a plain <a href={ORDER_HREF}>, so a
// signed-out visitor gets the quick LoginModal in place instead of
// navigating to /login.
export function ServicesCta({ isAuthenticated }: { isAuthenticated: boolean }) {
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
      {/* Faint grid + glow, same visual language as the rest of the page,
          just re-tinted for a red background instead of the dark one. */}
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
          Let&apos;s Build Something Amazing Together
        </h2>
        <p className="mx-auto mt-5 max-w-2xl text-white/85 sm:text-lg">
          Whether you&apos;re building a game, creating an animation, or
          launching a website, our team is ready to bring your vision to
          life.
        </p>
        <div className="mt-9">
          <StartProjectButton
            isAuthenticated={isAuthenticated}
            className="group inline-flex items-center gap-2 rounded-lg bg-white px-8 py-4 text-base font-semibold text-[var(--nimia-crimson)] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] transition-transform hover:scale-[1.03]"
          >
            Start Your Project
            <ArrowRight
              className="h-4 w-4 transition-transform group-hover:translate-x-1"
              aria-hidden="true"
            />
          </StartProjectButton>
        </div>
      </motion.div>
    </section>
  );
}
