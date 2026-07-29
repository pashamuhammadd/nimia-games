"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { cn } from "../lib/cn";

// Hand-rolled dialog (no Radix, same philosophy as the rest of this
// package — see Button.tsx/Card.tsx) rendered through a portal so it
// always sits above app content regardless of where <Modal> is mounted
// in the tree (important since it's used from both the public navbar
// and, later, other pages deep in the app).
export interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
  ariaLabel?: string;
}

export function Modal({ open, onClose, children, className, ariaLabel }: ModalProps) {
  // createPortal needs `document`, which doesn't exist during SSR — only
  // portal once mounted client-side to avoid a hydration mismatch.
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  React.useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!mounted || !open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 px-4 py-8"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        onClick={(event) => event.stopPropagation()}
        className={cn(
          "relative w-full max-w-sm rounded-xl border border-[var(--nimia-border)] bg-[var(--nimia-surface)] p-6 pt-10 shadow-xl",
          className,
        )}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-md text-[var(--nimia-muted)] transition-colors hover:bg-[var(--nimia-surface-hover)] hover:text-[var(--foreground)]"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
        {children}
      </div>
    </div>,
    document.body,
  );
}
