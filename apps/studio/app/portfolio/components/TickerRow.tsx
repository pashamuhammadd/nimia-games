"use client";

import { useEffect, useRef } from "react";
import type { CSSProperties, MouseEvent } from "react";
import { useInView } from "framer-motion";
import type { TickerVideo } from "../data";

interface TickerRowProps {
  items: TickerVideo[];
  direction: "left" | "right";
  durationSeconds: number;
  aspect: "square" | "video";
}

// One marquee row, reused for both ticker rows on the page (SECTIONS 2 & 3
// of the brief). Items are duplicated once so the CSS loop (translateX 0
// <-> -50%, see the "Portfolio Preview page ticker marquees" block in
// globals.css) repeats seamlessly forever regardless of row width.
//
// Playback is gated on scroll visibility rather than relying on `autoPlay`
// alone, so all 10 video elements across both rows aren't decoding at once
// the instant the page loads — same pattern as apps/www's GalleryTicker.
// Hovering anywhere in the row pauses the horizontal scroll only; video
// playback keeps running (per brief) since it's controlled independently
// here via IntersectionObserver, not by the marquee animation.
//
// No background/overlay on the row or on individual clips (per 30 Juli
// 2026 correction) — an earlier version had a subtle white-tint backing
// per item plus a dark edge-fade gradient at both ends of the row; against
// the page's near-black background both read as an unwanted "black box"
// behind the videos, so both were removed. Each clip is just the video
// itself inside a bordered, rounded frame.
//
// Video-security pass (30 Juli 2026, separate brief): `clip.src` now points
// at our own /api/video/<id> proxy (see data.ts) instead of a raw
// Cloudinary URL, right-click is disabled on every clip, and the browser's
// own download/PiP/remote-playback affordances are turned off via
// controlsList/disablePictureInPicture/disableRemotePlayback. None of this
// makes a clip literally undownloadable (impossible for anything a browser
// plays) — it just removes the one-click paths a casual visitor would
// otherwise have. Autoplay/muted/loop/playsInline/no-controls behavior is
// unchanged from before.
function preventContextMenu(event: MouseEvent<HTMLVideoElement>) {
  event.preventDefault();
}

export function TickerRow({ items, direction, durationSeconds, aspect }: TickerRowProps) {
  const rowRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(rowRef, { amount: 0.15 });
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const repeated = [...items, ...items];

  useEffect(() => {
    videoRefs.current.forEach((video) => {
      if (!video) return;
      if (isInView) {
        video.play().catch(() => {});
      } else {
        video.pause();
      }
    });
  }, [isInView]);

  const animationClass = direction === "right" ? "nimia-ticker-right" : "nimia-ticker-left";
  const sizeClass =
    aspect === "square"
      ? "aspect-square w-[200px] sm:w-[240px] md:w-[260px]"
      : "aspect-video w-[300px] sm:w-[360px] md:w-[420px]";

  return (
    <div ref={rowRef} className="relative w-full overflow-hidden">
      <div
        className={`flex w-max gap-5 px-4 sm:px-6 ${animationClass}`}
        style={{ "--nimia-ticker-duration": `${durationSeconds}s` } as CSSProperties}
      >
        {repeated.map((clip, index) => (
          <div
            key={`${clip.id}-${index}`}
            className={`relative shrink-0 overflow-hidden rounded-[20px] border border-white/10 transition-all duration-300 ease-out hover:scale-105 hover:border-[var(--nimia-crimson)]/50 hover:shadow-[0_25px_60px_-20px_rgba(193,18,77,0.45)] ${sizeClass}`}
          >
            <video
              ref={(el) => {
                videoRefs.current[index] = el;
              }}
              src={clip.src}
              className="h-full w-full object-cover"
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              controlsList="nodownload noplaybackrate noremoteplayback"
              disablePictureInPicture
              disableRemotePlayback
              onContextMenu={preventContextMenu}
              aria-hidden="true"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
