"use client";

import * as React from "react";
import { useReducedMotion } from "framer-motion";
import { cn } from "@nimia/ui";

interface Segment {
  text: string;
  className?: string;
}

// Home hero redesign (10 Agustus 2026, per user brief — outcome-focused
// copy: "turn ideas into something extraordinary", not a services list).
// "Something Extraordinary." keeps its own gradient span exactly like
// "Digital Assets" did before it; the rest stays plain foreground text.
// Kept as data (not the caller's JSX) so the typing effect below can walk
// one combined character stream across both segments without caring where
// the gradient span starts/ends.
const SEGMENTS: Segment[] = [
  { text: "Turn Your Ideas Into ", className: "" },
  { text: "Something Extraordinary.", className: "nimia-gradient-text" },
];

const FULL_TEXT = SEGMENTS.map((s) => s.text).join("");
const TYPE_SPEED_MS = 45;
const START_DELAY_MS = 300;

// Home hero headline (3 Agustus 2026, per user request — the static
// headline felt passive; wanted a live-typing animation instead). Runs
// once per page load. A visitor with prefers-reduced-motion on
// (useReducedMotion — the same hook every other animated section on this
// site already uses) sees the full text immediately rather than watching
// it type out, consistent with how the rest of the site treats that
// preference.
export function TypedHeroHeadline() {
  const shouldReduceMotion = useReducedMotion();
  const [charCount, setCharCount] = React.useState(shouldReduceMotion ? FULL_TEXT.length : 0);

  React.useEffect(() => {
    if (shouldReduceMotion) return;

    let charIndex = 0;
    let typingInterval: ReturnType<typeof setInterval> | undefined;

    const startTimeout = setTimeout(() => {
      typingInterval = setInterval(() => {
        charIndex += 1;
        setCharCount(charIndex);
        if (charIndex >= FULL_TEXT.length && typingInterval) {
          clearInterval(typingInterval);
        }
      }, TYPE_SPEED_MS);
    }, START_DELAY_MS);

    return () => {
      clearTimeout(startTimeout);
      if (typingInterval) clearInterval(typingInterval);
    };
  }, [shouldReduceMotion]);

  const isDone = charCount >= FULL_TEXT.length;
  let remaining = charCount;

  return (
    <h1 className="nimia-font-display mt-5 text-5xl font-bold leading-[1.03] tracking-tight sm:text-6xl lg:text-7xl">
      {/* The typed spans are purely decorative — screen readers get the
          plain sr-only string below instead, so nothing is read twice. */}
      <span aria-hidden="true">
        {SEGMENTS.map((segment, index) => {
          const shown = segment.text.slice(0, Math.max(0, Math.min(segment.text.length, remaining)));
          remaining -= segment.text.length;
          return shown ? (
            <span key={index} className={segment.className || undefined}>
              {shown}
            </span>
          ) : null;
        })}
        {/* Blinking caret — CSS-driven (animate-pulse) rather than a second
            JS interval, and left visible even once typing finishes so the
            hero keeps a faint "live" heartbeat instead of going fully
            static again. */}
        <span
          className={cn(
            "ml-1 inline-block h-[0.85em] w-[3px] translate-y-[0.08em] animate-pulse bg-current align-middle",
            isDone ? "opacity-60" : "opacity-90",
          )}
        />
      </span>
      <span className="sr-only">{FULL_TEXT}</span>
    </h1>
  );
}
