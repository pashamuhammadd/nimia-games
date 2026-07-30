"use client";

import { motion } from "framer-motion";
import { UserRound } from "lucide-react";
import { cn } from "@nimia/ui";
import { REFERRAL_STATUS_LABEL, type Referral, type ReferralStatus } from "../types/referral";

const STATUS_DOT_CLASS: Record<ReferralStatus, string> = {
  registered: "bg-sky-400",
  waiting_first_order: "bg-amber-400",
  waiting_payment: "bg-purple-400",
  reward_released: "bg-emerald-400",
};

function formatUsd(amount: number): string {
  return amount > 0 ? `$${amount.toLocaleString("en-US")}` : "—";
}

export function ReferralActivityTable({ referrals }: { referrals: Referral[] }) {
  return (
    <section className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 sm:p-6">
      <h2 className="mb-4 text-base font-semibold text-white">Referral Activity</h2>

      {referrals.length === 0 ? (
        <p className="py-6 text-center text-sm text-white/35">
          No referrals yet — share your link to start inviting clients.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[420px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-white/[0.07] text-left text-xs font-semibold uppercase tracking-wide text-white/35">
                <th className="pb-3 pr-3 font-semibold">Referral</th>
                <th className="pb-3 pr-3 font-semibold">Status</th>
                <th className="pb-3 font-semibold text-right">Reward</th>
              </tr>
            </thead>
            <tbody>
              {referrals.map((referral, index) => (
                <motion.tr
                  key={referral.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05, ease: "easeOut" }}
                  className="border-b border-white/[0.05] last:border-0"
                >
                  <td className="py-3 pr-3">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/[0.06]">
                        <UserRound className="h-4 w-4 text-white/50" aria-hidden="true" />
                      </span>
                      <span className="font-medium text-white">{referral.referredName}</span>
                    </div>
                  </td>
                  <td className="py-3 pr-3">
                    <span className="inline-flex items-center gap-1.5">
                      <span
                        className={cn("h-1.5 w-1.5 rounded-full", STATUS_DOT_CLASS[referral.status])}
                        aria-hidden="true"
                      />
                      <span className="text-xs font-medium text-white/60">
                        {REFERRAL_STATUS_LABEL[referral.status]}
                      </span>
                    </span>
                  </td>
                  <td className="py-3 text-right font-semibold text-white/85">
                    {formatUsd(referral.rewardUsd)}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
