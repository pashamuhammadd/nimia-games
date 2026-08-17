// Client-side mirror of get_order_payment_summary() (packages/db/migrations/
// 0043_order_payment_summary.sql) — Fase 1 (Payment Architecture) of the
// Order/Payment/Invoice refactor agreed with the user 16 Agustus 2026.
//
// The DB function is the actual source of truth (and the ONLY thing any
// money-critical write ever trusts — nothing here ever writes anything).
// This module exists because apps/app's Orders list/detail pages already
// fetch an order's `final_price_usd`/`status` and its `order_installments`
// rows for other reasons (rendering the schedule itself), and re-deriving
// paid/remaining/status from data already in hand is far cheaper than one
// extra RPC round trip per order on a paginated list page. Kept as a
// genuine, reusable production module (unlike
// pricing/__tests__/installment-oracle.ts, which deliberately mirrors
// SQL TRIGGER bodies that only ever run inside Postgres and have no
// legitimate reason to be reimplemented in app code) — this function's SQL
// counterpart is a plain read-only helper, so mirroring it here for display
// purposes is the same "client preview, server recomputes/is authoritative"
// posture apply-installment-fee-preview.ts already uses for the fee
// estimate shown before an order is even submitted.
//
// IMPORTANT — keep this in lockstep with 0043's SQL by hand (no codegen
// link between them, same caveat installment-oracle.ts's own header
// documents for its mirrors). If the SQL function's branching or rounding
// ever changes, update this to match.

export type OrderPaymentStatus = "unpaid" | "partially_paid" | "paid" | "overdue";

export interface OrderPaymentSummary {
  totalAmountUsd: number;
  paidAmountUsd: number;
  remainingAmountUsd: number;
  paymentStatus: OrderPaymentStatus;
  hasInstallments: boolean;
}

// Full public.installment_status enum (0038) — every value a real
// order_installments row's `status` column can actually hold.
export type AnyInstallmentStatus = "scheduled" | "pending_payment" | "payment_submitted" | "paid" | "overdue" | "cancelled";

/** Postgres `round(numeric, 2)` rounds half away from zero for positive
 * inputs — same behavior as JS Math.round for the positive dollar amounts
 * this domain always deals with (order prices are never negative). Kept as
 * its own local copy (not imported from installment-oracle.ts) so this
 * production module has zero dependency on the test-only mirror file. */
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Mirrors get_order_payment_summary()'s two-branch shape exactly:
 *   - An order WITH materialized order_installments rows (every order
 *     submitted since payment_method became required, 15 Agustus 2026 —
 *     including full_payment orders, which always get exactly one 100%
 *     row from materialize_order_installments) sums only the rows Admin
 *     has actually verified 'paid'. A 'payment_submitted' (client sent a
 *     tx hash, not yet verified) row does NOT count.
 *   - A LEGACY order with none (predates payment_method, or a Creative
 *     Agent order today) falls back to orders.status — that old
 *     single-payment flow has no partial state, so 'paid' there always
 *     meant 100% of final_price_usd cleared.
 */
export function getOrderPaymentSummary(input: {
  finalPriceUsd: number | null;
  orderStatus: string;
  installments: { amountUsd: number; status: AnyInstallmentStatus }[];
}): OrderPaymentSummary {
  const { finalPriceUsd, orderStatus, installments } = input;
  const total = finalPriceUsd ?? 0;
  const hasInstallments = installments.length > 0;

  const paid = hasInstallments
    ? round2(installments.filter((row) => row.status === "paid").reduce((sum, row) => sum + row.amountUsd, 0))
    : orderStatus === "paid"
      ? total
      : 0;

  const remaining = Math.max(round2(total - paid), 0);

  let paymentStatus: OrderPaymentStatus;
  if (finalPriceUsd == null || total <= 0) paymentStatus = "unpaid";
  else if (paid >= total) paymentStatus = "paid";
  else if (paid > 0) paymentStatus = "partially_paid";
  else paymentStatus = "unpaid";

  return { totalAmountUsd: total, paidAmountUsd: paid, remainingAmountUsd: remaining, paymentStatus, hasInstallments };
}

