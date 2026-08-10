"use client";

import * as React from "react";
import { Handshake, Crown, ChevronDown, ChevronUp } from "lucide-react";
import { Input } from "@nimia/ui";
import { formatRelativeTime } from "../../lib/relativeTime";
import { getPartnerReferralActivityAction, type PartnerReferralActivityRow } from "./actions";
import { resolvePartnerLevelDisplay } from "./partner-level";

export type PartnerDirectoryRow = {
  partner_id: string;
  user_id: string;
  full_name: string | null;
  company_name: string | null;
  referral_code: string;
  is_founding_partner: boolean;
  founding_partner_number: number | null;
  partner_created_at: string;
  referral_count: number;
  paid_clients_count: number;
  pending_reward_usd: number;
  available_reward_usd: number;
  lifetime_reward_usd: number;
};

function formatUsd(value: number) {
  return `$${Number(value).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
}

function partnerLabel(partner: PartnerDirectoryRow) {
  return partner.company_name || partner.full_name || "Unnamed partner";
}

export function PartnersAdminList({ partners }: { partners: PartnerDirectoryRow[] }) {
  const [query, setQuery] = React.useState("");

  const filtered = partners.filter((partner) => {
    const haystack = `${partner.full_name ?? ""} ${partner.company_name ?? ""} ${partner.referral_code}`.toLowerCase();
    return haystack.includes(query.trim().toLowerCase());
  });

  if (partners.length === 0) {
    return (
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] px-6 py-16 text-center text-sm text-white/40">
        No partners yet.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <Input
        type="search"
        placeholder="Search by name, company, or referral code..."
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        className="max-w-sm"
      />

      {filtered.length === 0 ? (
        <p className="px-1 text-sm text-white/40">No partner matches &quot;{query}&quot;.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((partner) => (
            <PartnerRow key={partner.partner_id} partner={partner} />
          ))}
        </div>
      )}
    </div>
  );
}

function PartnerRow({ partner }: { partner: PartnerDirectoryRow }) {
  const [expanded, setExpanded] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [referrals, setReferrals] = React.useState<PartnerReferralActivityRow[] | null>(null);
  const level = resolvePartnerLevelDisplay(partner.paid_clients_count, partner.is_founding_partner);

  async function handleToggle() {
    const next = !expanded;
    setExpanded(next);
    // Fetch once, lazily, on first expand — not every row's referral
    // history is needed just to render the directory list.
    if (next && referrals === null) {
      setLoading(true);
      setError(null);
      const result = await getPartnerReferralActivityAction(partner.partner_id);
      setLoading(false);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setReferrals(result.referrals);
    }
  }

  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02]">
      <button
        type="button"
        onClick={handleToggle}
        className="flex w-full flex-col gap-3 p-4 text-left sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex min-w-0 items-center gap-3">
          <Handshake className="h-4 w-4 shrink-0 text-white/40" aria-hidden="true" />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold text-white">{partnerLabel(partner)}</p>
              <span className="text-xs font-medium text-white/70">
                {level.emoji} {level.label}
              </span>
              {partner.is_founding_partner ? (
                <span className="flex items-center gap-1 rounded-full bg-amber-400/10 px-2 py-0.5 text-[11px] font-medium text-amber-300">
                  <Crown className="h-3 w-3" aria-hidden="true" />
                  Founding #{partner.founding_partner_number}
                </span>
              ) : null}
            </div>
            <p className="mt-0.5 truncate text-xs text-white/45">
              <code>{partner.referral_code}</code> · {partner.referral_count} referred ·{" "}
              {partner.paid_clients_count} paid clients · Joined {formatRelativeTime(partner.partner_created_at)}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-4 text-right">
          <div>
            <p className="text-xs text-white/40">Pending</p>
            <p className="text-sm font-semibold text-amber-300">{formatUsd(partner.pending_reward_usd)}</p>
          </div>
          <div>
            <p className="text-xs text-white/40">Available</p>
            <p className="text-sm font-semibold text-emerald-300">{formatUsd(partner.available_reward_usd)}</p>
          </div>
          <div>
            <p className="text-xs text-white/40">Lifetime</p>
            <p className="text-sm font-semibold text-white">{formatUsd(partner.lifetime_reward_usd)}</p>
          </div>
          {expanded ? (
            <ChevronUp className="h-4 w-4 shrink-0 text-white/40" aria-hidden="true" />
          ) : (
            <ChevronDown className="h-4 w-4 shrink-0 text-white/40" aria-hidden="true" />
          )}
        </div>
      </button>

      {expanded ? (
        <div className="border-t border-white/[0.06] px-4 py-3">
          {loading ? (
            <p className="text-xs text-white/40">Loading referral activity...</p>
          ) : error ? (
            <p className="text-xs text-red-400">{error}</p>
          ) : referrals && referrals.length > 0 ? (
            <div className="flex flex-col gap-2">
              {referrals.map((referral) => (
                <div key={referral.referral_id} className="flex items-center justify-between gap-3 text-xs">
                  <span className="min-w-0 flex-1 truncate text-white/70">{referral.referred_name ?? "Unnamed"}</span>
                  <span className="shrink-0 text-white/40">{referral.order_status ?? "No order yet"}</span>
                  <span className="shrink-0 text-white/70">{formatUsd(referral.reward_usd)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-white/40">No referrals yet.</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
