"use client";

import { useEffect, useRef } from "react";
import { Check } from "lucide-react";
import { cn } from "@nimia/ui";
import type { JourneyStep } from "../data";

// Horizontal stepper: circle + number + short label per step, connected by
// a line that fills solid up to the active step (binary per-segment state,
// NOT time-animated — that's what StoryProgressBar above it is for). Fully
// clickable: clicking any circle jumps the tour straight to that step.
//
// Desktop: stretches evenly across the available width (no scroll needed,
// 7 items). Mobile: horizontally scrollable (per brief — "roadmap tetap
// horizontal dan dapat di-scroll secara halus") with the active step
// auto-scrolled into view so autoplay doesn't drift the current step off
// screen while the visitor isn't touching it.
//
// Fixed 30 Juli 2026 (bug report: opening /how-to-start landed scrolled
// past the Hero straight into this section instead of at the top of the
// page). The old implementation called `button.scrollIntoView({ block:
// "nearest", inline: "center" })` — scrollIntoView walks up EVERY
// scrollable ancestor, not just the intended horizontal mobile strip, so
// on first mount (roadmap still below the fold) it also dragged the whole
// page/window down to satisfy `block: "nearest"` for the vertical axis.
// This now scrolls ONLY the horizontal strip's own scroll container
// (`containerRef`, computed via getBoundingClientRect deltas so it never
// touches window/document scroll), so selecting or autoplaying to a step
// can, at most, shift the roadmap sideways — it can no longer move the
// page vertically.
export function RoadmapNav({
  steps,
  activeIndex,
  onSelect,
}: {
  steps: JourneyStep[];
  activeIndex: number;
  onSelect: (index: number) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    const container = containerRef.current;
    const button = buttonRefs.current[activeIndex];
    if (!container || !button) return;

    const containerRect = container.getBoundingClientRect();
    const buttonRect = button.getBoundingClientRect();
    const delta =
      buttonRect.left + buttonRect.width / 2 - (containerRect.left + containerRect.width / 2);
    const maxScrollLeft = Math.max(container.scrollWidth - container.clientWidth, 0);
    const targetScrollLeft = Math.min(Math.max(container.scrollLeft + delta, 0), maxScrollLeft);

    container.scrollTo({ left: targetScrollLeft, behavior: "smooth" });
  }, [activeIndex]);

  return (
    <div
      ref={containerRef}
      className="nimia-no-scrollbar -mx-4 overflow-x-auto px-4 sm:mx-0 sm:overflow-visible sm:px-0"
    >
      <div className="mx-auto flex min-w-max items-start sm:min-w-0 sm:max-w-5xl">
        {steps.map((step, i) => {
          const isDone = i < activeIndex;
          const isActive = i === activeIndex;

          return (
            <div key={step.number} className="flex flex-1 items-start">
              <button
                ref={(el: HTMLButtonElement | null) => {
                  buttonRefs.current[i] = el;
                }}
                type="button"
                onClick={() => onSelect(i)}
                aria-current={isActive ? "step" : undefined}
                aria-label={`Go to step ${i + 1}: ${step.title}`}
                className="group flex w-[76px] shrink-0 flex-col items-center gap-2 sm:w-auto sm:flex-1"
              >
                <span
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-xs font-bold transition-all duration-300 ease-out",
                    isActive
                      ? "scale-110 border-transparent bg-gradient-to-br from-[var(--nimia-crimson)] to-[var(--nimia-pink)] text-white shadow-[0_8px_22px_-6px_rgba(193,18,77,0.65)]"
                      : isDone
                        ? "border-[var(--nimia-crimson)]/40 bg-[var(--nimia-crimson)]/15 text-[var(--nimia-pink)]"
                        : "border-white/15 bg-white/[0.03] text-[var(--nimia-muted)] group-hover:border-white/30 group-hover:text-[var(--foreground)]/70",
                  )}
                >
                  {isDone ? <Check className="h-4 w-4" aria-hidden="true" /> : i + 1}
                </span>
                <span
                  className={cn(
                    "whitespace-nowrap text-center text-[11px] font-medium leading-tight transition-colors duration-300 sm:text-xs",
                    isActive
                      ? "text-[var(--foreground)]"
                      : "text-[var(--nimia-muted)] group-hover:text-[var(--foreground)]/80",
                  )}
                >
                  {step.shortLabel}
                </span>
              </button>

              {i < steps.length - 1 ? (
                <span
                  aria-hidden="true"
                  className={cn(
                    "mt-[18px] h-px w-6 shrink-0 transition-colors duration-500 ease-out sm:w-auto sm:flex-1",
                    isDone
                      ? "bg-gradient-to-r from-[var(--nimia-crimson)] to-[var(--nimia-pink)]"
                      : "bg-white/10",
                  )}
                />
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
