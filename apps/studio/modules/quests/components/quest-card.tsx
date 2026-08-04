"use client";

import { motion } from "framer-motion";
import { Check, DollarSign, ShoppingBag, Users } from "lucide-react";
import { cn } from "@nimia/ui";
import type { QuestProgress } from "../types/quest";

const GOAL_ICON: Record<QuestProgress["goalType"], typeof ShoppingBag> = {
  orders_count: ShoppingBag,
  total_spend_usd: DollarSign,
  referral_count: Users,
};

function formatGoal(quest: QuestProgress): string {
  if (quest.goalType === "total_spend_usd") {
    return `$${Math.min(quest.currentProgress, quest.goalValue).toLocaleString("en-US")} / $${quest.goalValue.toLocaleString("en-US")}`;
  }
  return `${Math.min(quest.currentProgress, quest.goalValue)} / ${quest.goalValue}`;
}

// Animated progress card — same visual language as
// modules/partners/components/partner-progress.tsx's progress bar, one card
// per active quest rather than one shared bar since a client tracks several
// independent goals at once.
export function QuestCard({ quest }: { quest: QuestProgress }) {
  const Icon = GOAL_ICON[quest.goalType];
  const percent = Math.min(100, Math.round((quest.currentProgress / quest.goalValue) * 100));

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className={cn(
        "flex flex-col gap-3 rounded-2xl border p-5",
        quest.isCompleted ? "border-emerald-400/30 bg-emerald-400/[0.06]" : "border-white/[0.08] bg-white/[0.03]",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-[var(--nimia-pink)]" aria-hidden="true" />
          <h3 className="text-sm font-semibold text-white">{quest.title}</h3>
        </div>
        {quest.isCompleted ? (
          <span className="flex shrink-0 items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-300">
            <Check className="h-3 w-3" aria-hidden="true" />
            Completed
          </span>
        ) : (
          <span className="shrink-0 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] font-semibold text-white/60">
            +{quest.rewardDiscountPercent}% voucher
          </span>
        )}
      </div>

      <p className="text-xs text-white/50">{quest.description}</p>

      <div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-white/[0.08]">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${percent}%` }}
            transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
            className={cn(
              "h-full rounded-full",
              quest.isCompleted ? "bg-emerald-400" : "bg-gradient-to-r from-[var(--nimia-crimson)] to-[var(--nimia-pink)]",
            )}
          />
        </div>
        <p className="mt-1.5 text-xs text-white/40">{formatGoal(quest)}</p>
      </div>

      {quest.isCompleted && quest.rewardVoucherCode ? (
        <div className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white/70">
          Reward voucher <code className="font-semibold text-white">{quest.rewardVoucherCode}</code> is in your{" "}
          <span className="text-[var(--nimia-pink)]">Vouchers</span> tab.
        </div>
      ) : null}
    </motion.div>
  );
}
