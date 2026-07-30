"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const STEP_DURATION_MS = 5000;
const TICK_MS = 40;

// Drives the "product tour" carousel in JourneyTimeline.tsx: which step is
// active, how far the current step's Instagram-story-style progress
// segment has filled (0..1), and navigation (next/prev/jump). Pull out of
// the component so the timing logic can be reasoned about on its own.
//
// Implementation note: a single `elapsedRef` (not per-step) is shared
// between the ticking interval and the manual-nav functions. Manual
// navigation just resets that ref to 0 — it does NOT need to also touch
// the interval itself, since the interval reads the ref fresh on every
// tick regardless of which step is active. Pausing (hover) clears the
// interval via the effect's cleanup and simply stops ticking; `elapsedRef`
// keeps whatever value it had, so resuming continues from exactly where it
// left off instead of restarting the step from zero.
export function useStoryAutoplay(stepCount: number, enabled: boolean) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [direction, setDirection] = useState<1 | -1>(1);
  const elapsedRef = useRef(0);

  const goToIndex = useCallback(
    (target: number) => {
      const normalized = ((target % stepCount) + stepCount) % stepCount;
      elapsedRef.current = 0;
      setProgress(0);
      setActiveIndex((current) => {
        setDirection(normalized >= current ? 1 : -1);
        return normalized;
      });
    },
    [stepCount],
  );

  const goNext = useCallback(() => {
    elapsedRef.current = 0;
    setProgress(0);
    setDirection(1);
    setActiveIndex((i) => (i + 1) % stepCount);
  }, [stepCount]);

  const goPrev = useCallback(() => {
    elapsedRef.current = 0;
    setProgress(0);
    setDirection(-1);
    setActiveIndex((i) => (i - 1 + stepCount) % stepCount);
  }, [stepCount]);

  useEffect(() => {
    if (!enabled || isPaused) return;

    const interval = setInterval(() => {
      elapsedRef.current += TICK_MS;
      const ratio = Math.min(1, elapsedRef.current / STEP_DURATION_MS);
      setProgress(ratio);

      if (ratio >= 1) {
        elapsedRef.current = 0;
        setProgress(0);
        setDirection(1);
        setActiveIndex((i) => (i + 1) % stepCount);
      }
    }, TICK_MS);

    return () => clearInterval(interval);
  }, [enabled, isPaused, stepCount]);

  return {
    activeIndex,
    progress,
    isPaused,
    setIsPaused,
    direction,
    goNext,
    goPrev,
    goToIndex,
    durationMs: STEP_DURATION_MS,
  };
}
