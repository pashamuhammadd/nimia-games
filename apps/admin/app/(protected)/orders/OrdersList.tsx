"use client";

import * as React from "react";
import { Modal, cn } from "@nimia/ui";
import { orderStatusMeta } from "../../lib/orderStatus";
import { formatRelativeTime } from "../../lib/relativeTime";
import type { OrderPaymentSummary } from "../../lib/orderPaymentSummary";
import { operationalBucketMeta, type OperationalBucket } from "../../lib/operationalStatus";
import { OrderDetailPanel } from "./OrderDetailPanel";

export type NegotiationOfferRow = {
  id: string;
  proposed_by: string;
  amount_usd: number;
  message: string | null;
  created_at: string;
};

export type OrderListItem = {
  id: string;
  full_name: string;
  company_name: string | null;
  email: string;
  whatsapp: string | null;
  country: string | null;
  budget: string | null;
  deadline: string | null;
  description: string;
  reference_link: string | null;
  status: string;
  // Added 3 Agustus 2026, per user request ("kok gaada list yang nego
  // sih") — proposed_price_usd is the client's/system's asking price,
  // final_price_usd is set once staff accepts an offer (see
  // acceptNegotiationOfferAction in ./actions.ts), and order_negotiations
  // is the full back-and-forth offer history rendered in
  // OrderDetailPanel.
  proposed_price_usd: number | null;
  final_price_usd: number | null;
  created_at: string;
  services: { name: string } | null;
  // Added 12 Agustus 2026 (order-flow audit fix) — set for Package/Bundle
  // orders only, which have services=null (see
  // packages/db/migrations/0036_order_package_name.sql). Falls back to
  // "Custom Project" only when BOTH this and services are null, i.e. a
  // genuinely custom order.
  package_name: string | null;
  clients: { company_name: string | null } | null;
  order_files: { id: string; file_name: string; file_url: string }[];
  order_negotiations: NegotiationOfferRow[];
  // Payment fields (3 Agustus 2026, second pass, per user request —
  // "kenapa belum bisa bayar/kirim pembayaran"). Null until the client
  // submits a payment via apps/studio's PaymentPanel — see
  // apps/studio/app/dashboard/orders/payment-actions.ts.
  payment_network: string | null;
  payment_token: string | null;
  payment_wallet_address: string | null;
  payment_expected_amount: number | null;
  payment_tx_hash: string | null;
  payment_submitted_at: string | null;
  payment_verified_at: string | null;
  payment_underpaid_note: string | null;
  // Payment Plan (15 Agustus 2026 — see
  // packages/db/migrations/0038_custom_order_installments.sql). Originally
  // Custom-Order-only; generalized the same day to every order_flow_type
  // once the client wizard's "Choose how to pay" step was extended to
  // Project Builder and Package orders too (see
  // apps/app/modules/order/state/submit-order-action.ts) — payment_method
  // is null only for a legacy order that predates that step existing at
  // all, regardless of flow type.
  // 16 Agustus 2026 (Fase 7, Unified Order Creation) — added
  // "creative_agent" (0047_creative_agent_order_flow_type.sql): Creative
  // Agent orders (apps/studio) used to write "custom" here, identical to a
  // real Custom Order Builder submission from apps/app — see that
  // migration's own header comment. Not read as a property anywhere in
  // this file today (confirmed by grep before widening this type) — the
  // "what is this order" label below still reads
  // `services?.name ?? package_name ?? "Custom Project"`, which already
  // differs in practice ("Creative Agent Brief: X" vs "Custom Order: X"),
  // so nothing else needed to change here for existing orders to keep
  // rendering correctly.
  order_flow_type: "project_builder" | "package" | "custom" | "creative_agent";
  payment_method: "full_payment" | "installments" | null;
  payment_plan: "none" | "two_milestones" | "three_milestones" | "custom";
  normal_price_usd: number | null;
  order_installments: OrderInstallmentRow[];
  // Fase 9 (16 Agustus 2026, Admin dashboard operational views) — both
  // computed server-side in page.tsx (mapOrderRow), not here, so this
  // list/detail pair never duplicates the join+classification logic. See
  // ../../lib/orderPaymentSummary.ts and ../../lib/operationalStatus.ts.
  paymentSummary: OrderPaymentSummary;
  operationalBucket: OperationalBucket;
};

