"use client";

import * as React from "react";
import { Search, Mail, MessageCircle, Globe2, UserRound } from "lucide-react";
import { Modal, cn } from "@nimia/ui";
import { orderStatusMeta } from "../../lib/orderStatus";
import { formatRelativeTime } from "../../lib/relativeTime";

export type ClientOrderSummary = {
  serviceName: string;
  status: string;
  finalPriceUsd: number | null;
  createdAt: string;
};

export type ClientRow = {
  id: string;
  name: string;
  avatarUrl: string | null;
  email: string | null;
  whatsapp: string | null;
  country: string | null;
  joinedAt: string;
  ordersCount: number;
  paidOrdersCount: number;
  totalPaidUsd: number;
  orders: ClientOrderSummary[];
};

const THUMBNAIL_GRADIENTS = [
  "from-[var(--nimia-crimson)] to-[var(--nimia-pink)]",
  "from-purple-500 to-[var(--nimia-crimson)]",
  "from-sky-500 to-purple-500",
  "from-amber-500 to-[var(--nimia-crimson)]",
];

// Same deterministic per-client accent trick as
// apps/admin/app/(protected)/orders/OrdersList.tsx — picks from a fixed
// on-brand palette so the same client always gets the same "avatar" color
// when they have no uploaded photo yet.
function thumbnailGradient(seed: string) {
  const hash = Array.from(seed).reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return THUMBNAIL_GRADIENTS[hash % THUMBNAIL_GRADIENTS.length];
}

// Client thumbnail — parity fix (11 Agustus 2026, user report: profile
// pictures here should look like apps/studio's, not letters). Used to
// always render two-letter initials on a colored square regardless of
// whether the client had actually uploaded a photo; now prefers the real
// `users.avatar_url` (same field apps/studio's own Avatar.tsx reads) and
// only falls back to a plain silhouette icon — never text — on the same
// deterministic gradient as before.
function ClientThumbnail({ client }: { client: ClientRow }) {
  if (client.avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- a user-uploaded
      // photo is an arbitrary remote URL, same reasoning as apps/studio's Avatar.tsx.
      <img
        src={client.avatarUrl}
        alt={`${client.name}'s profile picture`}
        className="h-12 w-12 shrink-0 rounded-xl object-cover"
      />
    );
  }
  return (
    <div
      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white ${thumbnailGradient(client.name)}`}
      aria-hidden="true"
    >
      <UserRound className="h-6 w-6 text-white/90" strokeWidth={1.75} />
    </div>
  );
}

export function ClientsList({ clients }: { clients: ClientRow[] }) {
  const [query, setQuery] = React.useState("");
  const [selected, setSelected] = React.useState<ClientRow | null>(null);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter(
      (client) =>
        client.name.toLowerCase().includes(q) ||
        (client.email ?? "").toLowerCase().includes(q) ||
        (client.whatsapp ?? "").toLowerCase().includes(q) ||
        (client.country ?? "").toLowerCase().includes(q),
    );
  }, [clients, query]);

  if (clients.length === 0) {
    return (
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] px-6 py-16 text-center text-sm text-white/40">
        No clients have signed up yet.
      </div>
    );
  }

  return (
    <>
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
            placeholder="Search by name, email, WhatsApp, or country..."
            className="w-full rounded-lg border border-white/10 bg-white/[0.04] py-2 pl-9 pr-3 text-sm text-white placeholder:text-white/30 focus:outline-none"
          />
        </div>

        <div className="flex flex-col gap-3">
          {filtered.map((client) => (
            <button
              key={client.id}
              type="button"
              onClick={() => setSelected(client)}
              className="flex flex-col gap-4 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-left transition-colors hover:border-white/[0.12] sm:flex-row sm:items-center"
            >
              <ClientThumbnail client={client} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3">
                  <p className="truncate text-sm font-semibold text-white">{client.name}</p>
                  <span className="shrink-0 text-xs text-white/35">
                    Joined {formatRelativeTime(client.joinedAt)}
                  </span>
                </div>
                <p className="mt-0.5 truncate text-xs text-white/45">
                  {client.email ?? "No email on file"}
                  {client.country ? ` · ${client.country}` : ""}
                </p>
                <p className="mt-1.5 text-xs text-white/35">
                  {client.ordersCount} order{client.ordersCount === 1 ? "" : "s"} · $
                  {client.totalPaidUsd.toLocaleString("en-US")} paid
                </p>
              </div>
              <span className="shrink-0 self-start rounded-lg border border-white/10 px-3.5 py-2 text-center text-xs font-semibold text-white/80 sm:self-center">
                View
              </span>
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] px-6 py-16 text-center text-sm text-white/40">
            No clients match &ldquo;{query}&rdquo;.
          </div>
        ) : null}
      </div>

      <Modal open={!!selected} onClose={() => setSelected(null)} ariaLabel="Client detail" className="max-w-lg">
        {selected ? (
          <div className="flex flex-col gap-5">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-white/35">Client</span>
              <h2 className="mt-1 text-lg font-bold text-white">{selected.name}</h2>
            </div>

            <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
              {selected.email ? (
                <div className="flex items-center gap-2 text-white/70">
                  <Mail className="h-4 w-4 shrink-0 text-white/35" aria-hidden="true" />
                  <span className="truncate">{selected.email}</span>
                </div>
              ) : null}
              {selected.whatsapp ? (
                <div className="flex items-center gap-2 text-white/70">
                  <MessageCircle className="h-4 w-4 shrink-0 text-white/35" aria-hidden="true" />
                  {selected.whatsapp}
                </div>
              ) : null}
              {selected.country ? (
                <div className="flex items-center gap-2 text-white/70">
                  <Globe2 className="h-4 w-4 shrink-0 text-white/35" aria-hidden="true" />
                  {selected.country}
                </div>
              ) : null}
            </div>

            <div className="grid grid-cols-3 gap-3 rounded-xl border border-white/[0.08] bg-white/[0.03] p-4 text-center">
              <div>
                <p className="text-lg font-bold text-white">{selected.ordersCount}</p>
                <p className="text-xs text-white/40">Orders</p>
              </div>
              <div>
                <p className="text-lg font-bold text-white">{selected.paidOrdersCount}</p>
                <p className="text-xs text-white/40">Paid</p>
              </div>
              <div>
                <p className="text-lg font-bold text-emerald-300">
                  ${selected.totalPaidUsd.toLocaleString("en-US")}
                </p>
                <p className="text-xs text-white/40">Total Paid</p>
              </div>
            </div>

            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-white/35">
                Order History
              </span>
              {selected.orders.length > 0 ? (
                <div className="mt-2 flex flex-col gap-2">
                  {selected.orders.map((order, index) => {
                    const meta = orderStatusMeta(order.status);
                    return (
                      <div
                        key={index}
                        className="flex items-center justify-between gap-3 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-sm"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-medium text-white/80">{order.serviceName}</p>
                          <div className="mt-0.5 flex items-center gap-1.5">
                            <span className={cn("h-1.5 w-1.5 rounded-full", meta.dotClass)} aria-hidden="true" />
                            <span className="text-xs text-white/45">{meta.label}</span>
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          {order.finalPriceUsd != null ? (
                            <p className="text-sm font-semibold text-white">
                              ${order.finalPriceUsd.toLocaleString("en-US")}
                            </p>
                          ) : null}
                          <p className="text-xs text-white/35">{formatRelativeTime(order.createdAt)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="mt-2 text-sm text-white/40">No orders yet.</p>
              )}
            </div>
          </div>
        ) : null}
      </Modal>
    </>
  );
}
