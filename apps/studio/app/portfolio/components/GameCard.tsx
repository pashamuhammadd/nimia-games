"use client";

import type { CSSProperties } from "react";
import { ArrowRight, ExternalLink, Gamepad2 } from "lucide-react";
import type { FeaturedGame } from "../data";

// Per-status visual theme (30 Juli 2026, second design pass on this
// section — user sent an exact reference mockup and asked to match it
// pixel-for-pixel). Each game's STATUS now drives its own accent color
// across border/glow/category/tag-icons/CTA, the way individual titles
// get their own identity on a real storefront product page (Steam/Epic),
// while shared chrome elsewhere on the page (badge dot pattern, footer,
// section header) stays on the site's crimson/pink brand. "Playable"
// games get the bolder gradient primary CTA — there's something to
// actually click into right now. "In Development" games get a calmer
// secondary-style CTA — there's less to do yet, so the ask is softer
// ("learn more" instead of "go do this now").
const STATUS_THEME: Record<
  FeaturedGame["status"],
  {
    badge: string;
    border: string;
    glow: string;
    category: string;
    tagIcon: string;
    secondaryLink: string;
    primaryButtonClassName: string;
    primaryButtonStyle?: CSSProperties;
  }
> = {
  "In Development": {
    badge: "border-amber-400/30 bg-amber-400/10 text-amber-300",
    border: "hover:border-amber-400/50",
    glow: "rgba(245,158,11,0.16)",
    category: "text-amber-300",
    tagIcon: "text-amber-300",
    secondaryLink: "text-amber-300 hover:text-amber-200",
    primaryButtonClassName:
      "border border-white/10 bg-white/[0.08] text-white hover:bg-white/[0.14]",
  },
  Playable: {
    badge: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
    border: "hover:border-violet-400/50",
    glow: "rgba(139,92,246,0.18)",
    category: "text-violet-300",
    tagIcon: "text-violet-300",
    secondaryLink: "text-violet-300 hover:text-violet-200",
    primaryButtonClassName: "text-white shadow-[0_15px_40px_-12px_rgba(139,92,246,0.55)]",
    primaryButtonStyle: {
      backgroundImage: "linear-gradient(135deg, #8b5cf6 0%, var(--nimia-crimson) 100%)",
    },
  },
};

// Featured Games card, redesigned (30 Juli 2026, second pass) to match an
// exact reference mockup the user provided: icon top-left + status badge
// top-right, title, colored genre line, description, a row of feature
// chips (icon + label) bracketed by thin dividers, then a primary CTA
// button and a lighter "Official Website" link side by side at the
// bottom. The card is no longer a single big `<a>` (the reference shows
// two distinct clickable controls at the bottom, and nesting an `<a>`
// inside an `<a>` isn't valid HTML) — it's a `<div className="group">`
// instead, with the two CTAs as separate links. Hover treatment (lift,
// border, glow, icon scale, CTA nudge) still triggers off the card as a
// whole via :hover / group-hover, matching the original brief's hover
// spec even though the clickable surface changed.
export function GameCard({ game }: { game: FeaturedGame }) {
  const theme = STATUS_THEME[game.status];

  return (
    <div
      className={`group relative flex h-full min-h-[500px] flex-col overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-8 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.7)] backdrop-blur-sm transition-all duration-300 ease-out hover:-translate-y-2 hover:shadow-[0_40px_100px_-25px_rgba(0,0,0,0.55)] sm:min-h-[540px] sm:p-10 ${theme.border}`}
    >
      {/* Hover-only glow wash, purely decorative, color matches this game's status theme */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 ease-out group-hover:opacity-100"
        style={{
          background: `radial-gradient(circle at 15% 0%, ${theme.glow}, transparent 60%)`,
        }}
      />

      <div className="relative flex items-start justify-between gap-4">
        {game.iconSrc ? (
          // eslint-disable-next-line @next/next/no-img-element -- user-supplied
          // game icon asset (see data.ts).
          <img
            src={game.iconSrc}
            alt=""
            className="h-28 w-28 shrink-0 rounded-2xl border border-white/10 object-cover transition-transform duration-300 ease-out group-hover:scale-110 sm:h-32 sm:w-32"
          />
        ) : (
          // Placeholder tile if a future game is added before its icon
          // asset is ready — swap by setting `iconSrc` in data.ts.
          <div className="flex h-28 w-28 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-br from-[var(--nimia-crimson)]/25 to-[var(--nimia-pink)]/10 transition-transform duration-300 ease-out group-hover:scale-110 sm:h-32 sm:w-32">
            <Gamepad2
              className="h-11 w-11 text-[var(--nimia-pink)] sm:h-12 sm:w-12"
              strokeWidth={1.5}
              aria-hidden="true"
            />
          </div>
        )}

        <span
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-wide ${theme.badge}`}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
          {game.status}
        </span>
      </div>

      <h3 className="nimia-font-display relative mt-6 text-2xl font-bold sm:text-[28px]">
        {game.name}
      </h3>
      <p className={`relative mt-1.5 text-sm font-semibold ${theme.category}`}>{game.category}</p>

      <p className="relative mt-4 flex-1 text-[15px] leading-relaxed text-[var(--nimia-muted)]">
        {game.description}
      </p>

      <div className="relative mt-6 flex flex-wrap items-center gap-x-5 gap-y-3 border-y border-white/10 py-5">
        {game.tags.map((tag) => (
          <span key={tag.label} className="inline-flex items-center gap-2 text-sm text-white/80">
            <tag.icon className={`h-4 w-4 ${theme.tagIcon}`} strokeWidth={1.75} aria-hidden="true" />
            {tag.label}
          </span>
        ))}
      </div>

      <div className="relative mt-6 flex flex-wrap items-center justify-between gap-4">
        <a
          href={game.href}
          target="_blank"
          rel="noopener noreferrer"
          className={`inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition-all duration-300 ease-out group-hover:translate-x-0.5 ${theme.primaryButtonClassName}`}
          style={theme.primaryButtonStyle}
        >
          {game.ctaLabel}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </a>

        <a
          href={game.websiteHref}
          target="_blank"
          rel="noopener noreferrer"
          className={`inline-flex items-center gap-1.5 text-sm font-semibold transition-colors duration-300 ${theme.secondaryLink}`}
        >
          Official Website
          <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
        </a>
      </div>
    </div>
  );
}
