"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Clock, Wallet, Trophy, Hourglass, ArrowUpRight } from "lucide-react";
import type { RewardSummary } from "../types/reward";

// Fix 11 Agustus 2026 (user report: "di bagian reward saya rasa itu
// terlalu besar teksnya dan areanya yang sedikit sehingga jadi tidak
// muat") — this card renders inside a narrow sidebar column
// (`lg:col-span-1` out of a 3-col grid, see app/dashboard/partners/page.tsx),
// but used to force `sm:grid-cols-3` internally. Tailwind's `sm:` breakpoint
// reacts to VIEWPORT width, not the width of this card's own container —
// so on any viewport wider than 640px, this tried to cram 3 icon+amount
// rows into a column that's only ~1/3 the page width, and the amounts
// wrapped/overflowed. Stacking as a single column at every size (this
// card's own width is what should drive its layout, and a sidebar card is
// never going to be wide) fixes that regardless of viewport.
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

function formatUsd(value: number) {
  return `$${value.toLocaleString("en-US")}`;
}

export function RewardsCard({
  rewards,
  hasOpenWithdrawalRequest = false,
}: {
  rewards: RewardSummary;
  /** True when the partner already has a withdrawal request in review — swaps the Withdraw button for a status pill instead of letting them submit a second one. */
  hasOpenWithdrawalRequest?: boolean;
}) {
  const canWithdraw = rewards.availableUsd > 0 && !hasOpenWithdrawalRequest;

  return (
    <section className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 sm:p-6">
      <h2 className="mb-4 text-base font-semibold text-white">Rewards</h2>
      <div className="flex flex-col gap-3">
        {REWARD_ROWS.map((row, index) => {
          const Icon = row.icon;
          return (
            <motion.div
              key={row.key}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.06, ease: "easeOut" }}
              className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3.5"
            >
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${row.className}`}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-white/50">{row.label}</p>
                <p className="mt-0.5 truncate text-base font-bold text-white">{formatUsd(rewards[row.key])}</p>
              </div>
            </motion.div>
          );
        })}

        {rewards.withdrawingUsd > 0 ? (
          <div className="flex items-center gap-3 rounded-xl border border-sky-400/20 bg-sky-400/[0.06] p-3.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-400/15 text-sky-300">
              <Hourglass className="h-4 w-4" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-white/50">Withdrawal In Review</p>
              <p className="mt-0.5 truncate text-base font-bold text-white">{formatUsd(rewards.withdrawingUsd)}</p>
            </div>
          </div>
        ) : null}
      </div>

      <div className="mt-4 border-t border-white/[0.06] pt-4">
        {hasOpenWithdrawalRequest ? (
          <p className="text-xs text-white/45">
            Your withdrawal request is waiting for founder approval — you&apos;ll get a notification once it&apos;s
            sent.
          </p>
        ) : canWithdraw ? (
          // Styled to match @nimia/ui's Button (primary/sm) directly — that
          // component renders a plain <button>, not a Slot/asChild wrapper,
          // so a same-page navigation like this uses next/link styled to
          // match rather than a button-that-navigates-via-JS.
          <Link
            href="/dashboard/partners/withdraw"
            className="inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-md bg-[var(--nimia-crimson)] px-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[var(--nimia-crimson-hover)]"
          >
            Withdraw Reward
            <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        ) : (
          <p className="text-xs text-white/40">
            You&apos;ll be able to withdraw once you have an Available Reward balance.
          </p>
        )}
      </div>
    </section>
  );
}
