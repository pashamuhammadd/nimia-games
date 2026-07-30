"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ChevronRight, Users, Inbox, Layers, Receipt, type LucideIcon } from "lucide-react";
import { cn } from "@nimia/ui";

// Same "resolve icon from a string key" trick as
// apps/studio/app/components/dashboard/StatCard.tsx — this component is
// "use client" while the Overview page is a Server Component, and a
// lucide-react icon (a forwardRef object) isn't a plain serializable value
// that can cross that boundary as a prop.
export type StatIconKey = "users" | "inbox" | "layers" | "receipt";

const STAT_ICONS: Record<StatIconKey, LucideIcon> = {
  users: Users,
  inbox: Inbox,
  layers: Layers,
  receipt: Receipt,
};

export function StatCard({
  icon,
  label,
  value,
  href,
  footerLabel,
  accent,
  index = 0,
}: {
  icon: StatIconKey;
  label: string;
  value: React.ReactNode;
  href: string;
  footerLabel: string;
  accent: "crimson" | "amber" | "purple" | "emerald";
  index?: number;
}) {
  const accentClasses: Record<typeof accent, { badge: string; icon: string; footer: string }> = {
    crimson: {
      badge: "bg-[var(--nimia-crimson)]/15",
      icon: "text-[var(--nimia-pink)]",
      footer: "text-[var(--nimia-pink)]",
    },
    amber: { badge: "bg-amber-400/15", icon: "text-amber-400", footer: "text-amber-400" },
    purple: { badge: "bg-purple-400/15", icon: "text-purple-400", footer: "text-purple-400" },
    emerald: { badge: "bg-emerald-400/15", icon: "text-emerald-400", footer: "text-emerald-400" },
  };
  const colors = accentClasses[accent];
  const Icon = STAT_ICONS[icon];

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.06, ease: "easeOut" }}
      whileHover={{ y: -3 }}
    >
      <Link
        href={href}
        className="group block rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 backdrop-blur transition-colors hover:border-white/[0.14] hover:bg-white/[0.045]"
      >
        <div className="flex items-center justify-between">
          <span className={cn("flex h-10 w-10 items-center justify-center rounded-xl", colors.badge)}>
            <Icon className={cn("h-5 w-5", colors.icon)} aria-hidden="true" />
          </span>
        </div>
        <p className="mt-4 text-sm font-medium text-white/50">{label}</p>
        <p className="mt-1 text-2xl font-bold text-white">{value}</p>
        <p
          className={cn(
            "mt-3 flex items-center gap-1 text-xs font-medium opacity-80 transition-opacity group-hover:opacity-100",
            colors.footer,
          )}
        >
          {footerLabel}
          <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
        </p>
      </Link>
    </motion.div>
  );
}
