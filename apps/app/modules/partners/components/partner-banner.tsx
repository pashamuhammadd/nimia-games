"use client";

import { motion } from "framer-motion";
import { Handshake, Check, Copy, Link2 } from "lucide-react";
import { cn } from "@nimia/ui";
import { usePartnerCopy } from "../hooks/use-partner";

// Hero banner for /dashboard/partners — same premium gradient-card
// language as GreetingHeader.tsx (app/components/dashboard) so this page
// reads as part of the same dashboard, not a bolted-on feature: dark
// gradient surface, two soft blur orbs, framer-motion mount animation.
export function PartnerBanner({
  referralCode,
  referralLink,
}: {
  referralCode: string;
  referralLink: string;
}) {
  const { copied, copy } = usePartnerCopy();

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#1c0712] via-[#150710] to-[#0a0508] p-6 sm:p-9"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full bg-[var(--nimia-crimson)]/25 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-32 bottom-0 h-64 w-64 rounded-full bg-[var(--nimia-pink)]/10 blur-3xl"
      />

      <div className="relative flex flex-col gap-6">
        <div className="flex flex-col gap-3">
          <span className="inline-flex w-fit items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--nimia-pink)]">
            <Handshake className="h-3.5 w-3.5" aria-hidden="true" />
            Partner Program
          </span>
          <h1 className="nimia-font-display text-2xl font-bold tracking-wide text-white sm:text-3xl">
            Nimia Partner Program
          </h1>
          <p className="max-w-xl text-sm text-white/50 sm:text-base">
            Invite new clients, earn rewards, unlock higher partner levels, and grow together with
            Nimia Studio.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <motion.button
            type="button"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => copy("link", referralLink)}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--nimia-crimson)] px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[var(--nimia-crimson)]/25 transition-colors hover:bg-[var(--nimia-crimson-hover)]"
          >
            {copied === "link" ? (
              <Check className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Link2 className="h-4 w-4" aria-hidden="true" />
            )}
            {copied === "link" ? "Link Copied" : "Copy Referral Link"}
          </motion.button>

          <motion.button
            type="button"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => copy("code", referralCode)}
            className={cn(
              "inline-flex items-center justify-center gap-2 rounded-xl border px-5 py-2.5 text-sm font-semibold transition-colors",
              copied === "code"
                ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-300"
                : "border-white/15 bg-white/[0.04] text-white/85 hover:border-white/25 hover:bg-white/[0.08]",
            )}
          >
            {copied === "code" ? (
              <Check className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Copy className="h-4 w-4" aria-hidden="true" />
            )}
            {copied === "code" ? "Code Copied" : "Copy Referral Code"}
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}
