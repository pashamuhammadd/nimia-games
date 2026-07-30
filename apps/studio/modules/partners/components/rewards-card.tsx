"use client";

import { motion } from "framer-motion";
import { Clock, Wallet, Trophy } from "lucide-react";
import type { RewardSummary } from "../types/reward";

// Read-only reward status display — no withdraw/payout UI yet, per the
// brief ("Belum perlu membuat sistem withdraw. Cukup siapkan tampilan UI.").
const REWARD_ROWS = [
  { key: "pendingUsd" as const, label: "Pending Reward", icon: Clock, className: "text-amber-400 bg-amber-400/15" },
  {
    key: "availableUsd" as const,
    label: "Available Reward",
    icon: Wallet,
    className: "text-emerald-400 bg-emerald-400/15",
  },
  {
    key: "lifetimeUsd" as const,
    label: "Lifetime Reward",
    icon: Trophy,
    className: "text-purple-400 bg-purple-400/15",
  },
];

export function RewardsCard({ rewards }: { rewards: RewardSummary }) {
  return (
    <section className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 sm:p-6">
      <h2 className="mb-4 text-base font-semibold text-white">Rewards</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {REWARD_ROWS.map((row, index) => {
          const Icon = row.icon;
          return (
            <motion.div
              key={row.key}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.06, ease: "easeOut" }}
              className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4"
            >
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${row.className}`}>
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-medium text-white/50">{row.label}</p>
                <p className="mt-0.5 truncate text-lg font-bold text-white">
                  ${rewards[row.key].toLocaleString("en-US")}
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