// ----------------------------------------------------------------------
// getProjectPaymentSummaries — Fase 8 (Client dashboard, payment summary
// on the project card) of the 16 Agustus 2026 Order/Payment/Invoice
// refactor. FASE0-AUDIT.md's Current Problems item #12: "Client dashboard
// tidak punya ringkasan 'Paid $150/$300, Remaining $150' di level project
// card — InstallmentSchedule.tsx menunjukkan tiap milestone tapi tidak ada
// agregat di satu tempat."
//
// `projects` itself carries no payment data — the join path is
// projects.order_id -> orders -> order_installments (projects.order_id is
// a nullable, unique FK, see packages/db/migrations/0003_orders_projects.sql).
// This is the same "one batched query keyed off the ids already in hand,
// not N+1" pattern apps/app/app/dashboard/orders/page.tsx already
// established for the Orders list — extracted here so both dashboard
// surfaces that show project cards (the /dashboard overview's
// ActiveOrdersSection and /dashboard/projects' ProjectsList) share one
// implementation instead of two hand-copied versions drifting apart.
//
// A project with no linked order (order_id null — shouldn't normally
// happen since projects are only ever created from a paid order via
// orders_create_project_after_paid, 0029, but the column is nullable) or
// whose linked order 404s under RLS simply gets `null` in the returned
// map; callers render nothing rather than a fabricated $0 summary.
//
// `supabase` is left untyped (matches this module's and the rest of
// apps/app's existing posture — Database is still the `any` placeholder,
// see packages/db/src/types.ts) rather than importing a client type this
// codebase doesn't actually have generated yet.
export interface ProjectPaymentJoinInput {
  id: string;
  orderId: string | null;
}

export async function getProjectPaymentSummaries(
  supabase: any,
  projects: ProjectPaymentJoinInput[],
): Promise<Map<string, OrderPaymentSummary | null>> {
  const result = new Map<string, OrderPaymentSummary | null>();

  const projectsWithOrder = projects.filter((p) => p.orderId != null);
  if (projectsWithOrder.length === 0) return result;

  const orderIds = Array.from(new Set(projectsWithOrder.map((p) => p.orderId as string)));

  // RLS (orders_select_own_or_admin) already scopes this to orders the
  // signed-in client owns regardless — the explicit .in() is just to
  // avoid over-fetching, same posture orders/page.tsx's own comment
  // documents for its identical installments batch-fetch below.
  const { data: orderRows } = await supabase
    .from("orders")
    .select("id, final_price_usd, status, payment_method")
    .in("id", orderIds);

  const ordersById = new Map<string, { final_price_usd: number | null; status: string; payment_method: string | null }>();
  for (const o of (orderRows ?? []) as any[]) ordersById.set(o.id, o);

  const installmentOrderIds = (orderRows ?? [])
    .filter((o: any) => o.payment_method != null)
    .map((o: any) => o.id as string);

  const installmentsByOrderId = new Map<string, { amountUsd: number; status: AnyInstallmentStatus }[]>();
  if (installmentOrderIds.length > 0) {
    const { data: installmentRows } = await supabase
      .from("order_installments")
      .select("order_id, amount_usd, status")
      .in("order_id", installmentOrderIds);

    for (const row of (installmentRows ?? []) as any[]) {
      const list = installmentsByOrderId.get(row.order_id) ?? [];
      list.push({ amountUsd: Number(row.amount_usd), status: row.status });
      installmentsByOrderId.set(row.order_id, list);
    }
  }

  for (const project of projectsWithOrder) {
    const order = ordersById.get(project.orderId as string);
    if (!order) {
      // Order not found (shouldn't happen for a real project, but RLS or
      // a deleted order — projects.order_id is `on delete set null`, so
      // this branch is mostly theoretical) — no summary rather than a
      // fabricated one.
      result.set(project.id, null);
      continue;
    }
    result.set(
      project.id,
      getOrderPaymentSummary({
        finalPriceUsd: order.final_price_usd,
        orderStatus: order.status,
        installments: installmentsByOrderId.get(project.orderId as string) ?? [],
      }),
    );
  }

  return result;
}
