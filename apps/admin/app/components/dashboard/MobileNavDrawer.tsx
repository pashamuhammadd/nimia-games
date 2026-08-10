"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { AdminNav } from "../AdminNav";

// Mobile slide-in drawer — same pattern as
// apps/studio/app/components/dashboard/MobileNavDrawer.tsx.
//
// 10 Agustus 2026 bugfix ("navbar unresponsive after tapping a mobile menu
// item") — identical root cause as the studio app's copy of this component
// (see the long comment there for the full writeup): the full-screen
// wrapper used to only exist in the DOM while `open` was true, so whether
// taps could reach the Topbar again depended entirely on Framer Motion's
// exit animation finishing. Tapping a nav Link fires onClose in the same
// tick Next.js starts fetching/rendering the destination route, and that
// render work can starve the exit animation's requestAnimationFrame loop
// mid-fade — leaving an invisible `fixed inset-0 z-50` box stuck in the
// DOM, above the Topbar's z-30, silently swallowing every tap on the
// hamburger button and the profile avatar.
//
// Fix: the outer wrapper is now ALWAYS mounted, and `pointer-events` is
// toggled directly off the `open` prop via a normal synchronous re-render
// instead of off whether the animation completed — so clicks stop being
// captured the instant `open` flips to false, independent of Framer
// Motion entirely.
export function MobileNavDrawer({
  role,
  open,
  onClose,
}: {
  role: string;
  open: boolean;
  onClose: () => void;
}) {
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
                <Link href="/" onClick={onClose} className="flex items-center gap-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/logo-bg-black.png" alt="Nimia Games" className="h-7 w-7 rounded-md" />
                  <span className="nimia-font-display text-sm font-bold text-white">
                    Nimia <span className="nimia-gradient-text">Admin</span>
                  </span>
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
                <AdminNav variant="mobile" role={role} onNavigate={onClose} />
              </nav>
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
