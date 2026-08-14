"use client";

import { motion } from "framer-motion";
import { cn } from "@nimia/ui";
import { PARTNER_LEVELS } from "../constants/partner-level";
import type { PartnerLevel } from "../types/partner";

export function PartnerLevelCard({ currentLevel }: { currentLevel: PartnerLevel }) {
  return (
    <section className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 sm:p-6">
      <h2 className="mb-4 text-base font-semibold text-white">Partner Levels</h2>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {PARTNER_LEVELS.map((level, index) => {
          const isCurrent = level.level === currentLevel;
          return (
            <motion.div
              key={level.level}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.06, ease: "easeOut" }}
              className={cn(
                "flex flex-col gap-2 rounded-xl border p-4 transition-colors",
                isCurrent
                  ? "border-[var(--nimia-crimson)]/50 bg-[var(--nimia-crimson)]/10"
                  : "border-white/[0.07] bg-white/[0.02]",
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-2xl" aria-hidden="true">
                  {level.emoji}
                </span>
                {isCurrent ? (
                  <span className="rounded-full bg-[var(--nimia-crimson)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                    Current
                  </span>
                ) : null}
              </div>
              <p className="text-sm font-semibold text-white">{level.label}</p>
              <p className="text-xs text-white/45">
                {level.maxPaidClients === null
                  ? `${level.minPaidClients}+ Paid Clients`
                  : `${level.minPaidClients}–${level.maxPaidClients} Paid Clients`}
              </p>
              <p className="text-xs font-medium text-[var(--nimia-pink)]">
                {Math.round(level.commissionRate * 100)}% Commission
              </p>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
