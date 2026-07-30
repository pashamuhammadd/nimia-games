"use client";

import { motion } from "framer-motion";
import { Users, UserCheck, Clock, Trophy, type LucideIcon } from "lucide-react";
import { cn } from "@nimia/ui";
import type { PartnerStatsSummary as PartnerStatsData } from "../types/partner";

// Self-contained stat-card grid (deliberately NOT reusing
// app/components/dashboard/StatCard — that component's icon set is fixed
// to the main dashboard's 4 cards, and this module is meant to stay
// portable/self-contained rather than depend on an app-level component).
// Same visual language though: glass card, icon badge, hover lift.
const STAT_CARDS: {
  key: keyof PartnerStatsData;
  label: string;
  icon: LucideIcon;
  accent: "crimson" | "amber" | "purple" | "emerald";
  format?: (value: number) => string;
}[] = [
  { key: "totalReferrals", label: "Total Referrals", icon: Users, accent: "crimson" },
  { key: "paidClients", label: "Paid Clients", icon: UserCheck, accent: "emerald" },
  {
    key: "pendingRewardUsd",
    label: "Pending Rewards",
    icon: Clock,
    accent: "amber",
    format: (v) => `$${v.toLocaleString("en-US")}`,
  },
  {
    key: "lifetimeRewardUsd",
    label: "Lifetime Rewards",
    icon: Trophy,
    accent: "purple",
    format: (v) => `$${v.toLocaleString("en-US")}`,
  },
];

const ACCENT_CLASSES: Record<string, { badge: string; icon: string }> = {
  crimson: { badge: "bg-[var(--nimia-crimson)]/15", icon: "text-[var(--nimia-pink)]" },
  amber: { badge: "bg-amber-400/15", icon: "text-amber-400" },
  purple: { badge: "bg-purple-400/15", icon: "text-purple-400" },
  emerald: { badge: "bg-emerald-400/15", icon: "text-emerald-400" },
};

export function PartnerStats({ stats }: { stats: PartnerStatsData }) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {STAT_CARDS.map((card, index) => {
        const colors = ACCENT_CLASSES[card.accent];
        const Icon = card.icon;
        const rawValue = stats[card.key];
        return (
          <motion.div
            key={card.key}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: index * 0.06, ease: "easeOut" }}
            whileHover={{ y: -3 }}
            className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 backdrop-blur transition-colors hover:border-white/[0.14] hover:bg-white/[0.045]"
          >
            <span className={cn("flex h-10 w-10 items-center justify-center rounded-xl", colors.badge)}>
              <Icon className={cn("h-5 w-5", colors.icon)} aria-hidden="true" />
            </span>
            <p className="mt-4 text-sm font-medium text-white/50">{card.label}</p>
            <p className="mt-1 text-2xl font-bold text-white">
              {card.format ? card.format(rawValue) : rawValue}
            </p>
          </motion.div>
        );
      })}
    </div>
  );
}
