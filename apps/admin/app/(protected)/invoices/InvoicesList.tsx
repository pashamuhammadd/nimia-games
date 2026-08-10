"use client";

import * as React from "react";
import { Search, Download } from "lucide-react";
import { formatRelativeTime } from "../../lib/relativeTime";

// Real implementation (10 Agustus 2026) — replaces the ComingSoonState
// placeholder ("Creating invoices, verifying submitted payments, and
// generating receipts from here is coming in a later stage"). Payment
// creation/verification already lives on the Orders page (OrderDetailPanel);
// this page is the finance-facing view of every order that has actually
// been paid — one dedicated, searchable place to browse and re-download
// every PDF receipt instead of hunting through Orders one at a time.
export type InvoiceRow = {
  orderId: string;
  clientLabel: string;
  serviceName: string;
  amountUsd: number;
  verifiedAt: string | null;
  createdAt: string;
  network: string | null;
  token: string | null;
  receiptNumber: string | null;
};

const NETWORK_LABELS: Record<string, string> = {
  ethereum: "Ethereum",
  bsc: "BNB Smart Chain (BSC)",
  tron: "Tron",
  solana: "Solana",
  cardano: "Cardano",
  ton: "TON",
};

const THUMBNAIL_GRADIENTS = [
  "from-[var(--nimia-crimson)] to-[var(--nimia-pink)]",
  "from-purple-500 to-[var(--nimia-crimson)]",
  "from-sky-500 to-purple-500",
  "from-amber-500 to-[var(--nimia-crimson)]",
];

// Same deterministic per-client accent trick as
// apps/admin/app/(protected)/orders/OrdersList.tsx.
function thumbnailGradient(seed: string) {
  const hash = Array.from(seed).reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return THUMBNAIL_GRADIENTS[hash % THUMBNAIL_GRADIENTS.length];
}

function initialsFor(text: string) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  return (words[0]?.[0] ?? "?").toUpperCase() + (words[1]?.[0] ?? "").toUpperCase();
}

export function InvoicesList({ invoices }: { invoices: InvoiceRow[] }) {
  const [query, setQuery] = React.useState("");

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return invoices;
    return invoices.filter(
      (invoice) =>
        invoice.clientLabel.toLowerCase().includes(q) ||
        invoice.serviceName.toLowerCase().includes(q) ||
        (invoice.receiptNumber ?? "").toLowerCase().includes(q),
    );
  }, [invoices, query]);

  if (invoices.length === 0) {
    return (
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] px-6 py-16 text-center text-sm text-white/40">
        No verified payments yet.
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
          placeholder="Search by client, service, or receipt number..."
          className="w-full rounded-lg border border-white/10 bg-white/[0.04] py-2 pl-9 pr-3 text-sm text-white placeholder:text-white/30 focus:outline-none"
        />
      </div>

      <div className="flex flex-col gap-3">
        {filtered.map((invoice) => (
          <div
            key={invoice.orderId}
            className="flex flex-col gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex min-w-0 items-center gap-3">
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br text-xs font-bold text-white ${thumbnailGradient(invoice.clientLabel)}`}
                aria-hidden="true"
              >
                {initialsFor(invoice.clientLabel)}
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate text-sm font-semibold text-white">{invoice.clientLabel}</p>
                  {invoice.receiptNumber ? (
                    <code className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-xs text-white/50">
                      {invoice.receiptNumber}
                    </code>
                  ) : (
                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-xs text-white/40">
                      Generating on download
                    </span>
                  )}
                </div>
                <p className="mt-0.5 truncate text-xs text-white/45">
                  {invoice.serviceName} ·{" "}
                  {invoice.verifiedAt
                    ? `Paid ${formatRelativeTime(invoice.verifiedAt)}`
                    : `Submitted ${formatRelativeTime(invoice.createdAt)}`}
                  {invoice.network
                    ? ` · ${NETWORK_LABELS[invoice.network] ?? invoice.network}${invoice.token ? ` (${invoice.token})` : ""}`
                    : ""}
                </p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-3 self-start sm:self-center">
              <p className="text-base font-bold text-white">${invoice.amountUsd.toLocaleString("en-US")}</p>
              <a
                href={`/api/orders/${invoice.orderId}/receipt`}
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
