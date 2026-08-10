"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createServerClient } from "@nimia/db";
import { notifyPaymentSubmitted } from "@nimia/discord";

// Buyer-facing crypto payment flow (3 Agustus 2026, per user request — an
// order could reach 'awaiting_payment' with no way for the client to
// actually see a wallet address or pay). The DB schema/RLS for this has
// existed since packages/db/migrations/0013 and 0015 — see that file's own
// comment calling this "the buyer-facing payment page (Phase 3, not yet
// built)". This is that page's server-side half.
//
// orders_update_own_payment_submission (0013) only lets the owning client
// move an order from 'awaiting_payment' straight to 'payment_submitted' in
// ONE update, with no allowed in-between state — so picking a
// network/currency and seeing the resulting address+amount is deliberately
// read-only (getPaymentQuoteAction, no DB write) and only the final "I've
// sent it" step (submitPaymentAction) actually writes to `orders`.
//
// 4 Agustus 2026: orders_update_own_payment_submission was DROPPED by
// packages/db/migrations/0020_lock_down_payment_rls.sql (the P0.5 security
// audit — that raw client-side UPDATE could rewrite final_price_usd/
// payment_expected_amount/payment_wallet_address, the exact numbers staff's
// manual verification trusts). submitPaymentAction below now goes through
// submit_payment_transaction() (SECURITY DEFINER), the RPC 0020 introduced
// to replace it — see that migration's own comment for the full reasoning.

// A native coin's live USD rate is looked up by its CoinGecko "id" (not the
// same as its ticker symbol) — see packages/db/migrations/0015's comment:
// native-coin amounts must use a LIVE rate, never be treated as already
// being USD.
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

export type PaymentQuote = {
  network: string;
  currency: string;
  isNative: boolean;
  address: string;
  expectedAmount: number;
  rateUsd: number | null;
};

type SupabaseClient = ReturnType<typeof createServerClient>;

// Shared by both actions below so submitPaymentAction NEVER trusts a
// client-supplied address/amount — it re-derives everything from
// `payment_wallets` + `orders.final_price_usd` fresh, at submit time, the
// same way getPaymentQuoteAction does when just previewing. (The actual
// write in submitPaymentAction now happens inside submit_payment_transaction
// on the DB side, which re-derives the address/amount itself too — this
// function's result is only used for what's shown to the client and as the
// live-rate INPUT the DB function needs for native coins, see that
// function's own comment on why it can't fetch one itself.)
async function resolveQuote(
  supabase: SupabaseClient,
  orderId: string,
  network: string,
  currency: string,
): Promise<PaymentQuote> {
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("status, final_price_usd")
    .eq("id", orderId)
    .single();
  if (orderError || !order) {
    throw new Error(orderError?.message ?? "Order not found.");
  }
  if ((order as any).status !== "awaiting_payment") {
    throw new Error("This order is not currently awaiting payment.");
  }
  const finalPriceUsd = (order as any).final_price_usd as number | null;
  if (finalPriceUsd == null) {
    throw new Error("No agreed price is set on this order yet.");
  }

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
    // Accepted 1:1, no rate lookup needed (0015).
    return {
      network,
      currency,
      isNative: false,
      address: (wallet as any).address,
      expectedAmount: finalPriceUsd,
      rateUsd: null,
    };
  }

  const rateUsd = await fetchLiveRateUsd(currency);
  return {
    network,
    currency,
    isNative: true,
    address: (wallet as any).address,
    expectedAmount: finalPriceUsd / rateUsd,
    rateUsd,
  };
}

export type PaymentQuoteResult = { success: true; quote: PaymentQuote } | { success: false; error: string };

// Read-only preview — lets the client see the address + amount for a
// network/currency combo before they've actually sent anything, without
// writing to `orders`.
export async function getPaymentQuoteAction(
  orderId: string,
  network: string,
  currency: string,
): Promise<PaymentQuoteResult> {
  const supabase = createServerClient(await cookies());
  try {
    const quote = await resolveQuote(supabase, orderId, network, currency);
    return { success: true, quote };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Something went wrong." };
  }
}

