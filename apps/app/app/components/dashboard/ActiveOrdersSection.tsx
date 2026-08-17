"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { cn } from "@nimia/ui";
import type { OrderPaymentSummary } from "@/modules/order/pricing/order-payment-summary";

export type ActiveOrderItem = {
  id: string;
  title: string;
  statusLabel: string;
  dotClass: string;
  progress: number;
  updatedLabel: string;
  // Fase 8 (16 Agustus 2026, Client dashboard payment summary) — null for
  // a project whose linked order couldn't be resolved (see
  // getProjectPaymentSummaries' own header comment); a project with a
  // resolvable order but $0/no price set still gets a summary object, so
  // the render below additionally checks totalAmountUsd > 0 before
  // showing anything.
  paymentSummary: OrderPaymentSummary | null;
};

// Deterministic accent gradient per project so the same project always
// gets the same "thumbnail" color across renders/sessions, without needing
// a real uploaded image yet (projects don't have a cover-image column —
// see packages/db/migrations/0003_orders_projects.sql). Picks from a fixed
// on-brand palette rather than hashing to arbitrary hues.
const THUMBNAIL_GRADIENTS = [
  "from-[var(--nimia-crimson)] to-[var(--nimia-pink)]",
  "from-purple-500 to-[var(--nimia-crimson)]",
  "from-sky-500 to-purple-500",
  "from-amber-500 to-[var(--nimia-crimson)]",
];

function thumbnailGradient(seed: string) {
  const hash = Array.from(seed).reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return THUMBNAIL_GRADIENTS[hash % THUMBNAIL_GRADIENTS.length];
}

function initialsFor(title: string) {
  const words = title.trim().split(/\s+/).filter(Boolean);
  return (words[0]?.[0] ?? "?").toUpperCase() + (words[1]?.[0] ?? "").toUpperCase();
}

function formatUsd(amount: number) {
  return `$${amount.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
}

export function ActiveOrdersSection({
  orders,
  viewAllHref,
  detailHref,
}: {
  orders: ActiveOrderItem[];
  viewAllHref: string;
  detailHref: string;
}) {
  return (
    <section className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold text-white">Active Orders</h2>
        <Link
          href={viewAllHref}
          className="flex items-center gap-1 text-sm font-medium text-[var(--nimia-pink)] hover:text-white"
        >
          View all →
        </Link>
      </div>

      <div className="flex flex-col gap-3">
        {orders.map((order, index) => (
          <motion.div
            key={order.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.07, ease: "easeOut" }}
            className="flex flex-col gap-4 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 transition-colors hover:border-white/[0.12] sm:flex-row sm:items-center"
          >
            <div
              className={cn(
                "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-sm font-bold text-white",
                thumbnailGradient(order.title),
              )}
              aria-hidden="true"
            >
              {initialsFor(order.title)}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-3">
                <p className="truncate text-sm font-semibold text-white">{order.title}</p>
              </div>
              <div className="mt-1 flex items-center gap-1.5">
                <span className={cn("h-1.5 w-1.5 rounded-full", order.dotClass)} aria-hidden="true" />
                <span className="text-xs font-medium text-white/50">{order.statusLabel}</span>
              </div>

              <div className="mt-3 flex items-center gap-3">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.08]">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${order.progress}%` }}
                    transition={{ duration: 0.6, ease: "easeOut", delay: 0.15 }}
                    className="h-full rounded-full bg-gradient-to-r from-[var(--nimia-crimson)] to-[var(--nimia-pink)]"
                  />
                </div>
                <span className="w-9 shrink-0 text-right text-xs font-semibold text-white/70">
                  {order.progress}%
                </span>
              </div>
              <p className="mt-1.5 text-xs text-white/35">Updated {order.updatedLabel}</p>
              {/* Payment summary aggregate (16 Agustus 2026, Fase 8) —
                  FASE0-AUDIT.md problem #12: no single place on a project
                  card shows what's been paid vs what's left. Only rendered
                  once a real price exists (paymentSummary null, or
                  totalAmountUsd === 0, both mean "nothing to summarize
                  yet" — e.g. a project whose order hasn't been quoted). */}
              {order.paymentSummary && order.paymentSummary.totalAmountUsd > 0 ? (
                <p className="mt-1 text-xs font-medium text-white/50">
                  Paid {formatUsd(order.paymentSummary.paidAmountUsd)} / {formatUsd(order.paymentSummary.totalAmountUsd)}
                  {order.paymentSummary.remainingAmountUsd > 0 ? (
                    <span className="text-amber-300/80">
                      {" "}
                      · Remaining {formatUsd(order.paymentSummary.remainingAmountUsd)}
                    </span>
                  ) : null}
                </p>
              ) : null}
            </div>

            <Link
              href={detailHref}
              className="shrink-0 rounded-lg border border-white/10 px-3.5 py-2 text-center text-xs font-semibold text-white/80 transition-colors hover:border-[var(--nimia-crimson)]/50 hover:bg-[var(--nimia-crimson)]/10 hover:text-white sm:self-center"
            >
              View Details
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
