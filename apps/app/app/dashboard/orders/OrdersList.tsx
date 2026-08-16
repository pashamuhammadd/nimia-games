"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Modal, cn } from "@nimia/ui";
import { orderStatusMeta } from "../../lib/orderStatus";
import { formatRelativeTime } from "../../lib/relativeTime";
import { OrderDetail } from "./OrderDetail";
import type { PaymentWalletOption, VoucherRedemptionSummary } from "./PaymentPanel";
import type { InstallmentListItem } from "./InstallmentSchedule";

export interface OrderListItem {
  id: string;
  title: string;
  description: string;
  status: string;
  budget: string | null;
  finalPriceUsd: number | null;
  proposedPriceUsd: number | null;
  createdAt: string;
  // Payment fields (3 Agustus 2026, per user request — client couldn't pay
  // or see a payment address at all once an order reached
  // "Awaiting Payment"). Populated once the client actually submits a
  // payment via PaymentPanel/payment-actions.ts; null until then. See
  // packages/db/migrations/0013_negotiation_payments_ambassadors.sql for
  // the underlying orders columns.
  paymentNetwork: string | null;
  paymentToken: string | null;
  paymentWalletAddress: string | null;
  paymentExpectedAmount: number | null;
  paymentTxHash: string | null;
  paymentSubmittedAt: string | null;
  paymentVerifiedAt: string | null;
  paymentUnderpaidNote: string | null;
  // Voucher applied to this order, if any (4 Agustus 2026, P1 — Vouchers &
  // Quests). Read from the voucher_redemptions embed in
  // app/dashboard/orders/page.tsx; null until apply_voucher_to_order()
  // succeeds for this order (see PaymentPanel.tsx's redeem box).
  voucherRedemption: VoucherRedemptionSummary;
  // Full Payment vs Installments (15 Agustus 2026 — generalized from Custom
  // Order to every flow type). Null for every pre-migration-0038 order,
  // which OrderDetail.tsx treats identically to "full_payment" (falls
  // through to PaymentPanel, same as always).
  paymentMethod: "full_payment" | "installments" | null;
  // Only ever non-empty when paymentMethod === "installments" AND the order
  // has reached 'awaiting_payment' (materialize_order_installments, 0038,
  // only generates these rows at that transition) — see
  // app/dashboard/orders/page.tsx for how this is fetched/attached.
  installments: InstallmentListItem[];
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
//
// Rows became clickable (3 Agustus 2026, second pass, per user request —
// "kenapa belum bisa bayar") — this is now the only place a client can
// actually reach the payment flow (PaymentPanel, opened inside OrderDetail),
// same click-to-open-Modal pattern apps/admin's own OrdersList already uses.
//
// Modal gets "nimia-dark-vars" (3 Agustus 2026, second pass — user reported
// the opened modal rendering light/unreadable) — see globals.css's comment
// on that class for why: @nimia/ui's <Modal> portals straight to
// document.body, escaping DashboardShell's "nimia-dark" wrapper, so without
// this the modal (and the Select/Input/Label/Button inside PaymentPanel)
// fell back to the light theme's CSS vars while this file's own hardcoded
// text-white rendered invisible on that light background.
export function OrdersList({
  orders,
  walletOptions,
}: {
  orders: OrderListItem[];
  walletOptions: PaymentWalletOption[];
}) {
  const [selected, setSelected] = React.useState<OrderListItem | null>(null);

  return (
    <>
      <div className="flex flex-col gap-3">
        {orders.map((order, index) => {
          const meta = orderStatusMeta(order.status);
          return (
            <motion.button
              key={order.id}
              type="button"
              onClick={() => setSelected(order)}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05, ease: "easeOut" }}
              className="flex w-full flex-col gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 text-left transition-colors hover:border-white/[0.14] sm:flex-row sm:items-center sm:justify-between"
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
            </motion.button>
          );
        })}
      </div>

      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        ariaLabel="Order detail"
        className="max-w-lg nimia-dark-vars"
      >
        {selected ? <OrderDetail order={selected} walletOptions={walletOptions} /> : null}
      </Modal>
    </>
  );
}
