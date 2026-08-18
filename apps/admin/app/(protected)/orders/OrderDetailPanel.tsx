"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Mail,
  MessageCircle,
  Globe2,
  Wallet,
  CalendarClock,
  Link as LinkIcon,
  Paperclip,
  Handshake,
  ShieldCheck,
  AlertTriangle,
  Download,
  CreditCard,
  Milestone,
} from "lucide-react";
import { cn } from "@nimia/ui";
import { orderStatusMeta, installmentStatusMeta } from "../../lib/orderStatus";
import { formatRelativeTime } from "../../lib/relativeTime";
import { operationalBucketMeta } from "../../lib/operationalStatus";
import {
  approveOrderAction,
  rejectOrderAction,
  convertToProjectAction,
  sendQuotationForPaymentAction,
  acceptNegotiationOfferAction,
  sendCounterOfferAction,
  rejectNegotiationAction,
  verifyPaymentAction,
  flagUnderpaidPaymentAction,
  verifyInstallmentPaymentAction,
  flagUnderpaidInstallmentAction,
  type OrderActionResult,
} from "./actions";
import type { OrderListItem } from "./OrdersList";

// Display labels for public.crypto_network (packages/db/migrations/0013,
// extended with 'ton' in 0014) — mirrors
// apps/studio/app/dashboard/orders/PaymentPanel.tsx's own copy so the same
// network reads the same in both apps.
const NETWORK_LABELS: Record<string, string> = {
  ethereum: "Ethereum",
  bsc: "BNB Smart Chain (BSC)",
  tron: "Tron",
  solana: "Solana",
  cardano: "Cardano",
  ton: "TON",
};

function formatCryptoAmount(amount: number, symbol: string) {
  return `${amount.toLocaleString("en-US", { maximumFractionDigits: 6 })} ${symbol}`;
}

