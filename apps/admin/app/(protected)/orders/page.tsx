import { cookies } from "next/headers";
import Link from "next/link";
import { createServerClient } from "@nimia/db";
import { OrdersList, type OrderListItem } from "./OrdersList";
import { ORDER_STATUS_FILTERS } from "../../lib/orderStatus";
import { getOrderPaymentSummary } from "../../lib/orderPaymentSummary";
import {
  OPERATIONAL_BUCKET_FILTERS,
  computeOperationalBucket,
  type OperationalBucket,
} from "../../lib/operationalStatus";

export const metadata = { title: "Orders" };

// Page size for the range-based pagination below (added 12 Agustus 2026,
// order-flow audit fix — this query used to fetch every order in the
// table, unbounded, on every page load. Fine at today's volume, but a
// straightforward scale problem the longer the studio runs — every order
// ever placed, forever, in one response). 20 keeps the list readable on
// one screen without feeling clipped.
const PAGE_SIZE = 20;

// Operational View tabs (16 Agustus 2026, Fase 9 — see
// ../../lib/operationalStatus.ts's own header comment for the full
// reasoning). "active"/"awaiting_final_payment"/"ready_for_delivery"/
// "completed" all depend on a joined project's status + a computed
// payment summary — Postgrest can't filter or paginate on that
// server-side, so those 4 tabs fetch every paid/converted order up to
// this bound and paginate in memory instead of via a DB range (see the
// branch below). Paid/converted orders are a much smaller, later-
// lifecycle subset of the whole orders table in practice, so this stays
// honest (exact counts, no silent truncation below the cap) without
// re-introducing the unbounded-fetch problem the 12 Agustus audit fix
// eliminated for the rest of this page. If the studio ever has more than
// this many paid/converted orders at once, these 4 tabs would need a
// real SQL view/function instead — noted here rather than silently
// capped without explanation.
const PROJECT_BUCKET_FETCH_CAP = 500;
const PROJECT_DEPENDENT_BUCKETS: OperationalBucket[] = [
  "active",
  "awaiting_final_payment",
  "ready_for_delivery",
  "completed",
];

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

// payment_* columns added (3 Agustus 2026, second pass, per user
// request — "kenapa belum bisa bayar/kirim pembayaran") so
// OrderDetailPanel can show what the client actually submitted and
// let staff verify or flag it. See
// packages/db/migrations/0013_negotiation_payments_ambassadors.sql.
// package_name added (12 Agustus 2026, order-flow audit fix) — see
// packages/db/migrations/0036_order_package_name.sql.
// order_flow_type/payment_method/payment_plan/order_installments
// added (15 Agustus 2026, admin installment UI — see
// packages/db/migrations/0038_custom_order_installments.sql).
// projects(status) added (16 Agustus 2026, Fase 9) — reverse embed via
// projects.order_id's unique FK to orders.id (same pattern
// order_installments already used in this exact query for its own FK),
// so the linked project's operational status is available for
// computeOperationalBucket() without a second round trip. Left as a
// normal (left) embed, not `projects!inner`, so a pre-payment order with
// no project yet still comes back with `projects: null` instead of being
// excluded — only the PROJECT_BUCKET_FETCH_CAP branch below additionally
// filters to paid/converted orders at the DB level.
const SELECT_COLUMNS =
  "id, full_name, company_name, email, whatsapp, country, budget, deadline, description, reference_link, status, proposed_price_usd, final_price_usd, created_at, services(name), package_name, clients(company_name), order_files(id, file_name, file_url), order_negotiations(id, proposed_by, amount_usd, message, created_at), payment_network, payment_token, payment_wallet_address, payment_expected_amount, payment_tx_hash, payment_submitted_at, payment_verified_at, payment_underpaid_note, order_flow_type, payment_method, payment_plan, normal_price_usd, order_installments(id, sequence, label, percentage, amount_usd, status, payment_network, payment_token, payment_tx_hash, payment_submitted_at, payment_verified_at, payment_underpaid_note), projects(status)";

