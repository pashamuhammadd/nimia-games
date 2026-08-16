"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Lock, Clock, ShieldCheck, AlertTriangle, Wallet } from "lucide-react";
import { cn, Listbox, Input, Label, Button } from "@nimia/ui";
import { formatRelativeTime } from "../../lib/relativeTime";
import { installmentStatusMeta } from "../../lib/orderStatus";
import {
  NETWORK_LABELS,
  formatCryptoAmount,
  CopyableAddress,
  type PaymentWalletOption,
} from "./PaymentPanel";
import {
  getInstallmentPaymentQuoteAction,
  submitInstallmentPaymentAction,
  type InstallmentPaymentQuote,
} from "./installment-payment-actions";

// Client-side milestone schedule for an installments order (15 Agustus
// 2026) — the counterpart to PaymentPanel.tsx, rendered INSTEAD of it when
// order.paymentMethod === "installments" (see OrderDetail.tsx's branch).
// Before this file, a client could only ever pay milestone #1 — nothing in
// the app showed them milestone #2/#3 existed at all, let alone let them
// pay it, once the order flipped to 'paid' after the first installment
// cleared (handle_installment_paid, packages/db/migrations/0038, flips the
// PARENT order to 'paid' on installment #1 specifically — see that
// function's own comment on product decision #1). This is what closes that
// gap: every milestone row (order_installments) is shown with its own
// status, and exactly one of them is ever interactive at a time — the DB
// trigger enforces that invariant (only one row is ever 'pending_payment'),
// this component just renders whatever status each row is actually in.
export interface InstallmentListItem {
  id: string;
  sequence: number;
  label: string;
  percentage: number;
  amountUsd: number;
  status: string;
  paymentNetwork: string | null;
  paymentToken: string | null;
  paymentWalletAddress: string | null;
  paymentExpectedAmount: number | null;
  paymentTxHash: string | null;
  paymentSubmittedAt: string | null;
  paymentVerifiedAt: string | null;
  paymentUnderpaidNote: string | null;
}

function MilestoneSummaryRows({ installment }: { installment: InstallmentListItem }) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] p-4 text-sm">
      {installment.paymentNetwork ? (
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-white/40">Network</span>
          <span className="text-right text-white/80">
            {NETWORK_LABELS[installment.paymentNetwork] ?? installment.paymentNetwork}
          </span>
        </div>
      ) : null}
      {installment.paymentExpectedAmount != null && installment.paymentToken ? (
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-white/40">Amount sent</span>
          <span className="text-right text-white/80">
            {formatCryptoAmount(installment.paymentExpectedAmount, installment.paymentToken)}
          </span>
        </div>
      ) : null}
      {installment.paymentWalletAddress ? (
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-white/35">To address</p>
          <div className="mt-1">
            <CopyableAddress address={installment.paymentWalletAddress} />
          </div>
        </div>
      ) : null}
      {installment.paymentTxHash ? (
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-white/40">Tx hash</span>
          <span className="truncate text-right font-mono text-xs text-white/80">{installment.paymentTxHash}</span>
        </div>
      ) : null}
      {installment.paymentSubmittedAt ? (
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-white/40">Submitted</span>
          <span className="text-right text-white/80">{formatRelativeTime(installment.paymentSubmittedAt)}</span>
        </div>
      ) : null}
    </div>
  );
}

