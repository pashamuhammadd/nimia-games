"use client";

import { useState } from "react";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import { Play } from "lucide-react";
import { FEATURED_SHOWCASE, type ShowcaseItem } from "../data";

// SECTION 4 — Featured Showcase. 3 large 16:9 videos, stacked in a single
// column (not side-by-side, per 30 Juli 2026 correction) so each piece
// gets the full width and reads like a descending showreel instead of a
// 3-up grid.
//
// Playback model changed per a second 30 Juli 2026 correction: these no
// longer autoplay muted on scroll-into-view. Each clip shows a real
// Cloudinary-generated poster frame (see cloudinaryPosterUrl in data.ts)
// until clicked; clicking starts playback WITH sound (unmuted — allowed by
// browser autoplay policy here because play() is called synchronously
// from a click, i.e. a real user gesture) and reveals native video
// controls so the visitor can pause/adjust volume/scrub. Still fully
// inline, no modal or popup, per the brief's explicit "no modal, no
// popup" rule. No caption text under the videos either (also per
// correction) — `label` on each item now only feeds the play button's
// aria-label for screen readers.
export function FeaturedShowcase() {
  const shouldReduceMotion = useReducedMotion();

  const container: Variants = {
    hidden: {},
    visible: {
      transition: { staggerChildren: shouldReduceMotion ? 0 : 0.12, delayChildren: 0.05 },
    },
  };
  const item: Variants = {
    hidden: {
      opacity: 0,
      y: shouldReduceMotion ? 0 : 28,
      filter: shouldReduceMotion ? "blur(0px)" : "blur(8px)",
    },
    visible: {
      opacity: 1,
      y: 0,
      filter: "blur(0px)",
      transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] },
    },
  };

  return (
    <section className="relative px-4 py-16 sm:px-6 sm:py-20">
      <motion.div
        variants={container}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        className="mx-auto flex max-w-4xl flex-col gap-12 sm:gap-16"
      >
        {FEATURED_SHOWCASE.map((piece) => (
          <motion.div key={piece.id} variants={item}>
            <ShowcasePiece piece={piece} />
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}

function ShowcasePiece({ piece }: { piece: ShowcaseItem }) {
  const [isPlaying, setIsPlaying] = useState(false);

  return (
    // "group" no longer drives a hover-zoom on the video itself (removed
    // per user correction, 30 Juli 2026 — the zoom-on-hover read as too
    // busy on these large pieces) but is kept for the play button's own
    // group-hover:scale-110 below.
    <div className="group relative aspect-video overflow-hidden rounded-3xl">
      <video
        src={piece.src}
        poster={piece.poster}
        controls={isPlaying}
        autoPlay={isPlaying}
        playsInline
        preload="metadata"
        onEnded={() => setIsPlaying(false)}
        className="h-full w-full object-cover"
      />

      {!isPlaying ? (
        <button
          type="button"
          onClick={() => setIsPlaying(true)}
          aria-label={`Play: ${piece.label}`}
          className="absolute inset-0 flex items-center justify-center"
        >
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/95 shadow-[0_20px_50px_-10px_rgba(0,0,0,0.6)] transition-transform duration-300 ease-out group-hover:scale-110">
            <Play
              className="h-6 w-6 translate-x-0.5 text-[var(--nimia-maroon)]"
              fill="currentColor"
              aria-hidden="true"
            />
          </span>
        </button>
      ) : null}
    </div>
  );
}
