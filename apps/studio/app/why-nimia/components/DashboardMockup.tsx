"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";
import { Flag, CheckCircle2, FileCheck2 } from "lucide-react";

// "Dragon Hero Animation" / 80% / "Paid" / "18 Delivered" are illustrative
// example values to demonstrate what the real client dashboard (already
// live under /dashboard) looks and feels like — not a real client's data.
// Swap for a real anonymized example later if you'd rather show an actual
// project.
export function DashboardMockup() {
  const shouldReduceMotion = useReducedMotion();

  const fadeUp: Variants = {
    hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 24 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } },
  };

  return (
    <section className="relative px-4 py-20 sm:px-6 sm:py-28">
      <div className="mx-auto max-w-4xl text-center">
        <span className="inline-block rounded-full border border-[var(--nimia-crimson)]/30 bg-[var(--nimia-crimson)]/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--nimia-pink)]">
          Client Dashboard
        </span>
        <h2 className="nimia-font-display mt-5 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
          Every project has its own dashboard.
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-[var(--nimia-muted)]">
          Monitor progress, review files, request revisions, and manage
          invoices, all in one place, for every project you run with us.
        </p>
      </div>

      <motion.div
        variants={fadeUp}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        className="mx-auto mt-14 max-w-2xl"
      >
        <motion.div
          animate={
            shouldReduceMotion
              ? undefined
              : { y: [0, -12, 0] }
          }
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          className="relative rounded-3xl border border-[var(--nimia-crimson)]/25 bg-[var(--nimia-surface)] p-6 shadow-[0_30px_90px_-30px_rgba(193,18,77,0.45)] sm:p-8"
        >
          {/* Window chrome, purely decorative framing to read as "an app" */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5" aria-hidden="true">
              <span className="h-2.5 w-2.5 rounded-full bg-[var(--nimia-crimson)]/50" />
              <span className="h-2.5 w-2.5 rounded-full bg-[var(--nimia-pink)]/50" />
              <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
            </div>
            <span className="text-[11px] font-medium uppercase tracking-widest text-[var(--nimia-muted)]">
              Nimia Studio Dashboard
            </span>
          </div>

          <div className="mt-6">
            <p className="text-xs font-semibold uppercase tracking-widest text-[var(--nimia-muted)]">
              Project
            </p>
            <p className="nimia-font-display mt-1 text-xl font-bold sm:text-2xl">
              Dragon Hero Animation
            </p>
          </div>

          <div className="mt-6">
            <div className="flex items-end justify-between">
              <p className="text-xs font-semibold uppercase tracking-widest text-[var(--nimia-muted)]">
                Progress
              </p>
              <p className="nimia-gradient-text text-sm font-bold">80%</p>
            </div>
            <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
              <motion.div
                initial={{ width: "0%" }}
                whileInView={{ width: "80%" }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 1.1, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className="h-full rounded-full bg-gradient-to-r from-[var(--nimia-crimson)] to-[var(--nimia-pink)]"
              />
            </div>
          </div>

          <div className="mt-6 grid grid-cols-3 gap-3 sm:gap-4">
            <div className="rounded-xl border border-[var(--nimia-border)] bg-white/[0.02] p-3 sm:p-4">
              <Flag className="h-4 w-4 text-[var(--nimia-pink)]" aria-hidden="true" />
              <p className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--nimia-muted)]">
                Milestone
              </p>
              <p className="mt-0.5 text-sm font-semibold leading-tight">Animation Review</p>
            </div>
            <div className="rounded-xl border border-[var(--nimia-border)] bg-white/[0.02] p-3 sm:p-4">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" aria-hidden="true" />
              <p className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--nimia-muted)]">
                Invoice
              </p>
              <p className="mt-0.5 text-sm font-semibold leading-tight text-emerald-400">Paid</p>
            </div>
            <div className="rounded-xl border border-[var(--nimia-border)] bg-white/[0.02] p-3 sm:p-4">
              <FileCheck2 className="h-4 w-4 text-[var(--nimia-pink)]" aria-hidden="true" />
              <p className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--nimia-muted)]">
                Files
              </p>
              <p className="mt-0.5 text-sm font-semibold leading-tight">18 Delivered</p>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}
