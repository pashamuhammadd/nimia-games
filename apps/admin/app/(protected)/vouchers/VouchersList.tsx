"use client";

import * as React from "react";
import { Power, Ticket } from "lucide-react";
import { cn } from "@nimia/ui";
import { formatRelativeTime } from "../../lib/relativeTime";
import { setVoucherActiveAction } from "./actions";

export type VoucherRow = {
  id: string;
  code: string;
  discount_percent: number;
  source: "admin" | "quest_reward" | "public_promo";
  client_id: string | null;
  max_redemptions: number;
  redemptions_count: number;
  expires_at: string | null;
  is_active: boolean;
  note: string | null;
  created_at: string;
  clients: { company_name: string | null } | null;
};

const SOURCE_LABELS: Record<VoucherRow["source"], string> = {
  admin: "Admin",
  quest_reward: "Quest Reward",
  public_promo: "Public Promo",
};

function statusFor(voucher: VoucherRow) {
  if (!voucher.is_active) return { label: "Inactive", className: "text-white/40" };
  if (voucher.redemptions_count >= voucher.max_redemptions) {
    return { label: "Used up", className: "text-white/40" };
  }
  if (voucher.expires_at && new Date(voucher.expires_at) < new Date()) {
    return { label: "Expired", className: "text-amber-300" };
  }
  return { label: "Active", className: "text-emerald-300" };
}

export function VouchersList({ vouchers }: { vouchers: VoucherRow[] }) {
  const [pendingId, setPendingId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  async function handleToggle(voucher: VoucherRow) {
    setPendingId(voucher.id);
    setError(null);
    const result = await setVoucherActiveAction(voucher.id, !voucher.is_active);
    setPendingId(null);
    if (!result.success) setError(result.error);
  }

  if (vouchers.length === 0) {
    return (
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] px-6 py-16 text-center text-sm text-white/40">
        No vouchers yet.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
      {vouchers.map((voucher) => {
        const status = statusFor(voucher);
        const isPending = pendingId === voucher.id;
        return (
          <div
            key={voucher.id}
            className="flex flex-col gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex min-w-0 items-center gap-3">
              <Ticket className="h-4 w-4 shrink-0 text-white/40" aria-hidden="true" />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <code className="text-sm font-semibold text-white">{voucher.code}</code>
                  <span className={cn("text-xs font-medium", status.className)}>{status.label}</span>
                </div>
                <p className="mt-0.5 truncate text-xs text-white/45">
                  {voucher.discount_percent}% off · {SOURCE_LABELS[voucher.source]} ·{" "}
                  {voucher.clients?.company_name ?? "Public / anyone"} · {voucher.redemptions_count}/
                  {voucher.max_redemptions} used · Created {formatRelativeTime(voucher.created_at)}
                </p>
              </div>
            </div>

            <button
              type="button"
              disabled={isPending}
              onClick={() => handleToggle(voucher)}
              className="flex shrink-0 items-center gap-1.5 self-start rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-white/70 transition-colors hover:bg-white/[0.06] hover:text-white disabled:opacity-50 sm:self-center"
            >
              <Power className="h-3.5 w-3.5" aria-hidden="true" />
              {voucher.is_active ? "Deactivate" : "Activate"}
            </button>
          </div>
        );
      })}
    </div>
  );
}
