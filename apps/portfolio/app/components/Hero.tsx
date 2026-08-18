"use client";

import { Play } from "lucide-react";
import { cn } from "@nimia/ui";
import type { PortfolioItem } from "../../lib/portfolio-types";
import { formatDuration, FORMAT_LABELS } from "../../lib/format";

interface HeroProps {
  featured: PortfolioItem | null;
  onOpen: (slug: string) => void;
}

// Editorial/cinematic hero (spec §5) — NOT a SaaS hero, no stat cards. Left
// column is eyebrow + heading + description + CTA; right column is one
// large featured work. If there's no featured/published item yet (empty
// library), the media panel gracefully collapses to just the text column
// rather than showing a broken placeholder.
export function Hero({ featured, onOpen }: HeroProps) {
  const duration = featured ? formatDuration(featured.durationSeconds) : null;

  return (
    <section className="mx-auto max-w-6xl px-4 pb-12 pt-14 sm:px-6 sm:pb-16 sm:pt-20">
      <div className={cn("grid gap-10", featured && "lg:grid-cols-2 lg:items-center lg:gap-14")}>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--nimia-pink)]">
            Selected Work
          </p>
          <h1 className="nimia-font-display mt-4 text-4xl font-bold leading-[1.05] text-white sm:text-5xl lg:text-6xl">
            Featured <span className="nimia-gradient-text">Work</span>
          </h1>
          <p className="mt-5 max-w-md text-base leading-relaxed text-[var(--nimia-muted)] sm:text-lg">
            A curated selection of animations, games, and digital experiences crafted by Nimia Studio.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <a
              href="#explore-portfolio"
              className="inline-flex items-center gap-2 rounded-md bg-[var(--nimia-crimson)] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[var(--nimia-crimson-hover)]"
            >
              View Full Portfolio
            </a>
            {featured ? (
              <button
                type="button"
                onClick={() => onOpen(featured.slug)}
                className="inline-flex items-center gap-2 text-sm font-semibold text-white/85 transition-colors hover:text-white"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20">
                  <Play className="ml-0.5 h-3.5 w-3.5" fill="currentColor" />
                </span>
                Watch Showreel
              </button>
            ) : null}
          </div>
        </div>

        {featured ? (
          <button
            type="button"
            onClick={() => onOpen(featured.slug)}
            aria-label={`Watch ${featured.title}`}
            className="nimia-card-hover group relative aspect-video w-full overflow-hidden rounded-2xl border border-[var(--nimia-border)] bg-black/40 shadow-2xl shadow-black/40"
          >
            {featured.thumbnailSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={featured.thumbnailSrc}
                srcSet={featured.thumbnailSrcSet}
                sizes="(min-width: 1024px) 50vw, 100vw"
                alt={featured.title}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
              />
            ) : null}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
            <span className="absolute left-4 top-4 rounded-full border border-white/15 bg-black/50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-white/85 backdrop-blur">
              {featured.format ? FORMAT_LABELS[featured.format] : "Video"}
            </span>
            <span className="absolute inset-0 flex items-center justify-center">
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--nimia-pink)]/90 text-white shadow-lg transition-transform duration-300 group-hover:scale-110">
                <Play className="ml-1 h-6 w-6" fill="currentColor" />
              </span>
            </span>
            <div className="absolute inset-x-0 bottom-0 px-5 pb-5 pt-10 text-left">
              <p className="text-lg font-semibold text-white">{featured.title}</p>
              <p className="mt-1 text-sm text-white/70">
                {[featured.category?.name, duration].filter(Boolean).join(" · ")}
              </p>
            </div>
          </button>
        ) : null}
      </div>
    </section>
  );
}
