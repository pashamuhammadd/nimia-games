import { cookies } from "next/headers";
import { createServerClient } from "@nimia/db";
import { InvoicesList, type InvoiceRow } from "./InvoicesList";

export const metadata = { title: "Invoices" };

// Rewritten (16 Agustus 2026, Fase 2 Invoice Architecture) — the previous
// version queried `orders where status='paid'` and showed
// `final_price_usd` as the amount, which is exactly the bug this whole
// refactor started from: for an installment order, `orders.status` flips
// to 'paid' the moment the FIRST installment clears (handle_installment_paid,
// 0038, product decision #1), so that old query showed the client's PARTIAL
// payment as if it were the full price. This version reads
// `order_receipts` (0024, extended in 0044_invoice_architecture_cleanup.sql
// with installment_id + amount_usd) directly instead — one row per ACTUAL
// payment received, each with its own correct amount, so "Total Paid" here
// is now the real sum of what this client has actually sent, never more.
//
// RLS is the only filter needed (order_receipts_select_own_or_admin,
// 0024_order_receipts.sql — joins back to orders.client_id via
// is_owner_client()), same "RLS is the real boundary" convention as every
// other client-scoped query in this app.
export default async function InvoicesPage() {
  const supabase = createServerClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: client } = await supabase
    .from("clients")
    .select("id")
    .eq("user_id", user!.id)
    .single();

  let invoices: InvoiceRow[] = [];

  if (client) {
    const { data } = await supabase
      .from("order_receipts")
      .select(
        "id, order_id, installment_id, amount_usd, receipt_number, created_at, orders(final_price_usd, payment_verified_at, payment_network, payment_token, services(name), package_name), order_installments(sequence, label, payment_network, payment_token, payment_verified_at)",
      )
      .order("created_at", { ascending: false });

    const rows = data ?? [];
    // A second lightweight pass to know how many installments each order
    // has in total (needed for "Installment 1 of 2" — a single receipt row
    // only knows its OWN sequence, not the sibling count). Mirrors the same
    // "fetch base rows, then a scoped follow-up query" shape
    // app/dashboard/orders/page.tsx already uses for its own installments
    // fetch.
    const orderIds = Array.from(new Set(rows.map((r: any) => r.order_id)));
    const { data: allInstallments } =
      orderIds.length > 0
        ? await supabase.from("order_installments").select("order_id").in("order_id", orderIds)
        : { data: [] as { order_id: string }[] };
    const installmentCountByOrder = new Map<string, number>();
    for (const row of allInstallments ?? []) {
      installmentCountByOrder.set(row.order_id, (installmentCountByOrder.get(row.order_id) ?? 0) + 1);
    }

    invoices = rows.map((r: any) => {
      // Defensive normalization — PostgREST embeds a to-one FK as a plain
      // object, but without generated types (Database is still `any`, see
      // packages/db/src/types.ts) that shape isn't guaranteed at compile
      // time. Same pattern as every other order query in this app.
      const order = Array.isArray(r.orders) ? r.orders[0] : r.orders;
      const installment = Array.isArray(r.order_installments) ? r.order_installments[0] : r.order_installments;
      const service = Array.isArray(order?.services) ? order.services[0] : order?.services;
      const totalInstallments = installmentCountByOrder.get(r.order_id) ?? 0;

      return {
        orderId: r.order_id,
        installmentId: r.installment_id,
        receiptNumber: r.receipt_number,
        serviceName: service?.name ?? order?.package_name ?? "Custom Project",
        amountUsd: Number(r.amount_usd ?? order?.final_price_usd ?? 0),
        // null for a legacy/single-payment receipt (nothing to
        // disambiguate) — matches get_or_create_order_receipt's own label
        // logic (0044_invoice_architecture_cleanup.sql).
        label:
          installment && totalInstallments > 1
            ? `Installment ${installment.sequence} of ${totalInstallments}${installment.sequence === totalInstallments ? " (Final)" : ""}`
            : installment
              ? "Full Payment"
              : null,
        verifiedAt: installment?.payment_verified_at ?? order?.payment_verified_at ?? null,
        createdAt: r.created_at,
        network: installment?.payment_network ?? order?.payment_network ?? null,
        token: installment?.payment_token ?? order?.payment_token ?? null,
      };
    });
  }

  const totalPaid = invoices.reduce((sum, invoice) => sum + invoice.amountUsd, 0);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">Invoices</h1>
        <p className="mt-1 text-[var(--nimia-muted)]">
          Every payment Nimia Studio has verified for you, with a downloadable PDF receipt for each.
        </p>
      </div>

      {invoices.length > 0 ? (
        <div className="grid grid-cols-2 gap-4 sm:max-w-md">
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
            <p className="text-xs font-medium text-white/45">Total Paid</p>
            <p className="mt-1 text-xl font-bold text-white">${totalPaid.toLocaleString("en-US")}</p>
          </div>
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
            <p className="text-xs font-medium text-white/45">Invoices</p>
            <p className="mt-1 text-xl font-bold text-white">{invoices.length}</p>
          </div>
        </div>
      ) : null}

      <InvoicesList invoices={invoices} />
    </div>
  );
}
