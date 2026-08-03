"use client";

import { motion } from "framer-motion";
import { cn } from "@nimia/ui";
import { orderStatusMeta } from "../../lib/orderStatus";
import { formatRelativeTime } from "../../lib/relativeTime";

export interface OrderListItem {
  id: string;
  title: string;
  description: string;
  status: string;
  budget: string | null;
  finalPriceUsd: number | null;
  proposedPriceUsd: number | null;
  createdAt: string;
}

// Shown once a real quote/price exists (finalPriceUsd, set once staff
// approves a negotiation — see order_negotiations in
// packages/db/migrations/0013), falling back to the client's own proposed
// budget while it's still pending review/negotiation, and finally to a
// plain "Pending quote" for a brand new submission with neither.
function priceLabel(order: OrderListItem) {
  if (order.finalPriceUsd != null) return `$${order.finalPriceUsd.toLocaleString("en-US")}`;
  if (order.proposedPriceUsd != null) {
    return `~$${order.proposedPriceUsd.toLocaleString("en-US")} (proposed)`;
  }
  if (order.budget) return order.budget;
  return "Pending quote";
}

// List view for /dashboard/orders (3 Agustus 2026, per user request — this
// page used to always render the OrderForm submission form; now that /order
// is the real entry point for starting a new project, this "Orders" sidebar
// item's job is to show the client their own orders and where each one
// stands, same shape as the Active Orders section on /dashboard but scoped
// to the full history instead of just the top 3.
export function OrdersList({ orders }: { orders: OrderListItem[] }) {
  return (
    <div className="flex flex-col gap-3">
      {orders.map((order, index) => {
        const meta = orderStatusMeta(order.status);
        return (
          <motion.div
            key={order.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05, ease: "easeOut" }}
            className="flex flex-col gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 transition-colors hover:border-white/[0.14] sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate text-sm font-semibold text-white">{order.title}</p>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs font-medium text-white/70">
                  <span className={cn("h-1.5 w-1.5 rounded-full", meta.dotClass)} aria-hidden="true" />
                  {meta.label}
                </span>
              </div>
              <p className="mt-1.5 line-clamp-2 max-w-2xl text-sm text-white/50">{order.description}</p>
              <p className="mt-2 text-xs text-white/35">Submitted {formatRelativeTime(order.createdAt)}</p>
            </div>

            <div className="shrink-0 text-left sm:text-right">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-white/35">Price</p>
              <p className="mt-0.5 text-base font-bold text-white">{priceLabel(order)}</p>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
