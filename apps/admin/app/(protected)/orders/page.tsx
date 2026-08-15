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

// Payment Method filter — the "two-lane" admin UI (15 Agustus 2026,
// financial platform audit item #3: "admin bisa mengelola orderan full
// payment atau cicilan dengan mudah ... UI lebih gampang dimengerti").
// Kept as a SECOND, independent filter row alongside ORDER_STATUS_FILTERS
// (not a merged single control) — status and payment method are
// orthogonal questions ("where is this order in the pipeline" vs "how is
// it being paid"), and an admin scanning for e.g. every Awaiting Payment
// installment order across the whole pipeline needs to combine both, not
// pick one or the other.
const PAYMENT_METHOD_FILTERS: { value: "all" | "full_payment" | "installments"; label: string }[] = [
  { value: "all", label: "All Payments" },
  { value: "full_payment", label: "Full Payment" },
  { value: "installments", label: "Installments" },
];

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; payment?: string; page?: string }>;
}) {
  const { status, payment, page: pageParam } = await searchParams;
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
      // order_flow_type/payment_method/payment_plan/order_installments
      // added (15 Agustus 2026, admin installment UI — see
      // packages/db/migrations/0038_custom_order_installments.sql). Admin
      // had no visibility into any of this before — see
      // OrderDetailPanel.tsx's Payment Plan / Installment Schedule
      // sections and platform_audit_15agst finding #7 in project memory.
      "id, full_name, company_name, email, whatsapp, country, budget, deadline, description, reference_link, status, proposed_price_usd, final_price_usd, created_at, services(name), package_name, clients(company_name), order_files(id, file_name, file_url), order_negotiations(id, proposed_by, amount_usd, message, created_at), payment_network, payment_token, payment_wallet_address, payment_expected_amount, payment_tx_hash, payment_submitted_at, payment_verified_at, payment_underpaid_note, order_flow_type, payment_method, payment_plan, normal_price_usd, order_installments(id, sequence, label, percentage, amount_usd, status, payment_network, payment_token, payment_tx_hash, payment_submitted_at, payment_verified_at, payment_underpaid_note)",
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range(from, to);

  if (status && status !== "all") {
    query = query.eq("status", status);
  }
  if (payment === "full_payment" || payment === "installments") {
    query = query.eq("payment_method", payment);
  }

  const { data: orders, count } = await query;
  const totalCount = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  // Both filters need to survive pagination links AND round-trip into each
  // other's own href (switching status shouldn't drop an active payment
  // filter, and vice versa) — built once here rather than duplicated
  // inline at every link site below.
  const statusQueryPart = status && status !== "all" ? `status=${status}&` : "";
  const paymentQueryPart = payment === "full_payment" || payment === "installments" ? `payment=${payment}&` : "";

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
          const href =
            filter.value === "all" ? `/orders?${paymentQueryPart}` : `/orders?${paymentQueryPart}status=${filter.value}`;
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

      {/* Payment Method lane (15 Agustus 2026, two-lane admin UI — see
          PAYMENT_METHOD_FILTERS' own comment above). Visually distinct
          styling (outline pills, not filled) from the status row above it
          so the two independent filter dimensions never look like one
          combined list of options. */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-white/35">Payment</span>
        {PAYMENT_METHOD_FILTERS.map((filter) => {
          const isActive = (payment ?? "all") === filter.value;
          const href =
            filter.value === "all" ? `/orders?${statusQueryPart}` : `/orders?${statusQueryPart}payment=${filter.value}`;
          return (
            <Link
              key={filter.value}
              href={href}
              className={
                isActive
                  ? "rounded-full border border-sky-400/40 bg-sky-400/10 px-3.5 py-1 text-xs font-semibold text-sky-300"
                  : "rounded-full border border-white/10 px-3.5 py-1 text-xs font-medium text-white/50 transition-colors hover:bg-white/[0.06] hover:text-white/80"
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
              href={`/orders?${statusQueryPart}${paymentQueryPart}page=${Math.max(1, page - 1)}`}
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
              href={`/orders?${statusQueryPart}${paymentQueryPart}page=${Math.min(totalPages, page + 1)}`}
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
