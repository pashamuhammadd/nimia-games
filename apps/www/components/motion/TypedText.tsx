"use client";

import { useEffect, useState } from "react";

interface TypedTextSegment {
  text: string;
  accent?: boolean;
}

interface TypedTextProps {
  segments: TypedTextSegment[];
  /** ms between each character. */
  speed?: number;
  /** ms before typing starts, so it feels intentional on page load. */
  startDelay?: number;
}

/**
 * Types out `segments` character by character, then leaves a blinking
 * caret that fades out shortly after. Purely decorative — the caller is
 * expected to also render the full text in a `sr-only` element so
 * screen readers and crawlers always get the real content regardless of
 * whether JS runs. Respects `prefers-reduced-motion` by rendering the
 * full text immediately with no animation.
 */
export default function TypedText({
  segments,
  speed = 40,
  startDelay = 300,
}: TypedTextProps) {
  const fullText = segments.map((segment) => segment.text).join("");
  const [count, setCount] = useState(0);
  const [showCursor, setShowCursor] = useState(true);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (prefersReducedMotion) {
      setCount(fullText.length);
      setShowCursor(false);
      return;
    }

    let cancelled = false;
    let typeInterval: ReturnType<typeof setInterval> | undefined;
    let cursorTimeout: ReturnType<typeof setTimeout> | undefined;

    const startTimeout = setTimeout(() => {
      let i = 0;
      typeInterval = setInterval(() => {
        if (cancelled) return;
        i += 1;
        setCount(i);
        if (i >= fullText.length) {
          if (typeInterval) clearInterval(typeInterval);
          cursorTimeout = setTimeout(() => setShowCursor(false), 1800);
        }
      }, speed);
    }, startDelay);

    return () => {
      cancelled = true;
      clearTimeout(startTimeout);
      if (typeInterval) clearInterval(typeInterval);
      if (cursorTimeout) clearTimeout(cursorTimeout);
    };
  }, [fullText, speed, startDelay]);

  let remaining = count;

  return (
    <>
      {segments.map((segment, index) => {
        const take = Math.max(0, Math.min(segment.text.length, remaining));
        remaining -= take;
        const shown = segment.text.slice(0, take);

        return segment.accent ? (
          <span key={index} className="nimia-accent-text">
            {shown}
          </span>
        ) : (
          <span key={index}>{shown}</span>
        );
      })}
      <span
        aria-hidden
        className={`nimia-typed-cursor${showCursor ? "" : " nimia-typed-cursor-hidden"}`}
      />
    </>
  );
}
