"use client";

import { useRef, useState } from "react";
import type { MouseEvent } from "react";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import { Pause, Play } from "lucide-react";
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
// from a click, i.e. a real user gesture). Still fully inline, no modal or
// popup, per the brief's explicit "no modal, no popup" rule. No caption
// text under the videos either (also per correction) — `label` on each
// item now only feeds the play/pause button's aria-label for screen
// readers.
//
// Video-security pass (30 Juli 2026, separate brief): native `controls`
// were removed entirely (30 Juli 2026, video-security brief) — they used
// to appear once a clip started playing, but the browser's own control bar
// includes a built-in download affordance we can't strip out of it. The
// click-to-play-with-sound interaction itself is unchanged (per explicit
// user decision, same brief): a custom play/pause button now replaces the
// native bar instead of removing the interaction.
//
// NOT looping (30 Juli 2026, follow-up correction): an earlier pass added
// `loop` here to match the ticker rows, but the user corrected that these
// 3 showcase pieces should play once and stop — when a clip finishes, it
// falls back to the poster/play button, same as before the video-security
// pass, and the visitor has to click play again to rewatch it. `onEnded`
// below both resets `isPlaying` and rewinds `currentTime` to 0 so the next
// click starts from the beginning rather than replaying nothing (`ended`
// video sitting at its own last frame).
function preventContextMenu(event: MouseEvent<HTMLVideoElement>) {
  event.preventDefault();
}

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
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleToggle = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
      setIsPlaying(false);
      return;
    }

    // Unmuted playback here is only allowed by browser autoplay policy
    // because play() is called synchronously from this click handler —
    // i.e. from a real user gesture. Setting `muted` explicitly first
    // guards against a stray "muted" carried over from a previous pause.
    video.muted = false;
    // A clip that already played to the end sits at its own last frame
    // with `ended === true`; play() on it is a no-op unless we rewind
    // first, which would otherwise make "click play again" appear to do
    // nothing.
    if (video.ended) {
      video.currentTime = 0;
    }
    video.play().catch(() => {});
    setIsPlaying(true);
  };

  const handleEnded = () => {
    setIsPlaying(false);
  };

  return (
    // "group" no longer drives a hover-zoom on the video itself (removed
    // per user correction, 30 Juli 2026 — the zoom-on-hover read as too
    // busy on these large pieces) but is kept for the play/pause button's
    // own group-hover:scale-110 below.
    <div className="group relative aspect-video overflow-hidden rounded-3xl">
      <video
        ref={videoRef}
        src={piece.src}
        poster={piece.poster}
        playsInline
        preload="metadata"
        controlsList="nodownload noplaybackrate noremoteplayback"
        disablePictureInPicture
        disableRemotePlayback
        onContextMenu={preventContextMenu}
        onEnded={handleEnded}
        className="h-full w-full object-cover"
      />

      <button
        type="button"
        onClick={handleToggle}
        aria-label={isPlaying ? `Pause: ${piece.label}` : `Play: ${piece.label}`}
        className="absolute inset-0 flex items-center justify-center"
      >
        <span
          className={`flex h-16 w-16 items-center justify-center rounded-full bg-white/95 shadow-[0_20px_50px_-10px_rgba(0,0,0,0.6)] transition-all duration-300 ease-out group-hover:scale-110 ${
            isPlaying ? "opacity-0 group-hover:opacity-100" : "opacity-100"
          }`}
        >
          {isPlaying ? (
            <Pause
              className="h-6 w-6 text-[var(--nimia-maroon)]"
              fill="currentColor"
              aria-hidden="true"
            />
          ) : (
            <Play
              className="h-6 w-6 translate-x-0.5 text-[var(--nimia-maroon)]"
              fill="currentColor"
              aria-hidden="true"
            />
          )}
        </span>
      </button>
    </div>
  );
}
