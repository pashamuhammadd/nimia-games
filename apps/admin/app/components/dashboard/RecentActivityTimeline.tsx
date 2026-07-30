"use client";

import { motion } from "framer-motion";
import { CheckCircle2, CreditCard, FileText, UploadCloud, XCircle, type LucideIcon } from "lucide-react";
import { cn } from "@nimia/ui";

// Unchanged from apps/studio/app/components/dashboard/RecentActivityTimeline.tsx —
// this component is already fully generic (just an `activities` array), so
// it's reused as-is; only the Overview page's data source differs (project
// updates across every client instead of one client's own project).
export type ActivityTone = "success" | "payment" | "upload" | "neutral" | "cancelled";

export type ActivityItem = {
  id: string;
  title: string;
  subtitle: string;
  timeLabel: string;
  tone: ActivityTone;
};

const TONE_META: Record<ActivityTone, { icon: LucideIcon; className: string }> = {
  success: { icon: CheckCircle2, className: "bg-emerald-400/15 text-emerald-400" },
  payment: { icon: CreditCard, className: "bg-purple-400/15 text-purple-400" },
  upload: { icon: UploadCloud, className: "bg-[var(--nimia-crimson)]/15 text-[var(--nimia-pink)]" },
  neutral: { icon: FileText, className: "bg-sky-400/15 text-sky-400" },
  cancelled: { icon: XCircle, className: "bg-red-400/15 text-red-400" },
};

export function RecentActivityTimeline({
  activities,
  viewAllHref,
}: {
  activities: ActivityItem[];
  viewAllHref: string;
}) {
  return (
    <section className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold text-white">Recent Activity</h2>
        <a
          href={viewAllHref}
          className="flex items-center gap-1 text-sm font-medium text-[var(--nimia-pink)] hover:text-white"
        >
          View all →
        </a>
      </div>

      {activities.length === 0 ? (
        <p className="py-6 text-center text-sm text-white/35">No activity yet.</p>
      ) : (
        <ol className="relative flex flex-col gap-5 pl-1">
          {activities.map((activity, index) => {
            const { icon: Icon, className } = TONE_META[activity.tone];
            const isLast = index === activities.length - 1;
            return (
              <motion.li
                key={activity.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: index * 0.07, ease: "easeOut" }}
                className="relative flex gap-3.5"
              >
                {!isLast ? (
                  <span
                    aria-hidden="true"
                    className="absolute left-[15px] top-8 h-[calc(100%-4px)] w-px bg-white/[0.08]"
                  />
                ) : null}
                <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full", className)}>
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1 pb-0.5">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-white">{activity.title}</p>
                    <span className="shrink-0 text-xs text-white/35">{activity.timeLabel}</span>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-white/45">{activity.subtitle}</p>
                </div>
              </motion.li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
