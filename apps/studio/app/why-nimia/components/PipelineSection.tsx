"use client";

import { useRef } from "react";
import {
  motion,
  useScroll,
  useSpring,
  useTransform,
  useReducedMotion,
  type Variants,
} from "framer-motion";

// AI Exploration is one of seven stages, not the whole pipeline. This is
// the concrete proof behind the page's core claim: AI is a tool Nimia uses
// well, inside a larger professional process.
const STEPS = [
  { label: "Idea", description: "Brief & references" },
  { label: "AI Exploration", description: "Rapid concept generation" },
  { label: "Creative Direction", description: "Senior art direction" },
  { label: "Production", description: "Full asset build" },
  { label: "Review", description: "Feedback & refinement" },
  { label: "Optimization", description: "Engine-ready technical pass" },
  { label: "Delivery", description: "Organized & documented" },
];

export function PipelineSection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const shouldReduceMotion = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start 0.8", "end 0.4"],
  });
  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 90,
    damping: 24,
    mass: 0.4,
  });
  const barScaleX = useTransform(smoothProgress, [0, 1], [0, 1]);

  const item: Variants = {
    hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 18, scale: shouldReduceMotion ? 1 : 0.94 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] },
    },
  };

  return (
    <section className="relative px-4 py-20 sm:px-6 sm:py-28">
      <div className="mx-auto max-w-4xl text-center">
        <span className="inline-block rounded-full border border-[var(--nimia-crimson)]/30 bg-[var(--nimia-crimson)]/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--nimia-pink)]">
          The Process
        </span>
        <h2 className="nimia-font-display mt-5 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
          AI is one step. Not the whole pipeline.
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-[var(--nimia-muted)]">
          Every project runs through the same seven stages, whether AI is
          involved in one of them or none at all.
        </p>
      </div>

      <div ref={containerRef} className="relative mx-auto mt-16 max-w-5xl">
        {/* Static track, desktop only */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-0 right-0 top-6 hidden h-px bg-[var(--nimia-border)] lg:block"
        />
        {/* Scroll-linked fill, tracks how far the visitor has scrolled through this section */}
        <motion.div
          aria-hidden="true"
          style={{ scaleX: barScaleX }}
          className="pointer-events-none absolute left-0 right-0 top-6 hidden h-px origin-left bg-gradient-to-r from-[var(--nimia-crimson)] to-[var(--nimia-pink)] lg:block"
        />

        <div className="flex flex-col gap-8 lg:grid lg:grid-cols-7 lg:gap-4">
          {STEPS.map((step, i) => (
            <motion.div
              key={step.label}
              variants={item}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-60px" }}
              transition={{ delay: shouldReduceMotion ? 0 : i * 0.09 }}
              className="relative flex flex-row items-start gap-4 text-left lg:flex-col lg:items-start lg:gap-0"
            >
              <span className="nimia-font-display relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[var(--nimia-crimson)]/40 bg-[var(--background)] text-sm font-bold">
                <span className="nimia-gradient-text">{String(i + 1).padStart(2, "0")}</span>
              </span>
              <div className="lg:mt-3">
                <p className="text-sm font-semibold sm:text-base">{step.label}</p>
                <p className="mt-1 text-xs text-[var(--nimia-muted)] sm:text-sm">
                  {step.description}
                </p>
                {step.label === "AI Exploration" ? (
                  <span className="mt-2 inline-block rounded-full border border-[var(--nimia-pink)]/30 bg-[var(--nimia-pink)]/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--nimia-pink)]">
                    Where AI helps
                  </span>
                ) : null}
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <p className="mx-auto mt-10 max-w-2xl text-center text-sm text-[var(--nimia-muted)]">
        One stage out of seven uses AI directly. The other six are what turn
        that output into something ready to ship.
      </p>
    </section>
  );
}