// The interactive "pick network, get address+amount, paste tx hash" flow
// for the ONE milestone currently in 'pending_payment' — same shape as
// PaymentPanel's awaiting_payment branch, just scoped to
// installment.amountUsd instead of the order's whole final_price_usd.
function MilestonePayForm({
  installment,
  walletOptions,
}: {
  installment: InstallmentListItem;
  walletOptions: PaymentWalletOption[];
}) {
  const router = useRouter();
  const [network, setNetwork] = React.useState("");
  const [currency, setCurrency] = React.useState("");
  const [quote, setQuote] = React.useState<InstallmentPaymentQuote | null>(null);
  const [quoteError, setQuoteError] = React.useState<string | null>(null);
  const [isQuoting, setIsQuoting] = React.useState(false);
  const [txHash, setTxHash] = React.useState("");
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submitted, setSubmitted] = React.useState(false);

  const selectedWallet = walletOptions.find((w) => w.network === network) ?? null;
  const currencyOptions = selectedWallet
    ? [
        ...selectedWallet.stablecoinSymbols,
        ...(selectedWallet.allowNative && selectedWallet.nativeSymbol ? [selectedWallet.nativeSymbol] : []),
      ]
    : [];

  async function handleGetQuote() {
    if (!network || !currency) return;
    setIsQuoting(true);
    setQuoteError(null);
    setQuote(null);
    const result = await getInstallmentPaymentQuoteAction(installment.id, network, currency);
    setIsQuoting(false);
    if (!result.success) {
      setQuoteError(result.error);
      return;
    }
    setQuote(result.quote);
  }

  async function handleSubmitPayment() {
    if (!quote) return;
    if (!txHash.trim()) {
      setSubmitError("Enter the transaction hash for your payment.");
      return;
    }
    setIsSubmitting(true);
    setSubmitError(null);
    const result = await submitInstallmentPaymentAction(installment.id, quote.network, quote.currency, txHash);
    setIsSubmitting(false);
    if (!result.success) {
      setSubmitError(result.error);
      return;
    }
    setSubmitted(true);
    router.refresh();
  }

  if (submitted) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-purple-400/30 bg-purple-400/10 px-4 py-3">
        <Clock className="h-4 w-4 shrink-0 text-purple-300" aria-hidden="true" />
        <p className="text-sm font-semibold text-purple-300">
          Payment submitted — Nimia Studio will verify it shortly.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {installment.paymentUnderpaidNote ? (
        <div className="flex items-start gap-2 rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" aria-hidden="true" />
          <div>
            <p className="text-sm font-semibold text-amber-300">Your last payment needs a second look</p>
            <p className="mt-0.5 text-xs text-white/70">{installment.paymentUnderpaidNote}</p>
          </div>
        </div>
      ) : null}

      {walletOptions.length === 0 ? (
        <p className="text-sm text-white/50">
          Payment methods aren&apos;t available right now — please contact Nimia Studio directly.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor={`installment-network-${installment.id}`}>Network</Label>
              <Listbox
                id={`installment-network-${installment.id}`}
                value={network}
                placeholder="Select network"
                options={walletOptions.map((option) => ({
                  value: option.network,
                  label: NETWORK_LABELS[option.network] ?? option.network,
                }))}
                onChange={(value) => {
                  setNetwork(value);
                  setCurrency("");
                  setQuote(null);
                  setQuoteError(null);
                }}
              />
            </div>
            <div>
              <Label htmlFor={`installment-currency-${installment.id}`}>Currency</Label>
              <Listbox
                id={`installment-currency-${installment.id}`}
                value={currency}
                disabled={!selectedWallet}
                placeholder="Select currency"
                options={currencyOptions.map((symbol) => ({ value: symbol, label: symbol }))}
                onChange={(value) => {
                  setCurrency(value);
                  setQuote(null);
                  setQuoteError(null);
                }}
              />
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!network || !currency || isQuoting}
            isLoading={isQuoting}
            onClick={handleGetQuote}
            className="self-start"
          >
            Show Payment Details
          </Button>

          {quoteError ? <p className="text-sm text-red-400">{quoteError}</p> : null}

          {quote ? (
            <div className="flex flex-col gap-3 rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-white/35">Send exactly</p>
                <p className="mt-0.5 text-lg font-bold text-white">
                  {formatCryptoAmount(quote.expectedAmount, quote.currency)}
                </p>
                {quote.isNative ? (
                  <p className="mt-0.5 text-xs text-white/40">
                    Live rate: 1 {quote.currency} ≈ ${quote.rateUsd?.toLocaleString("en-US")}. Re-check this
                    page if you don&apos;t send right away — native-coin rates move.
                  </p>
                ) : null}
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-white/35">
                  To this {NETWORK_LABELS[quote.network] ?? quote.network} address
                </p>
                <div className="mt-1">
                  <CopyableAddress address={quote.address} />
                </div>
              </div>

              <div className="mt-1 flex flex-col gap-2 border-t border-white/[0.08] pt-3">
                <Label htmlFor={`installment-tx-hash-${installment.id}`}>Transaction hash</Label>
                <Input
                  id={`installment-tx-hash-${installment.id}`}
                  placeholder="Paste the tx hash after sending"
                  value={txHash}
                  onChange={(event) => setTxHash(event.target.value)}
                />
                {submitError ? <p className="text-sm text-red-400">{submitError}</p> : null}
                <Button
                  type="button"
                  size="sm"
                  disabled={!txHash.trim() || isSubmitting}
                  isLoading={isSubmitting}
                  onClick={handleSubmitPayment}
                  className="self-start"
                >
                  I&apos;ve Sent This Payment
                </Button>
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

function MilestoneCard({
  installment,
  walletOptions,
}: {
  installment: InstallmentListItem;
  walletOptions: PaymentWalletOption[];
}) {
  const meta = installmentStatusMeta(installment.status);

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-white">
            Milestone {installment.sequence} — {installment.label}
          </p>
          <p className="mt-0.5 text-xs text-white/45">
            ${installment.amountUsd.toLocaleString("en-US")} ({installment.percentage}%)
          </p>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs font-medium text-white/70">
          <span className={cn("h-1.5 w-1.5 rounded-full", meta.dotClass)} aria-hidden="true" />
          {meta.label}
        </span>
      </div>

      {installment.status === "paid" ? (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3">
            <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-300" aria-hidden="true" />
            <div>
              <p className="text-sm font-semibold text-emerald-300">Payment verified</p>
              {installment.paymentVerifiedAt ? (
                <p className="text-xs text-white/50">Confirmed {formatRelativeTime(installment.paymentVerifiedAt)}</p>
              ) : null}
            </div>
          </div>
          {installment.paymentNetwork && installment.paymentToken && installment.paymentExpectedAmount != null ? (
            <MilestoneSummaryRows installment={installment} />
          ) : null}
        </div>
      ) : installment.status === "payment_submitted" ? (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 rounded-xl border border-purple-400/30 bg-purple-400/10 px-4 py-3">
            <Clock className="h-4 w-4 shrink-0 text-purple-300" aria-hidden="true" />
            <div>
              <p className="text-sm font-semibold text-purple-300">Payment submitted — under review</p>
              <p className="text-xs text-white/50">Nimia Studio will verify it shortly.</p>
            </div>
          </div>
          <MilestoneSummaryRows installment={installment} />
        </div>
      ) : installment.status === "pending_payment" ? (
        <MilestonePayForm installment={installment} walletOptions={walletOptions} />
      ) : (
        // scheduled (locked behind an earlier unpaid milestone) — also the
        // fallback for overdue/cancelled, neither of which the app ever
        // sets automatically today (see migration 0038's own comment on
        // installment_status), but shown as a plain locked state rather
        // than crashing if either is ever used in the future.
        <div className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-3">
          <Lock className="h-4 w-4 shrink-0 text-white/30" aria-hidden="true" />
          <p className="text-sm text-white/45">
            {installment.sequence > 1
              ? `Unlocks once Milestone ${installment.sequence - 1} is paid.`
              : "Not payable yet."}
          </p>
        </div>
      )}
    </div>
  );
}

export function InstallmentSchedule({
  walletOptions,
  installments,
}: {
  orderId: string;
  walletOptions: PaymentWalletOption[];
  installments: InstallmentListItem[];
}) {
  if (installments.length === 0) {
    // Order hasn't reached 'awaiting_payment' yet — materialize_order_installments
    // (0038) only generates these rows the instant it does, so there's
    // nothing to show yet. OrderDetail.tsx's PAYMENT_VISIBLE_STATUSES gate
    // already prevents this component from rendering before then in
    // practice; this is just a defensive fallback, not the normal path.
    return null;
  }

  return (
    <div className="flex flex-col gap-3">
      <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-white/35">
        <Wallet className="h-3.5 w-3.5" aria-hidden="true" />
        Payment Schedule
      </span>
      {installments.map((installment) => (
        <MilestoneCard key={installment.id} installment={installment} walletOptions={walletOptions} />
      ))}
    </div>
  );
}
