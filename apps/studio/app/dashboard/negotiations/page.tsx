import { cookies } from "next/headers";
import { createServerClient } from "@nimia/db";
import { NegotiationThreadList, type NegotiationThread } from "./NegotiationThreadList";
import { EmptyNegotiationsState } from "./EmptyNegotiationsState";

export const metadata = { title: "Negotiations" };

const ORDERS_HREF = "/dashboard/orders";

// Rewritten (3 Agustus 2026, per user request): this page used to always
// render ComingSoonState — now it's real data, same as /dashboard/orders
// was rewritten to be in the previous pass. Every row in
// `order_negotiations` (packages/db/migrations/0013) that belongs to one of
// THIS client's orders, grouped into one thread per order. No explicit
// client_id filter is added here — that table has no client_id column of
// its own (only order_id), and its RLS policy
// (order_negotiations_select_own_or_admin, same migration) already scopes
// every select to "the order's owning client, or admin/staff/founder" —
// adding a redundant filter here would need an embedded-column filter
// anyway and wouldn't be any safer than what RLS already guarantees.
export default async function NegotiationsPage() {
  const supabase = createServerClient(await cookies());

  const { data } = await supabase
    .from("order_negotiations")
    .select(
      "id, order_id, proposed_by, amount_usd, message, created_at, orders(description, status, final_price_usd, services(name))",
    )
    .order("created_at", { ascending: true });

  const threadsByOrder = new Map<string, NegotiationThread>();

  for (const row of (data ?? []) as any[]) {
    // Same defensive normalization as /dashboard/orders — PostgREST embeds
    // a to-one FK as a plain object, but without generated types
    // (Database is still the `any` placeholder, see packages/db/src/types.ts)
    // that isn't guaranteed at compile time.
    const order = Array.isArray(row.orders) ? row.orders[0] : row.orders;
    if (!order) continue;

    if (!threadsByOrder.has(row.order_id)) {
      const service = Array.isArray(order.services) ? order.services[0] : order.services;
      threadsByOrder.set(row.order_id, {
        orderId: row.order_id,
        title: service?.name ?? "Custom Project",
        status: order.status,
        finalPriceUsd: order.final_price_usd,
        offers: [],
      });
    }

    threadsByOrder.get(row.order_id)!.offers.push({
      id: row.id,
      proposedBy: row.proposed_by,
      amountUsd: row.amount_usd,
      message: row.message,
      createdAt: row.created_at,
    });
  }

  // Most recently active thread first.
  const threads = Array.from(threadsByOrder.values()).sort((a, b) => {
    const aLatest = a.offers[a.offers.length - 1]?.createdAt ?? "";
    const bLatest = b.offers[b.offers.length - 1]?.createdAt ?? "";
    return bLatest.localeCompare(aLatest);
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">Negotiations</h1>
        <p className="mt-1 text-[var(--nimia-muted)]">
          Every price offer exchanged with the Nimia Studio team, grouped by order.
        </p>
      </div>

      {threads.length > 0 ? (
        <NegotiationThreadList threads={threads} />
      ) : (
        <EmptyNegotiationsState ordersHref={ORDERS_HREF} />
      )}
    </div>
  );
}
