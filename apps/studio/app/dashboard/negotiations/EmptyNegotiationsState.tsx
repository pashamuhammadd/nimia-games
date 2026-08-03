"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Handshake, Sparkles } from "lucide-react";

// Shown when this client has zero rows in `order_negotiations` (3 Agustus
// 2026, per user request — /dashboard/negotiations now queries real data
// instead of always showing ComingSoonState).
export function EmptyNegotiationsState({ ordersHref }: { ordersHref: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1, ease: "easeOut" }}
      className="flex flex-col items-center gap-6 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-6 py-16 text-center sm:py-20"
    >
      <div className="relative flex h-24 w-24 items-center justify-center">
        <div
          aria-hidden="true"
          className="absolute inset-0 rounded-full bg-gradient-to-br from-[var(--nimia-crimson)]/25 to-[var(--nimia-pink)]/10 blur-xl"
        />
        <div className="relative flex h-20 w-20 items-center justify-center rounded-full border border-white/10 bg-white/[0.04]">
          <Handshake className="h-9 w-9 text-[var(--nimia-pink)]" aria-hidden="true" />
          <Sparkles
            className="absolute -right-1 -top-1 h-5 w-5 text-[var(--nimia-pink)]"
            aria-hidden="true"
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold text-white sm:text-xl">No Negotiations Yet</h2>
        <p className="max-w-sm text-sm text-white/45">
          Propose your own price on any order from its Review step and the back-and-forth with our
          team will show up here.
        </p>
      </div>

      <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
        <Link
          href={ordersHref}
          className="inline-flex items-center gap-2 rounded-xl bg-[var(--nimia-crimson)] px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[var(--nimia-crimson)]/25 transition-colors hover:bg-[var(--nimia-crimson-hover)]"
        >
          View Your Orders
        </Link>
      </motion.div>
    </motion.div>
  );
}
