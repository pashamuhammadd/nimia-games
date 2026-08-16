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
        <div className="flex items-center justify-between rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-2.5">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-300">Agreed Price</p>
          <p className="text-base font-bold text-white">${order.finalPriceUsd.toLocaleString("en-US")}</p>
        </div>
      ) : null}

      {showPayment ? (
        <div className="border-t border-white/[0.08] pt-4">
          {order.paymentMethod === "installments" ? (
            // Installments order (15 Agustus 2026 — generalized from Custom
            // Order to every flow, see project memory's
            // payment_method_generalization_15agst.md): each milestone pays
            // independently, so this renders the whole schedule instead of
            // PaymentPanel's single order-level payment flow. Note this
            // stays mounted even once order.status flips to "paid" —
            // handle_installment_paid (0038) flips the PARENT order to
            // 'paid' the moment installment #1 clears (product decision
            // #1), while milestone #2/#3 can still be sitting there
            // unpaid — showPayment's PAYMENT_VISIBLE_STATUSES already
            // includes "paid" for exactly this reason.
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
