"use client";

import { useEffect, useRef, useState } from "react";
import FlowLink from "@/components/flow/FlowLink";
import Reveal from "@/components/motion/Reveal";
import { galleryItems, galleryCategories } from "@/data/gallery";
import { useInView } from "@/hooks/useInView";
import { GalleryItem } from "@/types/gallery";

interface GalleryTickerProps {
  variant?: "preview" | "full";
}

/**
 * Auto-scrolling "news ticker" style gallery, brought back by request in
 * place of the static filterable grid. Self-contained (owns its own
 * heading, like GamesSection/AboutSection) so it can be dropped straight
 * into the /gallery page (variant="full") or the mobile landing page
 * (variant="preview").
 */
export default function GalleryTicker({ variant = "full" }: GalleryTickerProps) {
  const isPreview = variant === "preview";
  const [activeCategory, setActiveCategory] =
    useState<(typeof galleryCategories)[number]>("All");
  const { ref, isInView } = useInView<HTMLElement>(0.1);

  const filtered =
    !isPreview && activeCategory !== "All"
      ? galleryItems.filter((item) => item.category === activeCategory)
      : galleryItems;

  return (
    <section
      ref={ref}
      id="gallery"
      className={
        isPreview
          ? "overflow-hidden border-y border-white/10 py-12"
          : "pb-16"
      }
    >
      <Reveal>
        <div className="mx-auto mb-6 max-w-6xl px-5 md:px-6">
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.25em] text-white/45">
            Animation Gallery
          </p>

          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <h2 className="text-2xl font-black text-white md:text-3xl">
                Bringing ideas <span className="nimia-accent-text">to life.</span>
              </h2>

              {!isPreview && (
                <p className="mt-2 max-w-2xl text-sm text-white/60">
                  Koleksi animasi, motion graphics, game trailer, dan visual
                  showcase ekosistem Solana yang dibuat Nimia.
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {galleryCategories.map((category, index) =>
                isPreview ? (
                  <span
                    key={category}
                    className={`rounded-full px-3 py-1.5 text-[11px] font-semibold ${
                      index === 0
                        ? "nimia-gradient-bg text-white"
                        : "border border-white/10 text-white/50"
                    }`}
                  >
                    {category}
                  </span>
                ) : (
                  <button
                    key={category}
                    type="button"
                    onClick={() => setActiveCategory(category)}
                    className={`rounded-full px-3 py-1.5 text-[11px] font-semibold transition ${
                      activeCategory === category
                        ? "nimia-gradient-bg text-white"
                        : "border border-white/10 text-white/50 hover:text-white"
                    }`}
                  >
                    {category}
                  </button>
                )
              )}

              {isPreview && (
                <FlowLink
                  href="/gallery"
                  className="ml-2 text-[11px] font-bold uppercase tracking-widest text-white/50 transition hover:text-white"
                >
                  Lihat Semua →
                </FlowLink>
              )}
            </div>
          </div>
        </div>
      </Reveal>

      <div className="flex flex-col gap-3">
        <TickerRow items={filtered} playing={isInView} reverse={false} />
        {!isPreview && <TickerRow items={filtered} playing={isInView} reverse />}
      </div>
    </section>
  );
}

function TickerRow({
  items,
  playing,
  reverse,
}: {
  items: GalleryItem[];
  playing: boolean;
  reverse: boolean;
}) {
  const repeated = [...items, ...items];
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);

  // The whole row plays/pauses together once the gallery section itself
  // scrolls into view, instead of autoplaying every clip on page load.
  useEffect(() => {
    videoRefs.current.forEach((video) => {
      if (!video) return;
      if (playing) {
        video.play().catch(() => {});
      } else {
        video.pause();
      }
    });
  }, [playing, items]);

  return (
    <div className="relative flex w-full overflow-hidden">
      <div
        className={`flex gap-3 px-5 md:px-6 ${
          reverse ? "animate-gallery-ticker-reverse" : "animate-gallery-ticker"
        }`}
      >
        {repeated.map((item, index) => (
          <div
            key={`${item.src}-${index}`}
            className="group relative aspect-square w-32 shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.035] transition-all duration-300 hover:-translate-y-1 hover:border-[var(--nimia-pink)]/50 hover:shadow-[0_14px_30px_rgba(43,10,26,0.5)] md:w-44"
          >
            <video
              ref={(el) => {
                videoRefs.current[index] = el;
              }}
              src={item.src}
              aria-label={item.alt}
              className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
              muted
              loop
              playsInline
              preload="metadata"
            />

            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent" />

            <span className="absolute bottom-2 left-2 rounded-full border border-white/15 bg-black/50 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-widest text-white/70 backdrop-blur">
              {item.category}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
