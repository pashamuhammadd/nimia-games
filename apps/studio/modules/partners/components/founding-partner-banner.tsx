"use client";

import { motion } from "framer-motion";
import { Rocket, Crown, BadgeCheck, Gem, Lock } from "lucide-react";
import { cn } from "@nimia/ui";

const BENEFITS = [
  { icon: Crown, label: "Instant Gold Partner" },
  { icon: Gem, label: "10% Commission" },
  { icon: BadgeCheck, label: "Exclusive Founding Partner Badge" },
  { icon: Lock, label: "Lifetime Gold Status" },
];

// Only the first 100 accounts to join the partner program get this status
// (brief: "Hanya berlaku untuk 100 akun pertama"). `claimed`/`quota`/`isOpen`
// come from services/partner.service.ts -> repository's
// getFoundingProgramStatus() — once the quota fills, this banner flips to
// the "Program Closed" copy automatically; every partner who joins after
// that starts at Bronze like normal (no special-casing needed here, that's
// handled by utils/level-calculator.ts reading `isFoundingPartner` per
// account, not by this banner).
export function FoundingPartnerBanner({
  claimed,
  quota,
  isOpen,
}: {
  claimed: number;
  quota: number;
  isOpen: boolean;
}) {
  const percent = Math.max(0, Math.min(100, Math.round((claimed / quota) * 100)));

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.05, ease: "easeOut" }}
      className={cn(
        "relative overflow-hidden rounded-2xl border p-5 sm:p-6",
        isOpen
          ? "border-[var(--nimia-crimson)]/30 bg-gradient-to-br from-[var(--nimia-crimson)]/[0.12] to-white/[0.02]"
          : "border-white/[0.08] bg-white/[0.03]",
      )}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span
            className={cn(
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
              isOpen ? "bg-[var(--nimia-crimson)]/20" : "bg-white/[0.06]",
            )}
          >
            <Rocket
              className={cn("h-5 w-5", isOpen ? "text-[var(--nimia-pink)]" : "text-white/40")}
              aria-hidden="true"
            />
          </span>
          <div>
            <h2 className="text-base font-semibold text-white sm:text-lg">
              {isOpen ? "🚀 Founding Partner Program" : "Founding Partner Program Closed"}
            </h2>
            <p className="mt-0.5 text-sm text-white/45">
              {isOpen ? "Only First 100 Members" : "All new partners now start from Bronze."}
            </p>
          </div>
        </div>

        {isOpen ? (
          <div className="flex w-full flex-col gap-1.5 sm:w-56">
            <div className="flex items-center justify-between text-xs font-semibold text-white/70">
              <span>Slots claimed</span>
              <span className="text-[var(--nimia-pink)]">
                {claimed} / {quota}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-white/[0.08]">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${percent}%` }}
                transition={{ duration: 0.7, ease: "easeOut", delay: 0.15 }}
                className="h-full rounded-full bg-gradient-to-r from-[var(--nimia-crimson)] to-[var(--nimia-pink)]"
              />
            </div>
          </div>
        ) : (
          <span className="w-fit rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-medium text-white/50">
            Quota full
          </span>
        )}
      </div>

      {isOpen ? (
        <div className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {BENEFITS.map(({ icon: Icon, label }) => (
            <div
              key={label}
              className="flex items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.03] px-3 py-2.5"
            >
              <Icon className="h-4 w-4 shrink-0 text-[var(--nimia-pink)]" aria-hidden="true" />
              <span className="text-xs font-medium text-white/75">{label}</span>
            </div>
          ))}
        </div>
      ) : null}
    </motion.div>
  );
}
