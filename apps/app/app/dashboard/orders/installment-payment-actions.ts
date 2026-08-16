"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createServerClient } from "@nimia/db";
import { notifyPaymentSubmitted } from "@nimia/discord";

// Client-side counterpart to payment-actions.ts, scoped to ONE
// order_installments row instead of a whole order (15 Agustus 2026 — see
// project memory's payment_method_generalization_15agst.md: the admin side
// of installment verification was built earlier the same day, but nothing
// existed yet for a CLIENT to actually submit a tx hash for milestone
// #2/#3, which is what InstallmentSchedule.tsx (this file's UI half) fixes).
//
// Structurally identical to payment-actions.ts in every way that matters:
// picking a network/currency is a read-only preview (getInstallmentPaymentQuoteAction,
// no DB write), and only the final "I've Sent This Payment" step
// (submitInstallmentPaymentAction) writes anything — by calling
// submit_installment_payment() (SECURITY DEFINER, packages/db/migrations/
// 0038_custom_order_installments.sql), never a raw `.update()`. That RPC
// re-validates ownership and re-derives the wallet address/expected amount
// itself server-side from the INSTALLMENT's own amount_usd (not
// orders.final_price_usd — a milestone is only ever a fraction of the
// order total), only accepting quote.rateUsd through as the live-rate INPUT
// for native coins, exactly like submit_payment_transaction does.

// Same CoinGecko id map as payment-actions.ts — kept as its own copy here
// rather than a shared import so this file has the same "everything it
// needs is visible in one place" property payment-actions.ts already has.
// If you add a network to one, add it to the other.
const NATIVE_COINGECKO_IDS: Record<string, string> = {
  ETH: "ethereum",
  BNB: "binancecoin",
  TRX: "tron",
  SOL: "solana",
  ADA: "cardano",
  TON: "the-open-network",
};

async function fetchLiveRateUsd(symbol: string): Promise<number> {
  const coingeckoId = NATIVE_COINGECKO_IDS[symbol];
  if (!coingeckoId) {
    throw new Error(`No live exchange rate source is configured for ${symbol} yet.`);
  }

  const response = await fetch(
    `https://api.coingecko.com/api/v3/simple/price?ids=${coingeckoId}&vs_currencies=usd`,
    { cache: "no-store" },
  );
  if (!response.ok) {
    throw new Error("Couldn't fetch a live exchange rate right now. Please try again in a moment.");
  }

  const data = (await response.json()) as Record<string, { usd?: number }>;
  const rate = data[coingeckoId]?.usd;
  if (!rate || !Number.isFinite(rate)) {
    throw new Error("Exchange rate unavailable right now. Please try again in a moment.");
  }
  return rate;
}

export type InstallmentPaymentQuote = {
  installmentId: string;
  network: string;
  currency: string;
  isNative: boolean;
  address: string;
  expectedAmount: number;
  rateUsd: number | null;
};

type SupabaseClient = ReturnType<typeof createServerClient>;

// Never trusts a client-supplied address/amount — re-derives everything
// from `payment_wallets` + the INSTALLMENT's own amount_usd fresh, at both
// preview and submit time, same posture as payment-actions.ts's
// resolveQuote.
async function resolveInstallmentQuote(
  supabase: SupabaseClient,
  installmentId: string,
  network: string,
  currency: string,
): Promise<InstallmentPaymentQuote> {
  const { data: installment, error: installmentError } = await supabase
    .from("order_installments")
    .select("status, amount_usd")
    .eq("id", installmentId)
    .single();
  if (installmentError || !installment) {
    throw new Error(installmentError?.message ?? "Installment not found.");
  }
  const inst = installment as any;
  if (inst.status !== "pending_payment") {
    throw new Error("This installment is not currently awaiting payment.");
  }
  const amountUsd = inst.amount_usd as number;

  const { data: wallet, error: walletError } = await supabase
    .from("payment_wallets")
    .select("address, stablecoin_symbols, native_symbol, allow_native")
    .eq("network", network)
    .eq("is_active", true)
    .single();
  if (walletError || !wallet) {
    throw new Error("That payment network isn't available right now.");
  }

  const stablecoinSymbols = ((wallet as any).stablecoin_symbols ?? []) as string[];
  const nativeSymbol = (wallet as any).native_symbol as string | null;
  const allowNative = (wallet as any).allow_native as boolean;

  const isStablecoin = stablecoinSymbols.includes(currency);
  const isNative = allowNative && !!nativeSymbol && nativeSymbol === currency;

  if (!isStablecoin && !isNative) {
    throw new Error("That currency isn't accepted on this network.");
  }

  if (isStablecoin) {
    return {
      installmentId,
      network,
      currency,
      isNative: false,
      address: (wallet as any).address,
      expectedAmount: amountUsd,
      rateUsd: null,
    };
  }

  const rateUsd = await fetchLiveRateUsd(currency);
  return {
    installmentId,
    network,
    currency,
    isNative: true,
    address: (wallet as any).address,
    expectedAmount: amountUsd / rateUsd,
    rateUsd,
  };
}