export function OrderDetailPanel({
  order,
  onClose,
}: {
  order: OrderListItem;
  onClose: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);
  const [actionTaken, setActionTaken] = React.useState<string | null>(null);
  const [counterOffer, setCounterOffer] = React.useState("");
  const [underpaidNote, setUnderpaidNote] = React.useState("");
  // Per-installment note/result state (15 Agustus 2026, admin installment
  // UI) — keyed by installment id rather than the single `underpaidNote`/
  // `actionTaken` above, since an order can have 2-3 installments and
  // staff may need to act on more than one without the panel hiding the
  // others the moment one is handled.
  const [installmentNotes, setInstallmentNotes] = React.useState<Record<string, string>>({});
  const [installmentActionTaken, setInstallmentActionTaken] = React.useState<Record<string, string>>({});
  // Prefilled with the client's own price-calculator estimate, if any (5
  // Agustus 2026, bug fix — see sendQuotationForPaymentAction's comment in
  // ./actions.ts for why this field exists at all: a plain "Submit Order"
  // — not "Negotiate Price" — order had no way to ever reach
  // awaiting_payment before this).
  const [quotationPrice, setQuotationPrice] = React.useState(
    order.proposed_price_usd != null ? String(order.proposed_price_usd) : "",
  );
  const meta = orderStatusMeta(order.status);
  const clientLabel = order.clients?.company_name || order.company_name || order.full_name;

  // Negotiation offer thread (3 Agustus 2026, per user request — "kok
  // gaada list yang nego sih"). Sorted oldest-first, same as the client's
  // own view in
  // apps/studio/app/dashboard/negotiations/NegotiationThreadList.tsx —
  // PostgREST doesn't guarantee embed array order, so this can't assume
  // order.order_negotiations already arrived sorted.
  const offers = [...order.order_negotiations].sort((a, b) => a.created_at.localeCompare(b.created_at));
  const latestOffer = offers[offers.length - 1] ?? null;

  function run(action: () => Promise<OrderActionResult>, doneMessage: string) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.success) {
        setError(result.error);
        return;
      }
      setActionTaken(doneMessage);
      // The order list is server-rendered data held in this Client
      // Component's props — refresh so the underlying page re-fetches and
      // shows the new status once this modal is closed.
      router.refresh();
    });
  }

  // Same as `run` above but scoped to one order_installments row — doesn't
  // set the panel-wide `actionTaken` (which hides the whole action area),
  // so verifying/flagging one installment doesn't hide the others.
  function runInstallment(
    installmentId: string,
    action: () => Promise<OrderActionResult>,
    doneMessage: string,
  ) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.success) {
        setError(result.error);
        return;
      }
      setInstallmentActionTaken((prev) => ({ ...prev, [installmentId]: doneMessage }));
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <span className="text-xs font-semibold uppercase tracking-wider text-white/35">Order from</span>
        <h2 className="mt-1 text-lg font-bold text-white">{clientLabel}</h2>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <span className={`h-1.5 w-1.5 rounded-full ${meta.dotClass}`} aria-hidden="true" />
          <span className="text-xs font-medium text-white/55">{meta.label}</span>
          {/* Operational bucket (16 Agustus 2026, Fase 9) — see
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
        </div>
      </div>

      {/* Paid / Remaining (16 Agustus 2026, Fase 9) — FASE0-AUDIT.md
          problem #9: no "Paid $X/$Y"/"Remaining" anywhere in admin.
          Mirrors apps/app's OrderDetail.tsx card exactly (same visual
          language, same paymentSummary shape) so the same order reads the
          same way in both apps. Only rendered once a real price exists. */}
      {order.paymentSummary.totalAmountUsd > 0 ? (
        <div className="flex flex-col gap-2 rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-300">
              {order.paymentSummary.paymentStatus === "paid" ? "Paid in Full" : "Project Total"}
            </p>
            <p className="text-base font-bold text-white">
              {`$${order.paymentSummary.totalAmountUsd.toLocaleString("en-US")}`}
            </p>
          </div>
          {order.paymentSummary.paymentStatus !== "paid" ? (
            <div className="flex items-center justify-between text-xs">
              <span className="text-white/50">{`Paid $${order.paymentSummary.paidAmountUsd.toLocaleString("en-US")}`}</span>
              <span className="font-semibold text-amber-300">{`$${order.paymentSummary.remainingAmountUsd.toLocaleString("en-US")} remaining`}</span>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
        <div className="flex items-center gap-2 text-white/70">
          <Mail className="h-4 w-4 shrink-0 text-white/35" aria-hidden="true" />
          <span className="truncate">{order.email}</span>
        </div>
        {order.whatsapp ? (
          <div className="flex items-center gap-2 text-white/70">
            <MessageCircle className="h-4 w-4 shrink-0 text-white/35" aria-hidden="true" />
            {order.whatsapp}
          </div>
        ) : null}
        {order.country ? (
          <div className="flex items-center gap-2 text-white/70">
            <Globe2 className="h-4 w-4 shrink-0 text-white/35" aria-hidden="true" />
            {order.country}
          </div>
        ) : null}
        {order.budget ? (
          <div className="flex items-center gap-2 text-white/70">
            <Wallet className="h-4 w-4 shrink-0 text-white/35" aria-hidden="true" />
            {order.budget}
          </div>
        ) : null}
        {order.deadline ? (
          <div className="flex items-center gap-2 text-white/70">
            <CalendarClock className="h-4 w-4 shrink-0 text-white/35" aria-hidden="true" />
            {order.deadline}
          </div>
        ) : null}
        {order.reference_link ? (
          <a
            href={order.reference_link}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-[var(--nimia-pink)] hover:text-white"
          >
            <LinkIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
            Reference link
          </a>
        ) : null}
      </div>

      <div>
        <span className="text-xs font-semibold uppercase tracking-wider text-white/35">Service</span>
        {/* package_name fallback (12 Agustus 2026, order-flow audit fix) —
            a Package/Bundle order has services=null; see
            packages/db/migrations/0036_order_package_name.sql. */}
        <p className="mt-1 text-sm text-white/80">{order.services?.name ?? order.package_name ?? "Custom Project"}</p>
      </div>

      {/* Payment Plan — READ-ONLY (18 Agustus 2026, per user request:
          "Admin tidak lagi menentukan rencana cicilan/harga — tugas Admin
          hanya memverifikasi pembayaran yang di-submit"). This used to be
          an editable picker letting Admin choose Full Payment vs
          Installments and, for Installments, the 2/3-milestone split or a
          fully custom percentage breakdown (0038's original product
          decision #4). That's reversed now: the CLIENT picks the payment
          method AND the milestone plan itself at submission time (see
          apps/app/modules/order/components/payment-method-step.tsx and
          submit-order-action.ts/submit-custom-order-action.ts, which write
          `payment_method`/`payment_plan` straight from the client's own
          wizard choice), with a tiered fee baked in server-side (2
          installments cost less than 3 — see migration
          0051_tiered_installment_plans.sql's get_installment_fee_percentage).
          setOrderPaymentPlanAction still exists in ./actions.ts (kept for
          any legacy/edge-case order that predates this change and never
          got a plan set), but the primary admin UI no longer calls it —
          Admin's only remaining job on the payment side is verifying/
          flagging submitted payments below (verifyPaymentAction/
          flagUnderpaidPaymentAction/verifyInstallmentPaymentAction/
          flagUnderpaidInstallmentAction), exactly per the user's request.
          Shown for every order that has a payment_method at all, at any
          status — there's no "picker vs summary" status split to maintain
          anymore, just one plain display of what the client chose. */}
      {order.payment_method ? (
        <div className="flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-xs text-white/60">
          <CreditCard className="h-3.5 w-3.5 shrink-0 text-white/35" aria-hidden="true" />
          {order.payment_method === "full_payment"
            ? "Full Payment"
            : `Installments — ${order.payment_plan.replace("_", " ")} (client's choice)`}
          {order.normal_price_usd != null ? (
            <span className="text-white/35">· normal price ${order.normal_price_usd.toLocaleString("en-US")}</span>
          ) : null}
        </div>
      ) : null}

      <div>
        <span className="text-xs font-semibold uppercase tracking-wider text-white/35">
          Project description
        </span>
        <p className="mt-1 whitespace-pre-wrap text-sm text-white/70">{order.description}</p>
      </div>

      {offers.length > 0 ? (
        <div>
          <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-white/35">
            <Handshake className="h-3.5 w-3.5" aria-hidden="true" />
            Negotiation
          </span>
          <div className="mt-2 flex flex-col gap-2.5">
            {offers.map((offer) => {
              const isYours = offer.proposed_by === "staff";
              return (
                <div
                  key={offer.id}
                  className={cn(
                    "max-w-[85%] rounded-xl border px-4 py-2.5",
                    isYours
                      ? "ml-auto border-[var(--nimia-crimson)]/30 bg-[var(--nimia-crimson)]/10"
                      : "mr-auto border-white/10 bg-white/[0.04]",
                  )}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-white/50">
                      {isYours ? "You" : clientLabel}
                    </p>
                    <p className="text-xs text-white/35">{formatRelativeTime(offer.created_at)}</p>
                  </div>
                  <p className="mt-1 text-base font-bold text-white">
                    ${offer.amount_usd.toLocaleString("en-US")}
                  </p>
                  {offer.message ? <p className="mt-1 text-sm text-white/60">{offer.message}</p> : null}
                </div>
              );
            })}
          </div>
          {order.final_price_usd != null ? (
            <div className="mt-3 flex items-center justify-between rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-2.5">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-300">Agreed Price</p>
              <p className="text-base font-bold text-white">
                ${order.final_price_usd.toLocaleString("en-US")}
              </p>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Payment details (3 Agustus 2026, second pass, per user request —
          "kenapa belum bisa bayar/kirim pembayaran"). Only shows once the
          client has actually submitted something — payment_submitted_at is
          null while just waiting on them at 'awaiting_payment'. */}
      {order.payment_submitted_at ? (
        <div>
          <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-white/35">
            <Wallet className="h-3.5 w-3.5" aria-hidden="true" />
            Payment
          </span>
          <div className="mt-2 flex flex-col gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] p-4 text-sm">
            {order.payment_network ? (
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs text-white/40">Network</span>
                <span className="text-white/80">
                  {NETWORK_LABELS[order.payment_network] ?? order.payment_network}
                </span>
              </div>
            ) : null}
            {order.payment_expected_amount != null && order.payment_token ? (
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs text-white/40">Amount</span>
                <span className="text-white/80">
                  {formatCryptoAmount(order.payment_expected_amount, order.payment_token)}
                </span>
              </div>
            ) : null}
            {order.payment_wallet_address ? (
              <div className="flex items-center justify-between gap-3">
                <span className="shrink-0 text-xs text-white/40">To address</span>
                <span className="truncate font-mono text-xs text-white/80">
                  {order.payment_wallet_address}
                </span>
              </div>
            ) : null}
            {order.payment_tx_hash ? (
              <div className="flex items-center justify-between gap-3">
                <span className="shrink-0 text-xs text-white/40">Tx hash</span>
                <span className="truncate font-mono text-xs text-white/80">{order.payment_tx_hash}</span>
              </div>
            ) : null}
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs text-white/40">Submitted</span>
              <span className="text-white/80">{formatRelativeTime(order.payment_submitted_at)}</span>
            </div>
            {order.payment_verified_at ? (
              <div className="flex items-center gap-2 text-emerald-300">
                <ShieldCheck className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span className="text-xs">Verified {formatRelativeTime(order.payment_verified_at)}</span>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* Installment Schedule (Custom Order + Payment Plan, 15 Agustus
          2026) — one card per order_installments row, generated by
          materialize_order_installments() (0038) the moment this order
          transitions into Awaiting Payment. Rendered unconditionally
          (outside the `!actionTaken` gate below) so verifying/flagging one
          milestone doesn't hide the others or the rest of the panel. */}
      {order.order_installments.length > 0 ? (
        <div>
          <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-white/35">
            <Milestone className="h-3.5 w-3.5" aria-hidden="true" />
            Installment Schedule
          </span>
          <div className="mt-2 flex flex-col gap-2.5">
            {[...order.order_installments]
              .sort((a, b) => a.sequence - b.sequence)
              .map((inst) => {
                const instMeta = installmentStatusMeta(inst.status);
                const doneMessage = installmentActionTaken[inst.id];
                return (
                  <div
                    key={inst.id}
                    className="flex flex-col gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] p-4 text-sm"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-semibold text-white">
                        {inst.sequence}. {inst.label}
                      </span>
                      <span className="text-white/80">${inst.amount_usd.toLocaleString("en-US")}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-1.5">
                        <span className={`h-1.5 w-1.5 rounded-full ${instMeta.dotClass}`} aria-hidden="true" />
                        <span className="text-xs font-medium text-white/50">{instMeta.label}</span>
                        <span className="text-xs text-white/35">· {inst.percentage}%</span>
                      </div>
                      {inst.status === "paid" ? (
                        // Per-milestone receipt (16 Agustus 2026, Fase 2
                        // Invoice Architecture) — always passes
                        // ?installment= explicitly so this works whether
                        // this is the order's only installment or one of
                        // several; get_or_create_order_receipt raises if a
                        // multi-installment order's receipt is requested
                        // without one.
                        <a
                          href={`/api/orders/${order.id}/receipt?installment=${inst.id}`}
                          className="flex shrink-0 items-center gap-1 rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 text-[11px] font-semibold text-white/70 transition-colors hover:bg-white/10 hover:text-white"
                        >
                          <Download className="h-3 w-3" aria-hidden="true" />
                          Receipt
                        </a>
                      ) : null}
                    </div>

                    {inst.payment_tx_hash ? (
                      <div className="flex flex-col gap-1 border-t border-white/[0.06] pt-2 text-xs">
                        {inst.payment_network ? (
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-white/40">Network</span>
                            <span className="text-white/80">
                              {NETWORK_LABELS[inst.payment_network] ?? inst.payment_network}
                            </span>
                          </div>
                        ) : null}
                        <div className="flex items-center justify-between gap-3">
                          <span className="shrink-0 text-white/40">Tx hash</span>
                          <span className="truncate font-mono text-white/80">{inst.payment_tx_hash}</span>
                        </div>
                        {inst.payment_submitted_at ? (
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-white/40">Submitted</span>
                            <span className="text-white/80">
                              {formatRelativeTime(inst.payment_submitted_at)}
                            </span>
                          </div>
                        ) : null}
                      </div>
                    ) : null}

                    {doneMessage ? (
                      <p className="text-xs text-emerald-400">{doneMessage}</p>
                    ) : inst.status === "payment_submitted" ? (
                      <div className="flex flex-col gap-2 border-t border-white/[0.06] pt-2">
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() =>
                            runInstallment(
                              inst.id,
                              () => verifyInstallmentPaymentAction(inst.id),
                              "Payment verified.",
                            )
                          }
                          className="self-start rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-600 disabled:opacity-50"
                        >
                          Verify Payment
                        </button>
                        <div className="flex flex-col gap-1.5 rounded-lg border border-amber-400/20 bg-amber-400/5 p-2.5">
                          <textarea
                            placeholder="Explain what's wrong (shown to the client)"
                            value={installmentNotes[inst.id] ?? ""}
                            onChange={(event) =>
                              setInstallmentNotes((prev) => ({ ...prev, [inst.id]: event.target.value }))
                            }
                            rows={2}
                            className="w-full resize-none rounded-md border border-white/10 bg-white/[0.04] px-2 py-1.5 text-xs text-white placeholder:text-white/30 focus:outline-none"
                          />
                          <button
                            type="button"
                            disabled={isPending || !(installmentNotes[inst.id] ?? "").trim()}
                            onClick={() => {
                              const note = (installmentNotes[inst.id] ?? "").trim();
                              if (!note) {
                                setError("Explain what's wrong with the payment for the client to see.");
                                return;
                              }
                              runInstallment(
                                inst.id,
                                () => flagUnderpaidInstallmentAction(inst.id, note),
                                "Client asked to resubmit this installment.",
                              );
                            }}
                            className="self-start rounded-lg border border-amber-400/30 px-2.5 py-1 text-xs font-semibold text-amber-300 transition-colors hover:bg-amber-400/10 disabled:opacity-40"
                          >
                            Flag / Ask to Resubmit
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              })}
          </div>
        </div>
      ) : null}

      {order.order_files.length > 0 ? (
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-white/35">Attachments</span>
          <div className="mt-1.5 flex flex-col gap-1.5">
            {order.order_files.map((file) => (
              <a
                key={file.id}
                href={file.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-[var(--nimia-pink)] hover:text-white"
              >
                <Paperclip className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span className="truncate">{file.file_name}</span>
              </a>
            ))}
          </div>
        </div>
      ) : null}

      {error ? <p className="text-sm text-red-400">{error}</p> : null}
      {actionTaken ? <p className="text-sm text-emerald-400">{actionTaken}</p> : null}

      {!actionTaken ? (
        <div className="flex flex-wrap gap-2 border-t border-white/[0.08] pt-4">
          {order.status === "pending_review" ? (
            <>
              <button
                type="button"
                disabled={isPending}
                onClick={() => run(() => approveOrderAction(order.id), "Quotation marked as sent.")}
                className="rounded-lg bg-[var(--nimia-crimson)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--nimia-crimson-hover)] disabled:opacity-50"
              >
                Approve &amp; Send Quotation
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={() => run(() => rejectOrderAction(order.id), "Order rejected.")}
                className="rounded-lg border border-white/10 px-4 py-2 text-sm font-semibold text-white/80 transition-colors hover:bg-red-500/10 hover:text-red-300 disabled:opacity-50"
              >
                Reject
              </button>
            </>
          ) : null}

          {order.status === "quotation_sent" ? (
            <div className="flex w-full flex-col gap-3">
              {/* Send for Payment (5 Agustus 2026, bug fix) — this is the
                  bridge every DIRECT (non-negotiated) order was missing:
                  before this, a quotation_sent order could only go
                  straight to "Convert to Project" (no payment at all) or
                  get rejected, with no way to ever reach awaiting_payment
                  and let the client actually pay via the crypto flow. See
                  sendQuotationForPaymentAction in ./actions.ts. */}
              <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2">
                <span className="text-sm font-semibold text-white/50">$</span>
                <input
                  type="number"
                  min={1}
                  inputMode="decimal"
                  placeholder="Set price & send for payment"
                  value={quotationPrice}
                  onChange={(event) => setQuotationPrice(event.target.value)}
                  className="w-full bg-transparent text-sm text-white placeholder:text-white/30 focus:outline-none"
                />
                <button
                  type="button"
                  disabled={isPending || !quotationPrice.trim()}
                  onClick={() => {
                    const amount = Number(quotationPrice.trim());
                    if (!quotationPrice.trim() || Number.isNaN(amount) || amount <= 0) {
                      setError("Enter a valid price.");
                      return;
                    }
                    run(
                      () => sendQuotationForPaymentAction(order.id, amount),
                      `Price set at $${amount.toLocaleString("en-US")}. Order moved to Awaiting Payment.`,
                    );
                  }}
                  className="shrink-0 rounded-lg bg-emerald-500 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-600 disabled:opacity-40"
                >
                  Send for Payment
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => run(() => convertToProjectAction(order.id), "Converted to a project.")}
                  className="rounded-lg bg-[var(--nimia-crimson)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--nimia-crimson-hover)] disabled:opacity-50"
                >
                  Convert to Project
                </button>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => run(() => rejectOrderAction(order.id), "Order rejected.")}
                  className="rounded-lg border border-white/10 px-4 py-2 text-sm font-semibold text-white/80 transition-colors hover:bg-red-500/10 hover:text-red-300 disabled:opacity-50"
                >
                  Reject
                </button>
              </div>
            </div>
          ) : null}

          {order.status === "negotiating" ? (
            <div className="flex w-full flex-col gap-3">
              <div className="flex flex-wrap gap-2">
                {latestOffer && latestOffer.proposed_by === "client" ? (
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() =>
                      run(
                        () => acceptNegotiationOfferAction(order.id, latestOffer.amount_usd),
                        `Accepted at $${latestOffer.amount_usd.toLocaleString("en-US")}. Order moved to Awaiting Payment.`,
                      )
                    }
                    className="rounded-lg bg-[var(--nimia-crimson)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--nimia-crimson-hover)] disabled:opacity-50"
                  >
                    Accept ${latestOffer.amount_usd.toLocaleString("en-US")} Offer
                  </button>
                ) : null}
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => run(() => rejectNegotiationAction(order.id), "Order rejected.")}
                  className="rounded-lg border border-white/10 px-4 py-2 text-sm font-semibold text-white/80 transition-colors hover:bg-red-500/10 hover:text-red-300 disabled:opacity-50"
                >
                  Reject
                </button>
              </div>

              <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2">
                <span className="text-sm font-semibold text-white/50">$</span>
                <input
                  type="number"
                  min={1}
                  inputMode="decimal"
                  placeholder="Send a counter offer"
                  value={counterOffer}
                  onChange={(event) => setCounterOffer(event.target.value)}
                  className="w-full bg-transparent text-sm text-white placeholder:text-white/30 focus:outline-none"
                />
                <button
                  type="button"
                  disabled={isPending || !counterOffer.trim()}
                  onClick={() => {
                    const amount = Number(counterOffer.trim());
                    if (!counterOffer.trim() || Number.isNaN(amount) || amount <= 0) {
                      setError("Enter a valid counter offer amount.");
                      return;
                    }
                    run(
                      () => sendCounterOfferAction(order.id, amount),
                      "Counter offer sent.",
                    );
                  }}
                  className="shrink-0 rounded-lg bg-white/10 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-white/20 disabled:opacity-40"
                >
                  Send
                </button>
              </div>
            </div>
          ) : null}

          {order.status === "payment_submitted" ? (
            <div className="flex w-full flex-col gap-3">
              <button
                type="button"
                disabled={isPending}
                onClick={() =>
                  run(() => verifyPaymentAction(order.id), "Payment verified. Order marked as Paid.")
                }
                className="self-start rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-600 disabled:opacity-50"
              >
                Verify Payment
              </button>

              <div className="flex flex-col gap-2 rounded-lg border border-amber-400/20 bg-amber-400/5 p-3">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-300">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  Something off with this payment?
                </div>
                <textarea
                  placeholder="Explain what's wrong (shown to the client on their Orders page)"
                  value={underpaidNote}
                  onChange={(event) => setUnderpaidNote(event.target.value)}
                  rows={2}
                  className="w-full resize-none rounded-md border border-white/10 bg-white/[0.04] px-2.5 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none"
                />
                <button
                  type="button"
                  disabled={isPending || !underpaidNote.trim()}
                  onClick={() => {
                    if (!underpaidNote.trim()) {
                      setError("Explain what's wrong with the payment for the client to see.");
                      return;
                    }
                    run(
                      () => flagUnderpaidPaymentAction(order.id, underpaidNote),
                      "Client asked to resubmit payment.",
                    );
                  }}
                  className="self-start rounded-lg border border-amber-400/30 px-3 py-1.5 text-sm font-semibold text-amber-300 transition-colors hover:bg-amber-400/10 disabled:opacity-40"
                >
                  Flag as Underpaid / Ask to Resubmit
                </button>
              </div>
            </div>
          ) : null}

          {/* order.status === "paid" (18 Agustus 2026, Fase 13 click-test
              bugfix — found by the user: an installment order with
              milestone #1 verified flips orders.status to 'paid'
              (handle_installment_paid, 0038, product decision #1) and
              auto-creates its project row (orders_create_project_on_paid,
              0029/0045), but this panel used to render NOTHING for that
              state whenever the order had more than 1 order_installments
              row — i.e. every installments/cicilan order, always, since
              that plan always materializes 2-3 rows (materialize_order_
              installments, 0038). The single condition below used to be
              `order.status === "paid" && order.order_installments.length
              <= 1`, which happened to gate BOTH the receipt link AND (by
              being the only branch matching 'paid' at all) the admin's
              only visible next step — leaving a completely blank action
              area for cicilan orders, with no way to discover that
              /projects already has this order's project ready to move to
              in_production (the Projects page itself was never broken —
              its status dropdown has always worked for both payment
              methods identically, see ProjectDetail.tsx — this panel
              just never linked to it). Split into two independent
              conditions: the receipt link keeps its original single-
              payment-only scope (a multi-milestone order's receipts are
              per-installment, already available via the "Receipt" links
              inside Installment Schedule above), while the "Manage
              Production" link now always shows for ANY 'paid' order,
              regardless of payment method or how many installments still
              have money owed — matching operationalStatus.ts's own
              explicit design (an installment order with production
              running and a balance still owed is "Active"/"Awaiting Final
              Payment", not a blocked state). The `?q=` param pre-fills
              ProjectsList's search box with this order's client label so
              admin doesn't have to hunt through an unfiltered list. */}
          {order.status === "paid" && order.order_installments.length <= 1 ? (
            <a
              href={`/api/orders/${order.id}/receipt`}
              className="flex w-fit items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white"
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              Download Receipt (PDF)
            </a>
          ) : null}

          {order.status === "paid" ? (
            <Link
              href={`/projects?q=${encodeURIComponent(clientLabel)}`}
              className="flex w-fit items-center gap-2 rounded-lg bg-[var(--nimia-crimson)] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--nimia-crimson-hover)]"
            >
              <Milestone className="h-4 w-4" aria-hidden="true" />
              Manage Production &rarr;
            </Link>
          ) : null}

          {order.status === "rejected" ||
          order.status === "converted" ||
          order.status === "awaiting_payment" ? (
            <p className="text-sm text-white/40">
              {order.status === "awaiting_payment"
                ? "Waiting for the client to submit a payment."
                : "No further actions available for this order."}
            </p>
          ) : null}
        </div>
      ) : (
        <button
          type="button"
          onClick={onClose}
          className="self-start rounded-lg border border-white/10 px-4 py-2 text-sm font-semibold text-white/80 hover:bg-white/[0.06]"
        >
          Close
        </button>
      )}
    </div>
  );
}
