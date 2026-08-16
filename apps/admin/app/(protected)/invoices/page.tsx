import { cookies } from "next/headers";
import { createServerClient } from "@nimia/db";
import { InvoicesList, type InvoiceRow } from "./InvoicesList";

export const metadata = { title: "Invoices" };

// Rewritten (16 Agustus 2026, Fase 2 Invoice Architecture) — the previous
// version queried `orders where status='paid'` and showed
// `final_price_usd` as "Total Revenue"/"This Month", which is exactly the
// bug this whole refactor started from: for an installment order,
// `orders.status` flips to 'paid' the moment the FIRST installment clears
// (handle_installment_paid, 0038, product decision #1), so that old query
// counted the client's PARTIAL payment as if the full price had come in.
// This version reads `order_receipts` (0024, extended in
// 0044_invoice_architecture_cleanup.sql with installment_id + amount_usd)
// directly instead — one row per ACTUAL payment received, each with its
// own correct amount, so revenue here is now the real sum of what's
// actually landed, never more.
//
// Reads across ALL clients, same "safe because RLS only allows is_admin()
// to see every row" convention as every other admin list page.
export default async function InvoicesPage() {
  const supabase = createServerClient(await cookies());

  const { data } = await supabase
    .from("order_receipts")
    .select(
      "id, order_id, installment_id, amount_usd, receipt_number, created_at, orders(full_name, company_name, final_price_usd, payment_verified_at, payment_network, payment_token, services(name), clients(company_name)), order_installments(sequence, label, payment_network, payment_token, payment_verified_at)",
    )
    .order("created_at", { ascending: false });

  const rows = data ?? [];
  // Second pass for total installment count per order (needed for
  // "Installment 1 of 2" — a receipt row only knows its own sequence).
  const orderIds = Array.from(new Set(rows.map((r: any) => r.order_id)));
  const { data: allInstallments } =
    orderIds.length > 0
      ? await supabase.from("order_installments").select("order_id").in("order_id", orderIds)
      : { data: [] as { order_id: string }[] };
  const installmentCountByOrder = new Map<string, number>();
  for (const row of allInstallments ?? []) {
    installmentCountByOrder.set(row.order_id, (installmentCountByOrder.get(row.order_id) ?? 0) + 1);
  }

  const invoices: InvoiceRow[] = rows.map((r: any) => {
    const order = Array.isArray(r.orders) ? r.orders[0] : r.orders;
    const installment = Array.isArray(r.order_installments) ? r.order_installments[0] : r.order_installments;
    const service = Array.isArray(order?.services) ? order.services[0] : order?.services;
    const client = Array.isArray(order?.clients) ? order.clients[0] : order?.clients;
    const totalInstallments = installmentCountByOrder.get(r.order_id) ?? 0;

    return {
      orderId: r.order_id,
      installmentId: r.installment_id,
      receiptNumber: r.receipt_number,
      clientLabel: client?.company_name || order?.company_name || order?.full_name || "Unknown client",
      serviceName: service?.name ?? "Custom Project",
      amountUsd: Number(r.amount_usd ?? order?.final_price_usd ?? 0),
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

  const totalRevenue = invoices.reduce((sum, invoice) => sum + invoice.amountUsd, 0);
  const now = new Date();
  const thisMonthRevenue = invoices
    .filter((invoice) => {
      if (!invoice.verifiedAt) return false;
      const verified = new Date(invoice.verifiedAt);
      return verified.getMonth() === now.getMonth() && verified.getFullYear() === now.getFullYear();
    })
    .reduce((sum, invoice) => sum + invoice.amountUsd, 0);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Invoices</h1>
        <p className="mt-1 text-sm text-white/45">
          Every verified payment across all clients, with its downloadable PDF receipt.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
          <p className="text-xs font-medium text-white/45">Total Revenue</p>
          <p className="mt-1 text-xl font-bold text-white">${totalRevenue.toLocaleString("en-US")}</p>
        </div>
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
          <p className="text-xs font-medium text-white/45">This Month</p>
          <p className="mt-1 text-xl font-bold text-emerald-300">${thisMonthRevenue.toLocaleString("en-US")}</p>
        </div>
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
          <p className="text-xs font-medium text-white/45">Invoices</p>
          <p className="mt-1 text-xl font-bold text-white">{invoices.length}</p>
        </div>
      </div>

      <InvoicesList invoices={invoices} />
    </div>
  );
}
