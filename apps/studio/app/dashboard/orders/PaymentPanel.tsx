"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Wallet, Copy, Check, ShieldCheck, AlertTriangle, Clock, Ticket } from "lucide-react";
import { cn, Listbox, Input, Label, Button } from "@nimia/ui";
import { formatRelativeTime } from "../../lib/relativeTime";
import { getPaymentQuoteAction, submitPaymentAction, applyVoucherAction, type PaymentQuote } from "./payment-actions";

// Display labels for public.crypto_network (packages/db/migrations/0013,
// extended with 'ton' in 0014) — same values as payment_wallets.network,
// just human-readable.
const NETWORK_LABELS: Record<string, string> = {
  ethereum: "Ethereum",
  bsc: "BNB Smart Chain (BSC)",
  tron: "Tron",
  solana: "Solana",
  cardano: "Cardano",
  ton: "TON",
};

export type PaymentWalletOption = {
  network: string;
  stablecoinSymbols: string[];
  nativeSymbol: string | null;
  allowNative: boolean;
};

// A voucher already applied to this order (4 Agustus 2026, P1 — Vouchers &
// Quests), read from voucher_redemptions via OrdersList/OrderDetail. Null
// until apply_voucher_to_order() has succeeded for this order.
export type VoucherRedemptionSummary = {
  code: string;
  discountPercent: number;
  originalPriceUsd: number;
  discountedPriceUsd: number;
} | null;

export interface PaymentPanelProps {
  orderId: string;
  status: string;
  finalPriceUsd: number | null;
  walletOptions: PaymentWalletOption[];
  voucherRedemption?: VoucherRedemptionSummary;
  payment: {
    network: string | null;
    token: string | null;
    walletAddress: string | null;
    expectedAmount: number | null;
    txHash: string | null;
    submittedAt: string | null;
    verifiedAt: string | null;
    underpaidNote: string | null;
  };
}

function formatCryptoAmount(amount: number, symbol: string) {
  return `${amount.toLocaleString("en-US", { maximumFractionDigits: 6 })} ${symbol}`;
}

function CopyableAddress({ address }: { address: string }) {
  const [copied, setCopied] = React.useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API can be unavailable (e.g. insecure context) — the
      // address is still selectable text, so this just silently no-ops
      // rather than showing an error for a non-critical convenience.
    }
  }

  return (
    <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2.5">
      <code className="min-w-0 flex-1 break-all text-xs text-white/85">{address}</code>
      <button
        type="button"
        onClick={handleCopy}
        className="flex shrink-0 items-center gap-1 rounded-md border border-white/10 px-2 py-1 text-xs font-medium text-white/70 transition-colors hover:bg-white/10 hover:text-white"
      >
        {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" /> : <Copy className="h-3.5 w-3.5" aria-hidden="true" />}
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}

// "Have a voucher code?" box — only rendered while awaiting_payment and no
// voucher has been applied to this order yet (a second apply attempt would
// just fail server-side anyway, see apply_voucher_to_order's own "already
// applied" check, but hiding it once used keeps the UI honest). Applying
// re-derives the discount server-side (payment-actions.ts's
// applyVoucherAction) and triggers router.refresh() so finalPriceUsd/
// voucherRedemption above flow back down from the Server Component parent.
function VoucherRedeemBox({ orderId, onApplied }: { orderId: string; onApplied: () => void }) {
  const [code, setCode] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [isApplying, setIsApplying] = React.useState(false);

  async function handleApply() {
    if (!code.trim()) return;
    setIsApplying(true);
    setError(null);
    const result = await applyVoucherAction(orderId, code);
    setIsApplying(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setCode("");
    onApplied();
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
      <Label htmlFor="voucher-code">Have a voucher code?</Label>
      <div className="flex gap-2">
        <Input
          id="voucher-code"
          placeholder="e.g. QUEST-A1B2C3D4"
          value={code}
          onChange={(event) => setCode(event.target.value)}
          className="flex-1"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!code.trim() || isApplying}
          isLoading={isApplying}
          onClick={handleApply}
        >
          Apply
        </Button>
      </div>
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
    </div>
  );
}

function VoucherAppliedBanner({ voucher }: { voucher: NonNullable<VoucherRedemptionSummary> }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3">
      <Ticket className="h-4 w-4 shrink-0 text-emerald-300" aria-hidden="true" />
      <div>
        <p className="text-sm font-semibold text-emerald-300">
          Voucher {voucher.code} applied — {voucher.discountPercent}% off
        </p>
        <p className="text-xs text-white/50">
          ${voucher.originalPriceUsd.toLocaleString("en-US")} → ${voucher.discountedPriceUsd.toLocaleString("en-US")}
        </p>
      </div>
    </div>
  );
}

