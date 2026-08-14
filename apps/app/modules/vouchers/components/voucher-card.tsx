"use client";

import * as React from "react";
import { Check, Copy, Gift, Megaphone, Ticket } from "lucide-react";
import { cn } from "@nimia/ui";
import type { ClientVoucher } from "../types/voucher";

const SOURCE_META: Record<ClientVoucher["source"], { label: string; icon: typeof Ticket }> = {
  admin: { label: "From Nimia Studio", icon: Ticket },
  quest_reward: { label: "Quest Reward", icon: Gift },
  public_promo: { label: "Promo Code", icon: Megaphone },
};

function voucherStatus(voucher: ClientVoucher): { label: string; className: string } {
  if (!voucher.isActive) {
    return { label: "Inactive", className: "border-white/10 bg-white/[0.04] text-white/40" };
  }
  if (voucher.redemptionsCount >= voucher.maxRedemptions) {
    return { label: "Used", className: "border-white/10 bg-white/[0.04] text-white/40" };
  }
  if (voucher.expiresAt && new Date(voucher.expiresAt) < new Date()) {
    return { label: "Expired", className: "border-amber-400/30 bg-amber-400/10 text-amber-300" };
  }
  return { label: "Ready to use", className: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300" };
}

// One voucher, rendered as a small "wallet card" — matches the visual
// language of PartnerProgress/StatCard (rounded-2xl, translucent white
// surface) rather than a plain table row, since a client only ever has a
// handful of these at once.
export function VoucherCard({ voucher }: { voucher: ClientVoucher }) {
  const [copied, setCopied] = React.useState(false);
  const meta = SOURCE_META[voucher.source];
  const Icon = meta.icon;
  const status = voucherStatus(voucher);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(voucher.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API can be unavailable — the code is still visible,
      // selectable text, so this just silently no-ops (same pattern as
      // PaymentPanel.tsx's CopyableAddress).
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-medium text-white/50">
          <Icon className="h-3.5 w-3.5" aria-hidden="true" />
          {meta.label}
        </div>
        <span className={cn("rounded-full border px-2.5 py-1 text-[11px] font-semibold", status.className)}>
          {status.label}
        </span>
      </div>

      <div>
        <p className="text-2xl font-bold text-white">{voucher.discountPercent}% off</p>
        {voucher.note ? <p className="mt-0.5 text-xs text-white/45">{voucher.note}</p> : null}
      </div>

      <button
        type="button"
        onClick={handleCopy}
        className="flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2.5 text-left transition-colors hover:bg-white/[0.08]"
      >
        <code className="text-sm font-semibold tracking-wide text-white">{voucher.code}</code>
        {copied ? (
          <Check className="h-3.5 w-3.5 shrink-0 text-emerald-400" aria-hidden="true" />
        ) : (
          <Copy className="h-3.5 w-3.5 shrink-0 text-white/50" aria-hidden="true" />
        )}
      </button>

      {voucher.expiresAt ? (
        <p className="text-xs text-white/35">
          Expires{" "}
          {new Date(voucher.expiresAt).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
          })}
        </p>
      ) : null}
    </div>
  );
}
