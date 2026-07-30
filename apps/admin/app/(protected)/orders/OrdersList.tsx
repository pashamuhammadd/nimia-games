"use client";

import * as React from "react";
import { Modal } from "@nimia/ui";
import { orderStatusMeta } from "../../lib/orderStatus";
import { formatRelativeTime } from "../../lib/relativeTime";
import { OrderDetailPanel } from "./OrderDetailPanel";

export type OrderListItem = {
  id: string;
  full_name: string;
  company_name: string | null;
  email: string;
  whatsapp: string | null;
  country: string | null;
  budget: string | null;
  deadline: string | null;
  description: string;
  reference_link: string | null;
  status: string;
  created_at: string;
  services: { name: string } | null;
  clients: { company_name: string | null } | null;
  order_files: { id: string; file_name: string; file_url: string }[];
};

// Deterministic per-client accent, same trick as
// apps/studio/app/components/dashboard/ActiveOrdersSection.tsx — picks from
// a fixed on-brand palette rather than hashing to arbitrary hues, so the
// same client always gets the same "avatar" color.
const THUMBNAIL_GRADIENTS = [
  "from-[var(--nimia-crimson)] to-[var(--nimia-pink)]",
  "from-purple-500 to-[var(--nimia-crimson)]",
  "from-sky-500 to-purple-500",
  "from-amber-500 to-[var(--nimia-crimson)]",
];

function thumbnailGradient(seed: string) {
  const hash = Array.from(seed).reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return THUMBNAIL_GRADIENTS[hash % THUMBNAIL_GRADIENTS.length];
}

function initialsFor(text: string) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  return (words[0]?.[0] ?? "?").toUpperCase() + (words[1]?.[0] ?? "").toUpperCase();
}

// Rendered as a card list rather than a literal <table> — matches the
// visual language every other dark-dashboard section already uses
// (StatCard, ActiveOrdersSection, PendingOrdersSection) and reads better on
// mobile than a table would. Holds the currently-open order in local state
// and renders its detail/action UI inside a shared Modal.
export function OrdersList({ orders }: { orders: OrderListItem[] }) {
  const [selected, setSelected] = React.useState<OrderListItem | null>(null);

  if (orders.length === 0) {
    return (
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] px-6 py-16 text-center text-sm text-white/40">
        No orders match this filter.
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-3">
        {orders.map((order) => {
          const clientLabel = order.clients?.company_name || order.company_name || order.full_name;
          const meta = orderStatusMeta(order.status);
          return (
            <button
              key={order.id}
              type="button"
              onClick={() => setSelected(order)}
              className="flex flex-col gap-4 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-left transition-colors hover:border-white/[0.12] sm:flex-row sm:items-center"
            >
              <div
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-sm font-bold text-white ${thumbnailGradient(clientLabel)}`}
                aria-hidden="true"
              >
                {initialsFor(clientLabel)}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3">
                  <p className="truncate text-sm font-semibold text-white">{clientLabel}</p>
                  <span className="shrink-0 text-xs text-white/35">
                    {formatRelativeTime(order.created_at)}
                  </span>
                </div>
                <p className="mt-0.5 truncate text-xs text-white/45">
                  {order.services?.name ?? "Custom Project"}
                  {order.budget ? ` · ${order.budget}` : ""}
                </p>
                <div className="mt-2 flex items-center gap-1.5">
                  <span className={`h-1.5 w-1.5 rounded-full ${meta.dotClass}`} aria-hidden="true" />
                  <span className="text-xs font-medium text-white/50">{meta.label}</span>
                </div>
              </div>

              <span className="shrink-0 self-start rounded-lg border border-white/10 px-3.5 py-2 text-center text-xs font-semibold text-white/80 sm:self-center">
                View
              </span>
            </button>
          );
        })}
      </div>

      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        ariaLabel="Order detail"
        className="max-w-lg"
      >
        {selected ? <OrderDetailPanel order={selected} onClose={() => setSelected(null)} /> : null}
      </Modal>
    </>
  );
}
