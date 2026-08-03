"use client";

import { motion } from "framer-motion";
import type { LevelProgress } from "../utils/level-calculator";

// "🥈 Silver Partner ████████░░ 5 / 7 Paid Clients — Next: Gold Partner"
// from the brief, translated into an animated progress bar in the same
// visual language as ActiveOrdersSection.tsx's per-project progress bars.
export function PartnerProgress({ progress }: { progress: LevelProgress }) {
  const isMaxLevel = progress.nextLevelLabel === null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 sm:p-6"
    >
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-base font-semibold text-white">
          <span aria-hidden="true">{progress.levelEmoji}</span>
          {progress.levelLabel} Partner
        </h2>
        {!isMaxLevel ? (
          <span className="text-xs font-medium text-white/45">
            Next: <span className="text-[var(--nimia-pink)]">{progress.nextLevelLabel} Partner</span>
          </span>
        ) : (
          <span className="text-xs font-medium text-emerald-400">Top tier reached</span>
        )}
      </div>

      <div className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-white/[0.08]">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress.progressPercent}%` }}
          transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
          className="h-full rounded-full bg-gradient-to-r from-[var(--nimia-crimson)] to-[var(--nimia-pink)]"
        />
      </div>

      <p className="mt-2.5 text-sm text-white/50">
        {isMaxLevel
          ? `${progress.paidClientsCount} Paid Clients, you've reached the highest partner level.`
          : `${progress.paidClientsCount} / ${progress.targetPaidClients} Paid Clients`}
      </p>
    </motion.section>
  );
}