// Shared row-mapping used by both fetch paths below (the normal DB-paged
// path and the in-memory-paged PROJECT_DEPENDENT_BUCKETS path) — computes
// the two Fase 9 fields (paymentSummary, operationalBucket) from data
// already present on the row, same "client preview, DB stays
// authoritative" posture every payment-summary mirror in this codebase
// already uses.
function mapOrderRow(o: any): OrderListItem {
  // projects is a to-one embed (order_id is UNIQUE) but Postgrest doesn't
  // always guarantee that comes back as a plain object rather than a
  // 1-element array — same defensive normalization every other to-one
  // embed in this file already uses (services, clients).
  const projectRow = Array.isArray(o.projects) ? o.projects[0] : o.projects;
  const paymentSummary = getOrderPaymentSummary({
    finalPriceUsd: o.final_price_usd,
    orderStatus: o.status,
    installments: (o.order_installments ?? []).map((inst: any) => ({
      amountUsd: Number(inst.amount_usd),
      status: inst.status,
    })),
  });
  const operationalBucket = computeOperationalBucket({ status: o.status }, paymentSummary, projectRow?.status ?? null);
  return { ...o, paymentSummary, operationalBucket } as OrderListItem;
}

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; status?: string; payment?: string; page?: string }>;
}) {
  const { view, status, payment, page: pageParam } = await searchParams;
  const page = Math.max(1, Number.parseInt(pageParam ?? "1", 10) || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const supabase = createServerClient(await cookies());

  const activeView = (OPERATIONAL_BUCKET_FILTERS.some((f) => f.value === view) ? view : "all") as
    | OperationalBucket
    | "all";

  let orders: OrderListItem[] = [];
  let totalCount = 0;

  if (activeView !== "all" && PROJECT_DEPENDENT_BUCKETS.includes(activeView)) {
    // See PROJECT_BUCKET_FETCH_CAP's own comment above for why this path
    // exists and pages in memory instead of via a DB range.
    let capQuery = supabase
      .from("orders")
      .select(SELECT_COLUMNS)
      .in("status", ["paid", "converted"])
      .order("created_at", { ascending: false })
      .limit(PROJECT_BUCKET_FETCH_CAP);
    if (payment === "full_payment" || payment === "installments") {
      capQuery = capQuery.eq("payment_method", payment);
    }
    const { data } = await capQuery;
    const bucketed = ((data as any[]) ?? []).map(mapOrderRow).filter((o) => o.operationalBucket === activeView);
    totalCount = bucketed.length;
    orders = bucketed.slice(from, to + 1);
  } else {
    let query = supabase
      .from("orders")
      .select(SELECT_COLUMNS, { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to);

    // The operational view tab (when active) takes precedence over the
    // raw status pill row below it — the two are deliberately mutually
    // exclusive (picking "New" and also filtering status=negotiating at
    // the same time is a contradiction), while the Payment Method lane
    // stays a genuinely orthogonal third dimension that composes with
    // either. See operationalStatus.ts's own header comment for exactly
    // which orders.status values map to which bucket.
    if (activeView === "new") {
      query = query.eq("status", "pending_review");
    } else if (activeView === "awaiting_payment") {
      query = query.in("status", ["quotation_sent", "negotiating", "awaiting_payment", "payment_submitted"]);
    } else if (activeView === "cancelled") {
      // Only orders.status='rejected' — a project cancelled AFTER
      // conversion also computes to the "cancelled" bucket on its own
      // row (see computeOperationalBucket), but isn't reachable through
      // THIS tab's DB filter today. Documented gap, not a silent bug —
      // see operationalStatus.ts's own comment on this exact point.
      query = query.eq("status", "rejected");
    } else if (status && status !== "all") {
      query = query.eq("status", status);
    }

    if (payment === "full_payment" || payment === "installments") {
      query = query.eq("payment_method", payment);
    }

    const { data, count } = await query;
    totalCount = count ?? 0;
    orders = ((data as any[]) ?? []).map(mapOrderRow);
  }

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  // All 3 filter dimensions (view/status/payment) need to survive
  // pagination links AND round-trip into each other's own href — built
  // once here rather than duplicated inline at every link site below.
  const viewQueryPart = activeView !== "all" ? `view=${activeView}&` : "";
  const statusQueryPart = activeView === "all" && status && status !== "all" ? `status=${status}&` : "";
  const paymentQueryPart = payment === "full_payment" || payment === "installments" ? `payment=${payment}&` : "";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Orders</h1>
        <p className="mt-1 text-sm text-white/45">
          Review incoming orders, send quotations, and convert approved ones into projects.
        </p>
      </div>

      {/* Operational View (16 Agustus 2026, Fase 9) — the grouped tab row
          FASE0-AUDIT.md problem #9 asked for, replacing "1 halaman list +
          2 filter independen" as the PRIMARY way to scan the pipeline.
          The raw status pills + payment lane below are kept as-is for
          admins who want the precise, ungrouped view — this is additive,
          not a removal of existing capability. */}
      <div className="flex flex-wrap gap-2">
        {OPERATIONAL_BUCKET_FILTERS.map((filter) => {
          const isActive = activeView === filter.value;
          const href = filter.value === "all" ? `/orders?${paymentQueryPart}` : `/orders?${paymentQueryPart}view=${filter.value}`;
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

      {/* Raw status filter — only meaningful when no Operational View tab
          is active above (see viewQueryPart's own comment); kept visible
          regardless so switching back to "All" operational view doesn't
          also require re-picking a raw status filter that was already
          set. */}
      <div className="flex flex-wrap items-center gap-2 border-t border-white/[0.06] pt-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-white/35">Raw Status</span>
        {ORDER_STATUS_FILTERS.map((filter) => {
          const isActive = activeView === "all" && (status ?? "all") === filter.value;
          const href =
            filter.value === "all" ? `/orders?${paymentQueryPart}` : `/orders?${paymentQueryPart}status=${filter.value}`;
          return (
            <Link
              key={filter.value}
              href={href}
              className={
                isActive
                  ? "rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold text-white"
                  : "rounded-full border border-white/10 px-3 py-1 text-xs font-medium text-white/45 transition-colors hover:bg-white/[0.06] hover:text-white/80"
              }
            >
              {filter.label}
            </Link>
          );
        })}
      </div>

      {/* Payment Method lane (15 Agustus 2026, two-lane admin UI — see
          PAYMENT_METHOD_FILTERS' own comment above). Visually distinct
          styling (outline pills, not filled) from the rows above it so
          the independent filter dimensions never look like one combined
          list of options. */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-white/35">Payment</span>
        {PAYMENT_METHOD_FILTERS.map((filter) => {
          const isActive = (payment ?? "all") === filter.value;
          const href =
            filter.value === "all"
              ? `/orders?${viewQueryPart}${statusQueryPart}`
              : `/orders?${viewQueryPart}${statusQueryPart}payment=${filter.value}`;
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

      <OrdersList orders={orders} />

      {totalPages > 1 ? (
        <div className="flex items-center justify-between gap-3 pt-2">
          <p className="text-xs text-white/40">
            Page {page} of {totalPages} · {totalCount} order{totalCount === 1 ? "" : "s"}
          </p>
          <div className="flex gap-2">
            <Link
              href={`/orders?${viewQueryPart}${statusQueryPart}${paymentQueryPart}page=${Math.max(1, page - 1)}`}
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
              href={`/orders?${viewQueryPart}${statusQueryPart}${paymentQueryPart}page=${Math.min(totalPages, page + 1)}`}
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
