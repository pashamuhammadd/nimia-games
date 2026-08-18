"use client";

import * as React from "react";
import { Play } from "lucide-react";
import { cn } from "@nimia/ui";
import type { PortfolioItem } from "../../lib/portfolio-types";
import { formatDuration, FORMAT_LABELS } from "../../lib/format";

// Grid sizing per item — an editorial layout, not a uniform tile grid
// (spec §8: "the layout should feel curated rather than algorithmically
// messy"). Uses the stored aspect ratio as a fallback when `format` wasn't
// set (e.g. a freshly-synced item still pending admin categorization),
// rather than defaulting everything to square.
export function gridSpanClasses(item: PortfolioItem): string {
  const ratio = item.width && item.height ? item.width / item.height : null;
  const isTall = item.format === "9:16" || (ratio !== null && ratio < 0.8 && item.format !== "16:9");
  const isWide = item.format === "16:9" || (ratio !== null && ratio > 1.3 && item.format !== "9:16");
  if (isTall) return "row-span-2";
  if (isWide) return "sm:col-span-2";
  return "";
}

interface PortfolioCardProps {
  item: PortfolioItem;
  onOpen: (slug: string) => void;
  priority?: boolean;
}

export function PortfolioCard({ item, onOpen, priority = false }: PortfolioCardProps) {
  const [hovering, setHovering] = React.useState(false);
  const [videoReady, setVideoReady] = React.useState(false);
  const duration = formatDuration(item.durationSeconds);
  const subtitle = [item.project, item.client].filter(Boolean).join(" · ") || item.client || item.project;

  // Preview video only ever mounts once the pointer is actually over this
  // specific card — with hundreds of cards on a page, this is what keeps
  // the browser from ever requesting more than one or two video streams at
  // a time (spec §11/§20: "the browser must NOT download hundreds of
  // videos on initial page load").
  const showVideoPreview = hovering && item.resourceType === "video" && item.videoSrc;

  return (
    <button
      type="button"
      onClick={() => onOpen(item.slug)}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => {
        setHovering(false);
        setVideoReady(false);
      }}
      onFocus={() => setHovering(true)}
      onBlur={() => setHovering(false)}
      aria-label={`Open ${item.title}`}
      className={cn(
        "nimia-card-hover group relative flex flex-col overflow-hidden rounded-2xl border border-[var(--nimia-border)] bg-[var(--nimia-surface)] text-left",
        gridSpanClasses(item),
      )}
    >
      <div className="relative h-full w-full flex-1 overflow-hidden bg-black/40">
        {item.thumbnailSrc ? (
          // eslint-disable-next-line @next/next/no-img-element -- Cloudinary
          // already delivers f_auto/q_auto/dpr_auto derivatives; routing
          // through next/image would re-optimize an already-optimized
          // image for no benefit (see lib/cloudinary-url.ts's header note).
          <img
            src={item.thumbnailSrc}
            srcSet={item.thumbnailSrcSet}
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
            alt={item.title}
            loading={priority ? "eager" : "lazy"}
            decoding="async"
            className={cn(
              "h-full w-full object-cover transition-opacity duration-300",
              showVideoPreview && videoReady ? "opacity-0" : "opacity-100",
            )}
          />
        ) : (
          <div className="h-full w-full bg-[var(--nimia-surface-hover)]" />
        )}

        {showVideoPreview ? (
          <video
            key={item.slug}
            src={item.videoSrc!}
            muted
            loop
            playsInline
            autoPlay
            preload="metadata"
            onCanPlay={() => setVideoReady(true)}
            className={cn(
              "absolute inset-0 h-full w-full object-cover transition-opacity duration-300",
              videoReady ? "opacity-100" : "opacity-0",
            )}
          />
        ) : null}

        {/* Format badge, spec §9 */}
        <span className="absolute left-3 top-3 rounded-full border border-white/15 bg-black/50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/85 backdrop-blur">
          {item.format ? FORMAT_LABELS[item.format] : item.resourceType === "video" ? "Video" : "Image"}
        </span>

        {/* Hover overlay — dark scrim + centered play icon (spec §9/§10) */}
        <div
          className={cn(
            "pointer-events-none absolute inset-0 flex items-center justify-center bg-black/0 transition-colors duration-300",
            hovering && "bg-black/30",
          )}
        >
          {item.resourceType === "video" || item.gifSrc ? (
            <span
              className={cn(
                "flex h-12 w-12 items-center justify-center rounded-full bg-[var(--nimia-pink)]/90 text-white opacity-0 shadow-lg transition-all duration-300",
                hovering && "opacity-100 scale-100",
                !hovering && "scale-90",
              )}
            >
              <Play className="ml-0.5 h-5 w-5" fill="currentColor" />
            </span>
          ) : null}
        </div>

        {/* Bottom metadata scrim (spec §9: title / client-project / duration) */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent px-3 pb-3 pt-8">
          <p className="truncate text-sm font-semibold text-white">{item.title}</p>
          <div className="mt-0.5 flex items-center gap-1.5 text-xs text-white/65">
            {subtitle ? <span className="truncate">{subtitle}</span> : <span className="truncate">Nimia Studio</span>}
            {duration ? (
              <>
                <span aria-hidden="true">·</span>
                <span className="shrink-0">{duration}</span>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </button>
  );
}