// Renders inside a client order's detail modal (see OrderDetail.tsx). Three
// branches by order status: pick-network-and-pay (awaiting_payment),
// read-only "under review" (payment_submitted), and a verified confirmation
// (paid). The network/currency picker never writes to the DB by itself —
// only the final "I've Sent This Payment" submit does (see
// payment-actions.ts's comment on why).
export function PaymentPanel({
  orderId,
  status,
  finalPriceUsd,
  walletOptions,
  voucherRedemption = null,
  payment,
}: PaymentPanelProps) {
  const router = useRouter();
  const [network, setNetwork] = React.useState("");
  const [currency, setCurrency] = React.useState("");
  const [quote, setQuote] = React.useState<PaymentQuote | null>(null);
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
    const result = await getPaymentQuoteAction(orderId, network, currency);
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
    const result = await submitPaymentAction(orderId, quote.network, quote.currency, txHash);
    setIsSubmitting(false);
    if (!result.success) {
      setSubmitError(result.error);
      return;
    }
    setSubmitted(true);
    router.refresh();
  }

  if (status === "paid") {
    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3">
          <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-300" aria-hidden="true" />
          <div>
            <p className="text-sm font-semibold text-emerald-300">Payment verified</p>
            {payment.verifiedAt ? (
              <p className="text-xs text-white/50">Confirmed {formatRelativeTime(payment.verifiedAt)}</p>
            ) : null}
          </div>
        </div>
        {voucherRedemption ? <VoucherAppliedBanner voucher={voucherRedemption} /> : null}
        {payment.network && payment.token && payment.expectedAmount != null ? (
          <PaymentSummaryRows payment={payment} />
        ) : null}
      </div>
    );
  }

  if (status === "payment_submitted" && !submitted) {
    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2 rounded-xl border border-purple-400/30 bg-purple-400/10 px-4 py-3">
          <Clock className="h-4 w-4 shrink-0 text-purple-300" aria-hidden="true" />
          <div>
            <p className="text-sm font-semibold text-purple-300">Payment submitted — under review</p>
            <p className="text-xs text-white/50">Nimia Studio will verify it shortly.</p>
          </div>
        </div>
        {voucherRedemption ? <VoucherAppliedBanner voucher={voucherRedemption} /> : null}
        <PaymentSummaryRows payment={payment} />
      </div>
    );
  }

  if (status === "awaiting_payment" && !submitted) {
    return (
      <div className="flex flex-col gap-4">
        {payment.underpaidNote ? (
          <div className="flex items-start gap-2 rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" aria-hidden="true" />
            <div>
              <p className="text-sm font-semibold text-amber-300">Your last payment needs a second look</p>
              <p className="mt-0.5 text-xs text-white/70">{payment.underpaidNote}</p>
            </div>
          </div>
        ) : null}

        <div>
          <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-white/35">
            <Wallet className="h-3.5 w-3.5" aria-hidden="true" />
            Pay {finalPriceUsd != null ? `$${finalPriceUsd.toLocaleString("en-US")}` : "your order"}
          </span>
          <p className="mt-1 text-xs text-white/45">
            Choose a network and currency below to get the wallet address and exact amount to send.
          </p>
        </div>

        {voucherRedemption ? (
          <VoucherAppliedBanner voucher={voucherRedemption} />
        ) : (
          <VoucherRedeemBox orderId={orderId} onApplied={() => router.refresh()} />
        )}

        {walletOptions.length === 0 ? (
          <p className="text-sm text-white/50">
            Payment methods aren&apos;t available right now — please contact Nimia Studio directly.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="payment-network">Network</Label>
                <Listbox
                  id="payment-network"
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
                <Label htmlFor="payment-currency">Currency</Label>
                <Listbox
                  id="payment-currency"
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
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-white/35">
                    Send exactly
                  </p>
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
                  <Label htmlFor="payment-tx-hash">Transaction hash</Label>
                  <Input
                    id="payment-tx-hash"
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

  return null;
}

function PaymentSummaryRows({ payment }: { payment: PaymentPanelProps["payment"] }) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] p-4 text-sm">
      {payment.network ? (
        <SummaryRow label="Network" value={NETWORK_LABELS[payment.network] ?? payment.network} />
      ) : null}
      {payment.expectedAmount != null && payment.token ? (
        <SummaryRow label="Amount sent" value={formatCryptoAmount(payment.expectedAmount, payment.token)} />
      ) : null}
      {payment.walletAddress ? (
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-white/35">To address</p>
          <div className="mt-1">
            <CopyableAddress address={payment.walletAddress} />
          </div>
        </div>
      ) : null}
      {payment.txHash ? <SummaryRow label="Tx hash" value={payment.txHash} mono /> : null}
      {payment.submittedAt ? (
        <SummaryRow label="Submitted" value={formatRelativeTime(payment.submittedAt)} />
      ) : null}
    </div>
  );
}

function SummaryRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs text-white/40">{label}</span>
      <span className={cn("truncate text-right text-white/80", mono && "font-mono text-xs")}>{value}</span>
    </div>
  );
}
