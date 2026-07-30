"use client";

import { motion, AnimatePresence, useReducedMotion, type Variants } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@nimia/ui";
import { JOURNEY_STEPS } from "../data";
import { JourneyStepCard } from "./JourneyStepCard";
import { StoryProgressBar } from "./StoryProgressBar";
import { RoadmapNav } from "./RoadmapNav";
import { useStoryAutoplay } from "./useStoryAutoplay";

// SECTION 2 — "Your Journey with Nimia". Rebuilt (30 Juli 2026, second
// brief) from a show-all-7-steps-at-once horizontal/vertical timeline into
// a single-active-step "product tour" carousel — Apple/Stripe/Linear/Arc/
// Vercel/Framer style: one step reads at a time, everything else is just a
// roadmap up top. No content was removed in this rebuild; JourneyStepCard
// still renders every field a step can carry (title, full description,
// badge, flow diagram, checklist, chips) exactly as before, just inside a
// single large centered card instead of a small grid tile.
//
// Autoplay: 5s per step, loops forever, pauses on hover over the whole
// tour region (roadmap + card + controls), and any manual navigation
// (roadmap circle / dot / prev / next) restarts the 5s timer for the step
// it lands on rather than stopping autoplay outright — see
// useStoryAutoplay.ts for the timing implementation.
export function JourneyTimeline() {
  const shouldReduceMotion = useReducedMotion();
  const stepCount = JOURNEY_STEPS.length;

  // Autoplay is disabled outright (not just slowed) when the visitor
  // prefers reduced motion — a self-advancing carousel is exactly the kind
  // of motion that preference exists to suppress. Manual prev/next/dot
  // navigation still works either way.
  const { activeIndex, progress, isPaused, setIsPaused, direction, goNext, goPrev, goToIndex } =
    useStoryAutoplay(stepCount, !shouldReduceMotion);

  const activeStep = JOURNEY_STEPS[activeIndex];

  const cardVariants: Variants = {
    enter: (dir: 1 | -1) => ({
      opacity: 0,
      y: shouldReduceMotion ? 0 : dir === 1 ? 24 : -24,
      scale: shouldReduceMotion ? 1 : 0.97,
    }),
    center: { opacity: 1, y: 0, scale: 1 },
    exit: (dir: 1 | -1) => ({
      opacity: 0,
      y: shouldReduceMotion ? 0 : dir === 1 ? -24 : 24,
      scale: shouldReduceMotion ? 1 : 0.97,
    }),
  };

  return (
    <section className="relative overflow-hidden px-4 py-20 sm:px-6 sm:py-28">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-0 h-[36rem] w-[36rem] -translate-x-1/2 rounded-full bg-[var(--nimia-crimson)]/15 blur-[140px]"
      />

      <div className="relative mx-auto max-w-3xl text-center">
        <span className="inline-block rounded-full border border-[var(--nimia-crimson)]/30 bg-[var(--nimia-crimson)]/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--nimia-pink)]">
          The Process
        </span>
        <h2 className="nimia-font-display mt-5 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
          Your Journey with Nimia
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-[var(--nimia-muted)]">
          Simple. Transparent. Professional.
        </p>
      </div>

      {/* Hover anywhere in this region (roadmap, active card, or the
          prev/next/dot controls) pauses autoplay; leaving resumes it from
          exactly where it left off. */}
      <div
        className="relative mx-auto mt-14 max-w-5xl sm:mt-16"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        <StoryProgressBar count={stepCount} activeIndex={activeIndex} progress={progress} />

        <div className="mt-6 sm:mt-7">
          <RoadmapNav steps={JOURNEY_STEPS} activeIndex={activeIndex} onSelect={goToIndex} />
        </div>

        <div className="relative mt-10 min-h-[520px] sm:mt-12 sm:min-h-[480px]">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={activeStep.number}
              custom={direction}
              variants={cardVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: shouldReduceMotion ? 0.15 : 0.6, ease: [0.16, 1, 0.3, 1] }}
            >
              <JourneyStepCard step={activeStep} />
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="mt-8 flex items-center justify-center gap-5 sm:mt-10 sm:gap-8">
          <button
            type="button"
            onClick={goPrev}
            className="group flex items-center gap-1.5 text-sm font-semibold text-[var(--nimia-muted)] transition-colors hover:text-[var(--foreground)]"
          >
            <ChevronLeft
              className="h-4 w-4 transition-transform group-hover:-translate-x-0.5"
              aria-hidden="true"
            />
            Previous
          </button>

          <div className="flex items-center gap-2">
            {JOURNEY_STEPS.map((step, i) => (
              <button
                key={step.number}
                type="button"
                onClick={() => goToIndex(i)}
                aria-label={`Go to step ${i + 1}: ${step.title}`}
                aria-current={i === activeIndex ? "step" : undefined}
                className="p-1"
              >
                <span
                  className={cn(
                    "block rounded-full transition-all duration-300 ease-out",
                    i === activeIndex
                      ? "h-2 w-6 bg-gradient-to-r from-[var(--nimia-crimson)] to-[var(--nimia-pink)]"
                      : "h-2 w-2 bg-white/20 hover:bg-white/40",
                  )}
                />
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={goNext}
            className="group flex items-center gap-1.5 text-sm font-semibold text-[var(--nimia-muted)] transition-colors hover:text-[var(--foreground)]"
          >
            Next
            <ChevronRight
              className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
              aria-hidden="true"
            />
          </button>
        </div>
      </div>
    </section>
  );
}
