"use client";

import * as React from "react";
import { Search, Download, Receipt } from "lucide-react";
import { formatRelativeTime } from "../../lib/relativeTime";

// Rewritten (16 Agustus 2026, Fase 2 Invoice Architecture) — each row is
// now one order_receipts row (one ACTUAL payment received), not one paid
// order. A multi-milestone order shows up here as several rows, one per
// installment paid so far, each with its own correct amount — see
// page.tsx's own comment for why the old "one row per order" shape was the
// bug.
export type InvoiceRow = {
  orderId: string;
  installmentId: string | null;
  receiptNumber: string;
  serviceName: string;
  amountUsd: number;
  // e.g. "Installment 1 of 2", "Installment 2 of 2 (Final)", "Full
  // Payment", or null for a legacy pre-installments receipt.
  label: string | null;
  verifiedAt: string | null;
  createdAt: string;
  network: string | null;
  token: string | null;
};

// Mirrors OrderDetail.tsx / PaymentPanel.tsx's own copy so the same
// network reads the same everywhere in this app.
const NETWORK_LABELS: Record<string, string> = {
  ethereum: "Ethereum",
  bsc: "BNB Smart Chain (BSC)",
  tron: "Tron",
  solana: "Solana",
  cardano: "Cardano",
  ton: "TON",
};

export function InvoicesList({ invoices }: { invoices: InvoiceRow[] }) {
  const [query, setQuery] = React.useState("");

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return invoices;
    return invoices.filter(
      (invoice) =>
        invoice.serviceName.toLowerCase().includes(q) || invoice.receiptNumber.toLowerCase().includes(q),
    );
  }, [invoices, query]);

  if (invoices.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-6 py-16 text-center">
        <Receipt className="h-8 w-8 text-white/25" aria-hidden="true" />
        <p className="max-w-sm text-sm text-white/50">
          No invoices yet. Once a payment you&apos;ve submitted is verified, its PDF receipt shows up here
          automatically.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30"
          aria-hidden="true"
        />
        <input
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by service or receipt number..."
          className="w-full rounded-lg border border-white/10 bg-white/[0.04] py-2 pl-9 pr-3 text-sm text-white placeholder:text-white/30 focus:outline-none"
        />
      </div>

      <div className="flex flex-col gap-3">
        {filtered.map((invoice) => (
          <div
            key={invoice.installmentId ?? invoice.orderId}
            className="flex flex-col gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold text-white">{invoice.serviceName}</p>
                {invoice.label ? (
                  <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-xs text-white/50">
                    {invoice.label}
                  </span>
                ) : null}
                <code className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-xs text-white/50">
                  {invoice.receiptNumber}
                </code>
              </div>
              <p className="mt-1 text-xs text-white/40">
                {invoice.verifiedAt
                  ? `Paid ${formatRelativeTime(invoice.verifiedAt)}`
                  : `Issued ${formatRelativeTime(invoice.createdAt)}`}
                {invoice.network
                  ? ` · ${NETWORK_LABELS[invoice.network] ?? invoice.network}${invoice.token ? ` (${invoice.token})` : ""}`
                  : ""}
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-3">
              <p className="text-base font-bold text-white">${invoice.amountUsd.toLocaleString("en-US")}</p>
              <a
                href={
                  invoice.installmentId
                    ? `/api/orders/${invoice.orderId}/receipt?installment=${invoice.installmentId}`
                    : `/api/orders/${invoice.orderId}/receipt`
                }
                className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-3.5 py-2 text-xs font-semibold text-white/80 transition-colors hover:bg-white/10 hover:text-white"
              >
                <Download className="h-3.5 w-3.5" aria-hidden="true" />
                PDF
              </a>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] px-6 py-16 text-center text-sm text-white/40">
          No invoices match &ldquo;{query}&rdquo;.
        </div>
      ) : null}
    </div>
  );
}