export type SubmitPaymentResult = { success: true } | { success: false; error: string };

// The one write in this file. Re-derives the quote fresh (see
// resolveQuote's comment), then calls submit_payment_transaction() — the
// SECURITY DEFINER RPC 0020 introduced after dropping
// orders_update_own_payment_submission — instead of a raw `.update()` on
// `orders`. That RLS policy no longer exists, so a raw update here would
// now fail outright; the RPC re-validates ownership/status and re-derives
// the wallet address/expected amount itself server-side, only accepting
// quote.rateUsd through as the live-rate INPUT for native coins (see the
// RPC's own comment on why it can't fetch one itself).
export async function submitPaymentAction(
  orderId: string,
  network: string,
  currency: string,
  txHash: string,
): Promise<SubmitPaymentResult> {
  const trimmedTxHash = txHash.trim();
  if (!trimmedTxHash) {
    return { success: false, error: "Enter the transaction hash for your payment." };
  }

  const supabase = createServerClient(await cookies());

  let quote: PaymentQuote;
  try {
    quote = await resolveQuote(supabase, orderId, network, currency);
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Something went wrong." };
  }

  const { error } = await supabase.rpc("submit_payment_transaction", {
    p_order_id: orderId,
    p_network: quote.network,
    p_currency: quote.currency,
    p_tx_hash: trimmedTxHash,
    p_rate_usd: quote.rateUsd,
  });

  if (error) return { success: false, error: error.message };

  // Added 9 Agustus 2026 (notifications phase, docs/DISCORD.md's Payment
  // flow — "Discord notification to #payment-verification"). The RPC above
  // doesn't return the client's name, and this file has no email helper of
  // its own to already have it in scope (unlike apps/admin's payment
  // actions) — a small best-effort follow-up SELECT, wrapped so a failure
  // here can never turn an already-successful payment submission into a
  // failed response. notifyPaymentSubmitted itself also never throws (see
  // packages/discord/src/notify.ts), so this is belt-and-suspenders.
  try {
    const { data: order } = await supabase
      .from("orders")
      .select("full_name, company_name")
      .eq("id", orderId)
      .single();
    await notifyPaymentSubmitted({
      orderId: `ORD-${orderId.slice(0, 8).toUpperCase()}`,
      clientName: (order?.full_name as string | undefined) ?? (order?.company_name as string | undefined) ?? "A client",
      network: quote.network,
      currency: quote.currency,
      txHash: trimmedTxHash,
    });
  } catch (notifyError) {
    console.error("[discord] Failed to look up order for payment-submitted notification", orderId, notifyError);
  }

  revalidatePath("/dashboard/orders");
  revalidatePath("/dashboard");
  return { success: true };
}

// ------------------------------------------------------------------
// Voucher redemption (4 Agustus 2026, P1 — Vouchers & Quests). The ONLY way
// a voucher can ever be applied is apply_voucher_to_order() (SECURITY
// DEFINER, packages/db/migrations/0021_vouchers.sql), which re-validates
// ownership/status and re-computes the discount itself — this action never
// trusts a percent/amount from the client, only the code text the client
// typed in.
// ------------------------------------------------------------------

export type ApplyVoucherResult =
  | { success: true; newFinalPriceUsd: number }
  | { success: false; error: string };

export async function applyVoucherAction(orderId: string, code: string): Promise<ApplyVoucherResult> {
  const trimmedCode = code.trim();
  if (!trimmedCode) {
    return { success: false, error: "Enter a voucher code." };
  }

  const supabase = createServerClient(await cookies());
  const { data, error } = await supabase.rpc("apply_voucher_to_order", {
    p_order_id: orderId,
    p_code: trimmedCode,
  });

  if (error) return { success: false, error: error.message };

  const row = Array.isArray(data) ? data[0] : data;
  const newFinalPriceUsd = Number(row?.new_final_price_usd ?? 0);

  revalidatePath("/dashboard/orders");
  revalidatePath("/dashboard");
  return { success: true, newFinalPriceUsd };
}
