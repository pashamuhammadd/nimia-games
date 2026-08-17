// Admin-side mirror of apps/app/modules/order/pricing/order-payment-
// summary.ts's getOrderPaymentSummary() — Fase 9 (Admin dashboard,
// operational views) of the 16 Agustus 2026 Order/Payment/Invoice
// refactor. FASE0-AUDIT.md Current Problems #9: "Admin /orders ...
// Tidak ada kolom 'Paid $X/$Y' atau 'Remaining' langsung di row."
//
// Kept as its own hand-synced copy rather than imported cross-app — this
// repo's apps (app/admin/studio/www) are separate Next.js apps in the
// Turborepo with no shared-code path except packages/*, same reasoning
// already documented for CreativeAgentPaymentMethod (apps/studio) staying
// a local duplicate of apps/app's type. The DB function
// (get_order_payment_summary(), 0043) is the actual source of truth;
// NOTHING here ever writes anything, and this admin copy MUST be kept in
// lockstep BY HAND with both the SQL function and apps/app's own copy if
// either one's branching or rounding ever changes.

export type OrderPaymentStatus = "unpaid" | "partially_paid" | "paid" | "overdue";

export interface OrderPaymentSummary {
  totalAmountUsd: number;
  paidAmountUsd: number;
  remainingAmountUsd: number;
  paymentStatus: OrderPaymentStatus;
  hasInstallments: boolean;
}

// Full public.installment_status enum (0038).
export type AnyInstallmentStatus = "scheduled" | "pending_payment" | "payment_submitted" | "paid" | "overdue" | "cancelled";

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Identical logic to apps/app's getOrderPaymentSummary — see that file's
 * own header comment for the full two-branch explanation (materialized
 * order_installments rows vs legacy orders.status fallback).
 */
export function getOrderPaymentSummary(input: {
  finalPriceUsd: number | null;
  orderStatus: string;
  installments: { amountUsd: number; status: AnyInstallmentStatus }[];
}): OrderPaymentSummary {
  const { finalPriceUsd, orderStatus, installments } = input;
  const total = finalPriceUsd ?? 0;
  const hasInstallments = installments.length > 0;

  const paid = hasInstallments
    ? round2(installments.filter((row) => row.status === "paid").reduce((sum, row) => sum + row.amountUsd, 0))
    : orderStatus === "paid"
      ? total
      : 0;

  const remaining = Math.max(round2(total - paid), 0);

  let paymentStatus: OrderPaymentStatus;
  if (finalPriceUsd == null || total <= 0) paymentStatus = "unpaid";
  else if (paid >= total) paymentStatus = "paid";
  else if (paid > 0) paymentStatus = "partially_paid";
  else paymentStatus = "unpaid";

  return { totalAmountUsd: total, paidAmountUsd: paid, remainingAmountUsd: remaining, paymentStatus, hasInstallments };
}
