"use client";

import { useInView } from "@/hooks/useInView";

interface RevealProps {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}

/**
 * Generic "animate in when it appears" wrapper. Content already on screen
 * when a step mounts reveals itself almost immediately (the
 * IntersectionObserver's first callback fires right after mount); content
 * further down a scrollable screen reveals as it's scrolled into view.
 */
export default function Reveal({ children, delay = 0, className = "" }: RevealProps) {
  const { ref, isInView } = useInView<HTMLDivElement>(0.15);

  return (
    <div
      ref={ref}
      className={`nimia-reveal ${isInView ? "nimia-reveal-visible" : ""} ${className}`}
      style={{ transitionDelay: isInView ? `${delay}ms` : "0ms" }}
    >
      {children}
    </div>
  );
}
