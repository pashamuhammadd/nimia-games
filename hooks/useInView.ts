"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Tracks whether an element is currently visible in the viewport.
 * Used to avoid autoplaying/loading heavy media (e.g. gallery videos)
 * until they actually scroll into view.
 */
export function useInView<T extends HTMLElement = HTMLDivElement>(
  threshold = 0.25
) {
  const ref = useRef<T | null>(null);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => setIsInView(entry.isIntersecting),
      { threshold }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return { ref, isInView } as const;
}