export type OrderInstallmentRow = {
  id: string;
  sequence: number;
  label: string;
  percentage: number;
  amount_usd: number;
  status: string;
  payment_network: string | null;
  payment_token: string | null;
  payment_tx_hash: string | null;
  payment_submitted_at: string | null;
  payment_verified_at: string | null;
  payment_underpaid_note: string | null;
};

// Deterministic per-client accent, same trick as
// apps/studio/app/components/dashboard/ActiveOrdersSection.tsx — picks from
// a fixed on-brand palette rather than hashing to arbitrary hues, so the
// same client always gets the same "avatar" color.
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

function initialsFor(text: string) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  return (words[0]?.[0] ?? "?").toUpperCase() + (words[1]?.[0] ?? "").toUpperCase();
}

function formatUsd(amount: number) {
  return `$${amount.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
}

// Rendered as a card list rather than a literal <table> — matches the
// visual language every other dark-dashboard section already uses
// (StatCard, ActiveOrdersSection, PendingOrdersSection) and reads better on
// mobile than a table would. Holds the currently-open order in local state
// and renders its detail/action UI inside a shared Modal.
export function OrdersList({ orders }: { orders: OrderListItem[] }) {
  const [selected, setSelected] = React.useState<OrderListItem | null>(null);

  // Keep the open modal's `selected` order in sync with fresh server data
  // (15 Agustus 2026, admin installment UI) — every action in
  // OrderDetailPanel calls `router.refresh()` on success, which re-fetches
  // `orders` here, but a plain useState doesn't auto-update to a new
  // object just because the array containing it changed. Previously this
  // didn't matter much: most actions collapse the panel to a "Close"
  // button right after succeeding. The Payment Plan picker and Installment
  // Schedule sections don't (an admin may need to verify/flag more than
  // one installment in the same sitting), so without this, they'd keep
  // showing stale data (e.g. the payment-plan picker instead of the
  // saved plan) until the modal was closed and reopened.
  React.useEffect(() => {
    setSelected((prev) => (prev ? (orders.find((o) => o.id === prev.id) ?? prev) : prev));
  }, [orders]);

  if (orders.length === 0) {
    return (
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] px-6 py-16 text-center text-sm text-white/40">
        No orders match this filter.
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-3">
        {orders.map((order) => {
          const clientLabel = order.clients?.company_name || order.company_name || order.full_name;
          const meta = orderStatusMeta(order.status);
          // Latest offer in the thread (client's or staff's) — surfaced
          // right in the list row so a negotiating order's asking price is
          // visible at a glance, not just after opening the detail panel.
          // PostgREST doesn't guarantee embed array order, so this picks by
          // created_at rather than assuming array position.
          const latestOffer = order.order_negotiations.reduce<NegotiationOfferRow | null>(
            (latest, offer) =>
              !latest || offer.created_at > latest.created_at ? offer : latest,
            null,
          );
          // Installment orders needing action (15 Agustus 2026, admin
          // installment UI) — surfaced right in the list row, same reason
          // latestOffer is: an admin scanning the list should be able to
          // spot "an installment is waiting on me" without opening every
          // order's detail panel one by one.
          const installmentNeedsReview = order.order_installments.some(
            (inst) => inst.status === "payment_submitted",
          );
          return (
            <button
              key={order.id}
              type="button"
              onClick={() => setSelected(order)}
              className="flex flex-col gap-4 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-left transition-colors hover:border-white/[0.12] sm:flex-row sm:items-center"
            >
              <div
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-sm font-bold text-white ${thumbnailGradient(clientLabel)}`}
                aria-hidden="true"
              >
                {initialsFor(clientLabel)}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3">
                  <p className="truncate text-sm font-semibold text-white">{clientLabel}</p>
                  <span className="shrink-0 text-xs text-white/35">
                    {formatRelativeTime(order.created_at)}
                  </span>
                </div>
                <p className="mt-0.5 truncate text-xs text-white/45">
                  {order.services?.name ?? order.package_name ?? "Custom Project"}
                  {order.budget ? ` · ${order.budget}` : ""}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <span className={`h-1.5 w-1.5 rounded-full ${meta.dotClass}`} aria-hidden="true" />
                  <span className="text-xs font-medium text-white/50">{meta.label}</span>
                  {/* Operational bucket (16 Agustus 2026, Fase 9) — a
                      coarser, grouped lens ADDED alongside the precise raw
                      status above, not replacing it. See
                      ../../lib/operationalStatus.ts's own header comment. */}
                  {(() => {
                    const bucketMeta = operationalBucketMeta(order.operationalBucket);
                    return (
                      <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/60">
                        <span className={cn("h-1.5 w-1.5 rounded-full", bucketMeta.dotClass)} aria-hidden="true" />
                        {bucketMeta.label}
                      </span>
                    );
                  })()}
                  {latestOffer ? (
                    <span className="text-xs text-white/35">
                      · {latestOffer.proposed_by === "client" ? "Client offered" : "You offered"} $
                      {latestOffer.amount_usd.toLocaleString("en-US")}
                    </span>
                  ) : null}
                  {/* Full Payment / Installments — both shown now (15
                      Agustus 2026, two-lane admin UI), not just
                      Installments, so the two lanes read symmetrically at a
                      glance in the list instead of "badge present = cicilan,
                      badge absent = ambiguous (full payment OR not decided
                      yet)". A legacy order that predates the client wizard
                      carrying payment_method at all still shows neither,
                      which is the honest "not set" state. */}
                  {order.payment_method === "installments" ? (
                    <span className="rounded-full bg-purple-400/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-purple-300">
                      Installments
                    </span>
                  ) : order.payment_method === "full_payment" ? (
                    <span className="rounded-full bg-sky-400/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-sky-300">
                      Full Payment
                    </span>
                  ) : null}
                  {installmentNeedsReview ? (
                    <span className="rounded-full bg-amber-400/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-300">
                      Payment to verify
                    </span>
                  ) : null}
                </div>
                {/* Paid/Remaining (16 Agustus 2026, Fase 9) —
                    FASE0-AUDIT.md problem #9: "Tidak ada kolom 'Paid
                    $X/$Y' atau 'Remaining' langsung di row." Only shown
                    once a real price exists. */}
                {order.paymentSummary.totalAmountUsd > 0 ? (
                  <p className="mt-1 text-xs font-medium text-white/45">
                    Paid {formatUsd(order.paymentSummary.paidAmountUsd)} / {formatUsd(order.paymentSummary.totalAmountUsd)}
                    {order.paymentSummary.remainingAmountUsd > 0 ? (
                      <span className="text-amber-300/80"> · Remaining {formatUsd(order.paymentSummary.remainingAmountUsd)}</span>
                    ) : null}
                  </p>
                ) : null}
              </div>

              <span className="shrink-0 self-start rounded-lg border border-white/10 px-3.5 py-2 text-center text-xs font-semibold text-white/80 sm:self-center">
                View
              </span>
            </button>
          );
        })}
      </div>

      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        ariaLabel="Order detail"
        className="max-w-lg"
      >
        {/* key={selected.id} (15 Agustus 2026, financial-safety fix, found
            while generalizing the Payment Plan picker) — without this,
            clicking a different order row while the panel is already open
            (setSelected fires directly, see above; nothing closes the panel
            first) reused the SAME OrderDetailPanel instance across orders.
            Every piece of its local useState — quotationPrice,
            paymentMethodChoice, planChoice, customPercentagesText/
            customLabelsText, installmentNotes, even the success/error
            banners — is initialized once and does NOT reset just because
            the `order` prop changed. An admin who half-fills a price or a
            payment plan for Order A, then clicks straight into Order B,
            would see Order A's stale input values sitting in Order B's
            form, one click away from being saved against the wrong order.
            Forcing a remount on order id makes every field start fresh for
            whichever order is actually on screen. */}
        {selected ? <OrderDetailPanel key={selected.id} order={selected} onClose={() => setSelected(null)} /> : null}
      </Modal>
    </>
  );
}