export type InstallmentPaymentQuoteResult =
  | { success: true; quote: InstallmentPaymentQuote }
  | { success: false; error: string };

export async function getInstallmentPaymentQuoteAction(
  installmentId: string,
  network: string,
  currency: string,
): Promise<InstallmentPaymentQuoteResult> {
  const supabase = createServerClient(await cookies());
  try {
    const quote = await resolveInstallmentQuote(supabase, installmentId, network, currency);
    return { success: true, quote };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Something went wrong." };
  }
}

export type SubmitInstallmentPaymentResult = { success: true } | { success: false; error: string };

/** Same "ORD-XXXXXXXX · Installment N of M" code apps/admin/actions.ts's
 * resolveInstallmentOrderCode builds for the verification side (see that
 * function's own comment) — kept as a local copy since apps/app and
 * apps/admin are separate Next.js apps with no shared module for this.
 * Falls back to the plain code when there's only a single installment (a
 * Pay in Full order never reaches this file at all — full_payment
 * materializes exactly one row and uses payment-actions.ts instead — but
 * this stays defensive in case that ever changes). */
function resolveInstallmentOrderCode(orderId: string, sequence: number, totalCount: number): string {
  const code = `ORD-${orderId.slice(0, 8).toUpperCase()}`;
  return totalCount > 1 ? `${code} · Installment ${sequence} of ${totalCount}` : code;
}

export async function submitInstallmentPaymentAction(
  installmentId: string,
  network: string,
  currency: string,
  txHash: string,
): Promise<SubmitInstallmentPaymentResult> {
  const trimmedTxHash = txHash.trim();
  if (!trimmedTxHash) {
    return { success: false, error: "Enter the transaction hash for your payment." };
  }

  const supabase = createServerClient(await cookies());

  let quote: InstallmentPaymentQuote;
  try {
    quote = await resolveInstallmentQuote(supabase, installmentId, network, currency);
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Something went wrong." };
  }

  const { error } = await supabase.rpc("submit_installment_payment", {
    p_installment_id: installmentId,
    p_network: quote.network,
    p_currency: quote.currency,
    p_tx_hash: trimmedTxHash,
    p_rate_usd: quote.rateUsd,
  });

  if (error) return { success: false, error: error.message };

  // Best-effort Discord notify, same "never let a lookup failure turn an
  // already-successful payment submission into a failed response" posture
  // as payment-actions.ts's submitPaymentAction.
  try {
    const { data: installment } = await supabase
      .from("order_installments")
      .select("order_id, sequence")
      .eq("id", installmentId)
      .single();
    if (installment) {
      const orderId = (installment as any).order_id as string;
      const sequence = (installment as any).sequence as number;

      const { count: totalCount } = await supabase
        .from("order_installments")
        .select("id", { count: "exact", head: true })
        .eq("order_id", orderId);

      const { data: order } = await supabase
        .from("orders")
        .select("full_name, company_name, discord_thread_id")
        .eq("id", orderId)
        .single();

      await notifyPaymentSubmitted({
        orderId: resolveInstallmentOrderCode(orderId, sequence, totalCount ?? 1),
        clientName: (order?.full_name as string | undefined) ?? (order?.company_name as string | undefined) ?? "A client",
        network: quote.network,
        currency: quote.currency,
        txHash: trimmedTxHash,
        threadId: order?.discord_thread_id as string | null | undefined,
      });
    }
  } catch (notifyError) {
    console.error("[discord] Failed to look up installment for payment-submitted notification", installmentId, notifyError);
  }

  revalidatePath("/dashboard/orders");
  revalidatePath("/dashboard");
  return { success: true };
}
