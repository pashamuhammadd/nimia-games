"use client";

import Link from "next/link";
import { motion } from "framer-motion";

export type PendingOrderItem = {
  id: string;
  title: string;
  clientLabel: string;
  budget: string | null;
  submittedLabel: string;
};

// Overview's queue widget — the admin equivalent of
// apps/studio/app/components/dashboard/ActiveOrdersSection.tsx, but showing
// orders across ALL clients waiting on review rather than one client's own
// orders. Deliberately links out to /orders instead of opening the detail
// modal inline, so Overview stays a quick glance rather than duplicating
// the Orders page's approve/reject logic in two places.
export function PendingOrdersSection({
  orders,
  viewAllHref,
}: {
  orders: PendingOrderItem[];
  viewAllHref: string;
}) {
  return (
    <section className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold text-white">Orders Needing Review</h2>
        <Link
          href={viewAllHref}
          className="flex items-center gap-1 text-sm font-medium text-[var(--nimia-pink)] hover:text-white"
        >
          View all →
        </Link>
      </div>

      {orders.length === 0 ? (
        <p className="py-6 text-center text-sm text-white/35">Nothing waiting on review, nice work.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {orders.map((order, index) => (
            <motion.div
              key={order.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.07, ease: "easeOut" }}
              className="flex items-center justify-between gap-4 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 transition-colors hover:border-white/[0.12]"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">{order.clientLabel}</p>
                <p className="mt-0.5 truncate text-xs text-white/45">
                  {order.title}
                  {order.budget ? ` · ${order.budget}` : ""}
                </p>
              </div>
              <span className="shrink-0 text-xs text-white/35">{order.submittedLabel}</span>
            </motion.div>
          ))}
        </div>
      )}
    </section>
  );
}
