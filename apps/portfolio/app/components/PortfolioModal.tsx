"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "@nimia/ui";
import type { PortfolioItem } from "../../lib/portfolio-types";
import { formatDuration, FORMAT_LABELS } from "../../lib/format";

interface PortfolioModalProps {
  item: PortfolioItem | null;
  onClose: () => void;
  onNavigate: (direction: "prev" | "next") => void;
  hasPrev: boolean;
  hasNext: boolean;
}

// Large cinematic media viewer (spec §12) — hand-rolled portal + focus trap
// rather than @nimia/ui's <Modal> (that component is deliberately sized
// for small confirm/form dialogs, capped at max-w-sm — see its own header
// comment; this needs to cover most of the viewport and preserve a video's
// native aspect ratio instead). Keeps the same base conventions
// (createPortal onto document.body, ESC to close, body-scroll lock) so it
// still behaves consistently with every other overlay on the site.
export function PortfolioModal({ item, onClose, onNavigate, hasPrev, hasNext }: PortfolioModalProps) {
  const [mounted, setMounted] = React.useState(false);
  const dialogRef = React.useRef<HTMLDivElement>(null);
  const closeButtonRef = React.useRef<HTMLButtonElement>(null);
  const touchStartX = React.useRef<number | null>(null);

  React.useEffect(() => setMounted(true), []);

  const open = Boolean(item);

  // Keyboard: ESC closes, arrow keys navigate (desktop, spec §12), Tab is
  // trapped inside the dialog while open.
  React.useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key === "ArrowLeft" && hasPrev) {
        onNavigate("prev");
        return;
      }
      if (event.key === "ArrowRight" && hasNext) {
        onNavigate("next");
        return;
      }
      if (event.key === "Tab" && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose, onNavigate, hasPrev, hasNext]);

  if (!mounted || !item) return null;

  const duration = formatDuration(item.durationSeconds);
  const metaParts = [item.project ?? item.client, item.format ? FORMAT_LABELS[item.format] : null, duration].filter(
    Boolean,
  );

  // Aspect-ratio container per format (spec §12: never stretch a vertical
  // video to landscape, never distort a square). Falls back to the raw
  // width/height ratio when `format` hasn't been set yet.
  const aspectClass =
    item.format === "9:16"
      ? "aspect-[9/16] max-h-[85vh] w-auto"
      : item.format === "1:1"
        ? "aspect-square max-w-2xl"
        : "aspect-video max-w-5xl";

  const handleTouchStart = (event: React.TouchEvent) => {
    touchStartX.current = event.touches[0]?.clientX ?? null;
  };
  const handleTouchEnd = (event: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const deltaX = (event.changedTouches[0]?.clientX ?? 0) - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(deltaX) < 60) return;
    if (deltaX > 0 && hasPrev) onNavigate("prev");
    if (deltaX < 0 && hasNext) onNavigate("next");
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/80 px-3 py-6 backdrop-blur-md sm:px-6 sm:py-10"
      role="presentation"
      onClick={onClose}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={item.title}
        onClick={(event) => event.stopPropagation()}
        className="nimia-modal-in relative flex w-full max-w-5xl flex-col gap-5"
      >
        <button
          ref={closeButtonRef}
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute -top-11 right-0 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-black/50 text-white/85 transition-colors hover:bg-white/10 hover:text-white sm:-top-2 sm:-right-12"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>

        <div className="relative mx-auto flex w-full items-center justify-center">
          {hasPrev ? (
            <NavArrow direction="prev" onClick={() => onNavigate("prev")} />
          ) : null}

          <div
            className={cn(
              "relative mx-auto w-full overflow-hidden rounded-2xl border border-white/10 bg-black shadow-2xl",
              aspectClass,
            )}
          >
            <MediaPlayer item={item} />
          </div>

          {hasNext ? (
            <NavArrow direction="next" onClick={() => onNavigate("next")} />
          ) : null}
        </div>

        <div className="mx-auto w-full max-w-3xl px-1 text-left">
          <h2 className="nimia-font-display text-xl font-bold text-white sm:text-2xl">{item.title}</h2>
          {metaParts.length > 0 ? (
            <p className="mt-1 text-sm text-[var(--nimia-muted)]">{metaParts.join(" · ")}</p>
          ) : null}

          {item.category || item.tags.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {item.category ? (
                <span className="rounded-full border border-[var(--nimia-pink)]/30 bg-[var(--nimia-pink)]/10 px-2.5 py-0.5 text-[11px] font-medium text-[var(--nimia-pink)]">
                  {item.category.name}
                </span>
              ) : null}
              {item.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-[var(--nimia-border)] px-2.5 py-0.5 text-[11px] font-medium text-white/70"
                >
                  {tag}
                </span>
              ))}
            </div>
          ) : null}

          {item.description ? (
            <p className="mt-4 text-sm leading-relaxed text-white/75">{item.description}</p>
          ) : null}
        </div>
      </div>
    </div>,
    document.body,
  );
}

function NavArrow({ direction, onClick }: { direction: "prev" | "next"; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={direction === "prev" ? "Previous work" : "Next work"}
      className={cn(
        "absolute top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/50 text-white/85 transition-colors hover:bg-white/10 hover:text-white sm:flex",
        direction === "prev" ? "-left-14" : "-right-14",
      )}
    >
      {direction === "prev" ? <ChevronLeft className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
    </button>
  );
}

function MediaPlayer({ item }: { item: PortfolioItem }) {
  if (item.resourceType === "video" && item.videoSrc) {
    return (
      <video
        key={item.slug}
        src={item.videoSrc}
        controls
        autoPlay
        playsInline
        // No `muted` here on purpose — per this codebase's existing
        // Featured Showcase convention (apps/studio/app/portfolio/data.ts:
        // "click-to-play with sound"), a deliberate click into the full
        // modal is exactly the moment a visitor expects audio.
        className="h-full w-full object-contain"
      />
    );
  }

  if (item.gifSrc) {
    // eslint-disable-next-line @next/next/no-img-element -- animated GIF,
    // next/image can't animate a re-encoded GIF derivative.
    return <img src={item.gifSrc} alt={item.title} className="h-full w-full object-contain" />;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={item.fullImageSrc ?? item.thumbnailSrc} alt={item.title} className="h-full w-full object-contain" />
  );
}
