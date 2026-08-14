"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { DashboardNav } from "../DashboardNav";

// Mobile slide-in drawer (30 Juli 2026, Client Dashboard redesign) — covers
// the "Mobile: Hamburger Menu" requirement. Kept as its own component
// (rather than folded into Sidebar.tsx) because it needs open/close state
// and exit animations via AnimatePresence, while Sidebar.tsx stays a plain
// Server Component for the desktop/tablet case.
//
// 10 Agustus 2026 bugfix ("navbar unresponsive after tapping a mobile menu
// item"): the full-screen wrapper used to only exist in the DOM while
// `open` was true (`{open ? (<div ...>) : null}` *inside* AnimatePresence),
// so whether taps could reach the Topbar again depended entirely on Framer
// Motion's exit animation finishing and calling its internal onExitComplete
// to actually unmount that node. Tapping a nav Link fires onClose (closing
// the drawer) in the same tick Next.js starts fetching/rendering the
// destination route — and that render work can starve the exit animation's
// requestAnimationFrame loop right as it's mid-fade. When that happens the
// animation stalls and the exiting node never leaves the DOM: it just sits
// there as an invisible `fixed inset-0 z-50` box — above the Topbar's
// z-30 — silently swallowing every tap on the hamburger button and the
// profile avatar, even though visually nothing looks open anymore. A plain
// element with no visible background still captures pointer events purely
// by covering the viewport, regardless of opacity.
//
// Fix: the outer wrapper is now ALWAYS mounted (so it never has to "finish
// animating away" to stop existing), and `pointer-events` is toggled
// directly off the `open` prop via a normal synchronous re-render instead
// of off whether the animation completed. Descendants inherit
// `pointer-events: none`, so even if the inner fade/slide animation stalls
// or gets interrupted mid-navigation, clicks stop being captured the
// instant `open` flips to false — independent of Framer Motion entirely.
export function MobileNavDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <div
      className={`fixed inset-0 z-50 md:hidden ${open ? "pointer-events-auto" : "pointer-events-none"}`}
    >
      <AnimatePresence>
        {open ? (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
              onClick={onClose}
              aria-hidden="true"
            />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 340, damping: 34 }}
              className="absolute inset-y-0 left-0 flex w-[78%] max-w-[300px] flex-col border-r border-white/[0.07] bg-[#0a0508]"
            >
              <div className="flex h-16 shrink-0 items-center justify-between border-b border-white/[0.07] px-5">
                <Link href="/dashboard" onClick={onClose} className="flex items-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/nimia-studio-lockup.svg" alt="Nimia Games Studio" className="h-7 w-auto" />
                </Link>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close menu"
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-white/60 hover:bg-white/[0.06] hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-5">
                <DashboardNav variant="mobile" onNavigate={onClose} />
              </nav>
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
