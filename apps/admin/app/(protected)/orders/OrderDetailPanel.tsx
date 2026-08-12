"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
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
} from "lucide-react";
import { cn } from "@nimia/ui";
import { orderStatusMeta } from "../../lib/orderStatus";
import { formatRelativeTime } from "../../lib/relativeTime";
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

  return (
    <div className="flex flex-col gap-5">
      <div>
        <span className="text-xs font-semibold uppercase tracking-wider text-white/35">Order from</span>
        <h2 className="mt-1 text-lg font-bold text-white">{clientLabel}</h2>
        <div className="mt-1.5 flex items-center gap-1.5">
          <span className={`h-1.5 w-1.5 rounded-full ${meta.dotClass}`} aria-hidden="true" />
          <span className="text-xs font-medium text-white/55">{meta.label}</span>
        </div>
      </div>

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

          {order.status === "paid" ? (
            <a
              href={`/api/orders/${order.id}/receipt`}
              className="flex w-fit items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white"
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              Download Receipt (PDF)
            </a>
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
