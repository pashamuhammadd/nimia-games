"use client";

import { orderStatusMeta } from "../../lib/orderStatus";
import { formatRelativeTime } from "../../lib/relativeTime";
import { PaymentPanel, type PaymentWalletOption } from "./PaymentPanel";
import { InstallmentSchedule } from "./InstallmentSchedule";
import type { OrderListItem } from "./OrdersList";

// Statuses where the payment flow actually has something to show — before
// 'awaiting_payment' there's no agreed price/wallet yet, and 'rejected' /
// 'converted' are terminal states unrelated to payment.
const PAYMENT_VISIBLE_STATUSES = new Set(["awaiting_payment", "payment_submitted", "paid"]);

export function OrderDetail({
  order,
  walletOptions,
}: {
  order: OrderListItem;
  walletOptions: PaymentWalletOption[];
}) {
  const meta = orderStatusMeta(order.status);
  const showPayment = PAYMENT_VISIBLE_STATUSES.has(order.status);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <span className="text-xs font-semibold uppercase tracking-wider text-white/35">Order</span>
        <h2 className="mt-1 text-lg font-bold text-white">{order.title}</h2>
        <div className="mt-1.5 flex items-center gap-1.5">
          <span className={`h-1.5 w-1.5 rounded-full ${meta.dotClass}`} aria-hidden="true" />
          <span className="text-xs font-medium text-white/55">{meta.label}</span>
          <span className="text-xs text-white/30">· Submitted {formatRelativeTime(order.createdAt)}</span>
        </div>
      </div>

      <div>
        <span className="text-xs font-semibold uppercase tracking-wider text-white/35">
          Project description
        </span>
        <p className="mt-1 whitespace-pre-wrap text-sm text-white/70">{order.description}</p>
      </div>

      {order.finalPriceUsd != null ? (
        order.paymentSummary.hasInstallments ? (
          // Paid / Remaining (16 Agustus 2026, Fase 1 Payment Architecture +
          // Fase 7's client-UX principle — client must always be able to see
          // how much they've paid and how much is left). Replaces the plain
          // "Agreed Price" line for any order that actually has a
          // payment_method (full_payment now included, not just
          // installments — see paymentSummary's own comment). A legacy
          // order with no order_installments rows still falls through to
          // the plain Agreed Price line below, since it has no partial
          // state to report.
          <div className="flex flex-col gap-2 rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-300">
                {order.paymentSummary.paymentStatus === "paid" ? "Paid in Full" : "Project Total"}
              </p>
              <p className="text-base font-bold text-white">
                ${order.paymentSummary.totalAmountUsd.toLocaleString("en-US")}
              </p>
            </div>
            {order.paymentSummary.paymentStatus !== "paid" ? (
              <div className="flex items-center justify-between text-xs">
                <span className="text-white/50">
                  Paid ${order.paymentSummary.paidAmountUsd.toLocaleString("en-US")}
                </span>
                <span className="font-semibold text-amber-300">
                  ${order.paymentSummary.remainingAmountUsd.toLocaleString("en-US")} remaining
                </span>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="flex items-center justify-between rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-2.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-300">Agreed Price</p>
            <p className="text-base font-bold text-white">${order.finalPriceUsd.toLocaleString("en-US")}</p>
          </div>
        )
      ) : null}

      {showPayment ? (
        <div className="border-t border-white/[0.08] pt-4">
          {order.paymentMethod != null ? (
            // Any order with a payment_method — installments OR full_payment
            // (widened 16 Agustus 2026, Fase 1 Payment Architecture: full
            // Payment orders now go through the SAME order_installments-backed
            // flow as installments orders instead of the legacy PaymentPanel/
            // orders.payment_* columns, per the user's "migrasi penuh"
            // decision — see project memory's
            // order_payment_invoice_refactor_fase0.md). materialize_order_installments
            // (0038) always generates at least one row (a single 100% row
            // for full_payment), so InstallmentSchedule renders correctly
            // either way — it already displays a single "Full Payment" card
            // with no "Milestone N" framing when there's only one row. Note
            // this stays mounted even once order.status flips to "paid" —
            // handle_installment_paid (0038) flips the PARENT order to
            // 'paid' the moment installment #1 clears (product decision
            // #1), while milestone #2/#3 can still be sitting there
            // unpaid — showPayment's PAYMENT_VISIBLE_STATUSES already
            // includes "paid" for exactly this reason. A LEGACY order
            // (paymentMethod null — predates this column, or a Creative
            // Agent order today) still falls through to PaymentPanel below,
            // unchanged.
            <InstallmentSchedule
              orderId={order.id}
              walletOptions={walletOptions}
              installments={order.installments}
            />
          ) : (
            <PaymentPanel
              orderId={order.id}
              status={order.status}
              finalPriceUsd={order.finalPriceUsd}
              walletOptions={walletOptions}
              voucherRedemption={order.voucherRedemption}
              payment={{
                network: order.paymentNetwork,
                token: order.paymentToken,
                walletAddress: order.paymentWalletAddress,
                expectedAmount: order.paymentExpectedAmount,
                txHash: order.paymentTxHash,
                submittedAt: order.paymentSubmittedAt,
                verifiedAt: order.paymentVerifiedAt,
                underpaidNote: order.paymentUnderpaidNote,
              }}
            />
          )}
        </div>
      ) : null}
    </div>
  );
}
