import Link from "next/link";
import { cookies } from "next/headers";
import { createServerClient } from "@nimia/db";
import { buttonVariants, cn } from "@nimia/ui";
import { Plus } from "lucide-react";
import { OrdersList, type OrderListItem } from "./OrdersList";
import { EmptyOrdersState } from "./EmptyOrdersState";
import type { PaymentWalletOption } from "./PaymentPanel";

export const metadata = { title: "Orders" };

// New orders now start at /order, the Project Configurator (see
// modules/order) — not this page anymore.
const NEW_ORDER_HREF = "/order";

// Rewritten (3 Agustus 2026, per user request): this page used to always
// render OrderForm, a generic "submit a new order" form, regardless of
// whether the client already had orders in flight. Now that /order is the
// real place a client starts a new project, this "Orders" sidebar item's
// job changes to what its name always implied — showing the client their
// own orders and where each one currently stands (pending review,
// negotiating, awaiting payment, in production, etc.), same as any
// e-commerce "My Orders" page. OrderForm.tsx/actions.ts are left in place,
// unused, rather than deleted, in case that flow is wanted again later —
// nothing else in the app still links to them (the public /services page's
// "Explore Service" CTAs and the navbar/home/why-nimia/how-to-start CTAs
// all point at /order now).
export default async function OrdersPage() {
  const supabase = createServerClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: client } = await supabase
    .from("clients")
    .select("id")
    .eq("user_id", user!.id)
    .single();

  let orders: OrderListItem[] = [];

  if (client) {
    const { data } = await supabase
      .from("orders")
      .select(
        // payment_* columns added (3 Agustus 2026, per user request —
        // "kenapa belum bisa bayar") so OrderDetail/PaymentPanel can show
        // what's already been submitted for an order, not just its status.
        // See packages/db/migrations/0013_negotiation_payments_ambassadors.sql.
        "id, description, status, budget, final_price_usd, proposed_price_usd, created_at, services(name), payment_network, payment_token, payment_wallet_address, payment_expected_amount, payment_tx_hash, payment_submitted_at, payment_verified_at, payment_underpaid_note",
      )
      .eq("client_id", client.id)
      .order("created_at", { ascending: false });

    orders = (data ?? []).map((o: any) => {
      // PostgREST embeds a to-one FK relationship as a plain object, but
      // without generated types (Database is still the `any` placeholder —
      // see packages/db/src/types.ts) that isn't guaranteed at compile
      // time, so this normalizes either shape defensively rather than
      // assuming one.
      const service = Array.isArray(o.services) ? o.services[0] : o.services;
      return {
        id: o.id,
        title: service?.name ?? "Custom Project",
        description: o.description,
        status: o.status,
        budget: o.budget,
        finalPriceUsd: o.final_price_usd,
        proposedPriceUsd: o.proposed_price_usd,
        createdAt: o.created_at,
        paymentNetwork: o.payment_network,
        paymentToken: o.payment_token,
        paymentWalletAddress: o.payment_wallet_address,
        paymentExpectedAmount: o.payment_expected_amount,
        paymentTxHash: o.payment_tx_hash,
        paymentSubmittedAt: o.payment_submitted_at,
        paymentVerifiedAt: o.payment_verified_at,
        paymentUnderpaidNote: o.payment_underpaid_note,
      };
    });
  }

  // payment_wallets metadata (network + accepted currencies, NOT the
  // address itself — that's only revealed via getPaymentQuoteAction once a
  // client actually picks a network/currency, see PaymentPanel.tsx) so the
  // network/currency selects have something to populate without an extra
  // round trip per order. Public-readable for active rows regardless of
  // order status (payment_wallets_public_read_active, 0013), so this is
  // safe to fetch unconditionally.
  const { data: walletRows } = await supabase
    .from("payment_wallets")
    .select("network, stablecoin_symbols, native_symbol, allow_native")
    .eq("is_active", true)
    .order("network", { ascending: true });

  const walletOptions: PaymentWalletOption[] = (walletRows ?? []).map((w: any) => ({
    network: w.network,
    stablecoinSymbols: w.stablecoin_symbols ?? [],
    nativeSymbol: w.native_symbol,
    allowNative: w.allow_native,
  }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Orders</h1>
          <p className="mt-1 text-[var(--nimia-muted)]">
            Every project you&apos;ve submitted to Nimia Studio, and where it stands right now.
          </p>
        </div>
        <Link href={NEW_ORDER_HREF} className={cn(buttonVariants({ size: "md" }), "shrink-0 gap-2")}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          New Order
        </Link>
      </div>

      {orders.length > 0 ? (
        <OrdersList orders={orders} walletOptions={walletOptions} />
      ) : (
        <EmptyOrdersState ctaHref={NEW_ORDER_HREF} />
      )}
    </div>
  );
}
