import { cookies } from "next/headers";
import Link from "next/link";
import { createServerClient } from "@nimia/db";
import { OrdersList } from "./OrdersList";
import { ORDER_STATUS_FILTERS } from "../../lib/orderStatus";

export const metadata = { title: "Orders" };

// Page size for the range-based pagination below (added 12 Agustus 2026,
// order-flow audit fix — this query used to fetch every order in the
// table, unbounded, on every page load. Fine at today's volume, but a
// straightforward scale problem the longer the studio runs — every order
// ever placed, forever, in one response). 20 keeps the list readable on
// one screen without feeling clipped.
const PAGE_SIZE = 20;

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const { status, page: pageParam } = await searchParams;
  const page = Math.max(1, Number.parseInt(pageParam ?? "1", 10) || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const supabase = createServerClient(await cookies());

  let query = supabase
    .from("orders")
    .select(
      // proposed_price_usd/final_price_usd + the order_negotiations embed
      // (3 Agustus 2026, per user request — "kok gaada list yang nego
      // sih") let OrderDetailPanel show the actual offer thread for a
      // negotiating order, same data shape as
      // apps/studio/app/dashboard/negotiations/page.tsx already reads.
      // payment_* columns added (3 Agustus 2026, second pass, per user
      // request — "kenapa belum bisa bayar/kirim pembayaran") so
      // OrderDetailPanel can show what the client actually submitted and
      // let staff verify or flag it. See
      // packages/db/migrations/0013_negotiation_payments_ambassadors.sql.
      // package_name added (12 Agustus 2026, order-flow audit fix) — see
      // packages/db/migrations/0036_order_package_name.sql.
      "id, full_name, company_name, email, whatsapp, country, budget, deadline, description, reference_link, status, proposed_price_usd, final_price_usd, created_at, services(name), package_name, clients(company_name), order_files(id, file_name, file_url), order_negotiations(id, proposed_by, amount_usd, message, created_at), payment_network, payment_token, payment_wallet_address, payment_expected_amount, payment_tx_hash, payment_submitted_at, payment_verified_at, payment_underpaid_note",
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range(from, to);

  if (status && status !== "all") {
    query = query.eq("status", status);
  }

  const { data: orders, count } = await query;
  const totalCount = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const statusQueryPart = status && status !== "all" ? `status=${status}&` : "";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Orders</h1>
        <p className="mt-1 text-sm text-white/45">
          Review incoming orders, send quotations, and convert approved ones into projects.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {ORDER_STATUS_FILTERS.map((filter) => {
          const isActive = (status ?? "all") === filter.value;
          const href = filter.value === "all" ? "/orders" : `/orders?status=${filter.value}`;
          return (
            <Link
              key={filter.value}
              href={href}
              className={
                isActive
                  ? "rounded-full bg-[var(--nimia-crimson)]/15 px-4 py-1.5 text-sm font-medium text-white ring-1 ring-inset ring-[var(--nimia-crimson)]/40"
                  : "rounded-full px-4 py-1.5 text-sm font-medium text-white/55 transition-colors hover:bg-white/[0.06] hover:text-white/90"
              }
            >
              {filter.label}
            </Link>
          );
        })}
      </div>

      <OrdersList orders={(orders as any) ?? []} />

      {totalPages > 1 ? (
        <div className="flex items-center justify-between gap-3 pt-2">
          <p className="text-xs text-white/40">
            Page {page} of {totalPages} · {totalCount} order{totalCount === 1 ? "" : "s"}
          </p>
          <div className="flex gap-2">
            <Link
              href={`/orders?${statusQueryPart}page=${Math.max(1, page - 1)}`}
              aria-disabled={page <= 1}
              className={
                page <= 1
                  ? "pointer-events-none rounded-lg border border-white/10 px-3.5 py-1.5 text-xs font-semibold text-white/25"
                  : "rounded-lg border border-white/10 px-3.5 py-1.5 text-xs font-semibold text-white/80 transition-colors hover:bg-white/[0.06]"
              }
            >
              Previous
            </Link>
            <Link
              href={`/orders?${statusQueryPart}page=${Math.min(totalPages, page + 1)}`}
              aria-disabled={page >= totalPages}
              className={
                page >= totalPages
                  ? "pointer-events-none rounded-lg border border-white/10 px-3.5 py-1.5 text-xs font-semibold text-white/25"
                  : "rounded-lg border border-white/10 px-3.5 py-1.5 text-xs font-semibold text-white/80 transition-colors hover:bg-white/[0.06]"
              }
            >
              Next
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
