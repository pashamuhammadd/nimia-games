"use client";

// Abstract, non-literal visuals for each Services card (29 Juli 2026 brief:
// no gameplay previews, no screenshots, no big mockups — cards should stay
// visually interesting on their own). Pure CSS/SVG, no images. All motion
// here uses Tailwind's `motion-safe:` variant, which already wraps the
// utility in `@media (prefers-reduced-motion: no-preference)` — so users
// with reduced motion enabled simply get the static frame, no extra
// media-query bookkeeping needed (unlike `.nimia-hero-mark`, which predates
// this pattern and does its own explicit `@media` override).
//
// Keyframes (`nimia-drift-slow`, `nimia-particle-float`, `nimia-grid-pulse`)
// live in app/globals.css, right after the existing `.nimia-cta-gradient`
// block.

export function AnimationVisual() {
  const particles = [
    { top: "20%", left: "18%", delay: "0s" },
    { top: "62%", left: "34%", delay: "0.6s" },
    { top: "34%", left: "68%", delay: "1.1s" },
    { top: "72%", left: "80%", delay: "0.3s" },
  ];

  return (
    <div className="relative h-full w-full">
      <div
        aria-hidden="true"
        className="motion-safe:animate-[nimia-drift-slow_9s_ease-in-out_infinite] absolute -left-8 -top-8 h-32 w-32 rounded-full bg-[var(--nimia-crimson)]/25 blur-2xl"
      />
      <div
        aria-hidden="true"
        className="motion-safe:animate-[nimia-drift-slow_11s_ease-in-out_infinite_reverse] absolute -bottom-10 -right-6 h-28 w-28 rounded-full bg-[var(--nimia-pink)]/20 blur-2xl"
      />
      <svg
        aria-hidden="true"
        viewBox="0 0 200 120"
        className="absolute inset-0 h-full w-full opacity-70"
        fill="none"
      >
        <defs>
          <linearGradient id="nimia-anim-line" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--nimia-crimson)" />
            <stop offset="100%" stopColor="var(--nimia-pink)" />
          </linearGradient>
        </defs>
        <path
          d="M10,90 C55,20 90,110 140,45 C160,20 175,15 190,25"
          stroke="url(#nimia-anim-line)"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <path
          d="M15,55 C60,95 95,15 150,70 C165,85 175,90 188,80"
          stroke="url(#nimia-anim-line)"
          strokeWidth="1"
          strokeLinecap="round"
          opacity="0.45"
        />
      </svg>
      {particles.map((p, i) => (
        <span
          key={i}
          aria-hidden="true"
          style={{ top: p.top, left: p.left, animationDelay: p.delay }}
          className="motion-safe:animate-[nimia-particle-float_4s_ease-in-out_infinite] absolute h-1.5 w-1.5 rounded-full bg-[var(--nimia-pink)]/80"
        />
      ))}
    </div>
  );
}

export function GameDevVisual() {
  return (
    <div className="relative h-full w-full overflow-hidden [perspective:400px]">
      {/* Futuristic floor grid, faked with a rotated background-image
          rather than a real 3D scene — cheap, static-safe, and reads as
          "game engine viewport" without claiming any specific engine. */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-1/3 h-24 origin-top [transform:rotateX(62deg)]"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(255,77,141,0.35) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,77,141,0.35) 1px, transparent 1px)",
          backgroundSize: "18px 18px",
          maskImage: "linear-gradient(to bottom, black, transparent)",
          WebkitMaskImage: "linear-gradient(to bottom, black, transparent)",
        }}
      />
      <div
        aria-hidden="true"
        className="motion-safe:animate-[nimia-grid-pulse_5s_ease-in-out_infinite] absolute left-1/2 top-1/3 h-px w-2/3 -translate-x-1/2 bg-gradient-to-r from-transparent via-[var(--nimia-pink)] to-transparent"
      />
      <div
        aria-hidden="true"
        className="absolute left-1/2 top-1/3 h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--nimia-crimson)]/30 blur-2xl"
      />
    </div>
  );
}

export function WebsiteVisual() {
  return (
    <div className="relative h-full w-full">
      {/* Two offset "glass panels" standing in for an abstract UI, plus a
          rotated outline square for the "geometry" note in the brief. */}
      <div
        aria-hidden="true"
        className="absolute left-[8%] top-[16%] h-20 w-[62%] -rotate-3 rounded-xl border border-white/10 bg-white/[0.04] backdrop-blur-sm"
      />
      <div
        aria-hidden="true"
        className="absolute bottom-[12%] right-[8%] h-24 w-[58%] rotate-2 rounded-xl border border-[var(--nimia-crimson)]/25 bg-white/[0.06] backdrop-blur-sm"
      >
        <div className="flex h-full flex-col justify-center gap-2 px-4">
          <span className="h-1.5 w-2/3 rounded-full bg-white/20" />
          <span className="h-1.5 w-1/2 rounded-full bg-white/10" />
          <span className="mt-1 h-4 w-14 rounded-full bg-[var(--nimia-crimson)]/40" />
        </div>
      </div>
      <div
        aria-hidden="true"
        className="motion-safe:animate-[nimia-drift-slow_10s_ease-in-out_infinite] absolute right-[16%] top-[10%] h-10 w-10 rotate-12 rounded-lg border border-[var(--nimia-pink)]/30"
      />
    </div>
  );
}
