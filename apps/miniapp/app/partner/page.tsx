import { cookies } from "next/headers";
import { createServerClient } from "@nimia/db";
import { TelegramLinkGate } from "../components/TelegramLinkGate";
import { CopyLinkButton } from "../components/CopyLinkButton";
import { orderStatusMeta } from "../lib/statusLabels";
import { dashboardPartnersUrl, referralLink } from "../lib/links";

interface PartnerRow {
  id: string;
  referral_code: string;
  is_founding_partner: boolean;
}

interface PartnerMetrics {
  referral_count: number;
  paid_clients_count: number;
  pending_reward_usd: number;
  available_reward_usd: number;
  lifetime_reward_usd: number;
}

interface ReferralActivityRow {
  referral_id: string;
  referred_name: string | null;
  order_status: string | null;
  reward_usd: number;
  created_at: string;
}

// Phase 2 (docs/TELEGRAM.md's roadmap, 20 Agustus 2026): real numbers, but
// deliberately sourced from the SAME server-side RPCs the full Partner
// Dashboard uses (get_partner_metrics / get_partner_referral_activity /
// partner_commission_rate, packages/db/migrations/0016_partner_program.sql)
// rather than re-deriving referral counts or commission math in TypeScript
// here - this is exactly the "commission logic duplicated 3+ places" trap
// apps/miniapp/README.md warned about, avoided by calling the one
// SECURITY DEFINER function that already computes it, the same source of
// truth apps/app/app/dashboard/partners/page.tsx (via @/modules/partners)
// ultimately reads from too. The one thing intentionally NOT shown here is
// the Bronze/Silver/Gold/Platinum level NAME - that ladder's labels live
// only in apps/studio/modules/partners/constants/partner-level.ts (a
// private app module, not importable from here); showing the commission
// rate number instead (which IS available live via
// partner_commission_rate()) avoids hand-copying that label ladder a
// second time and risking it going stale.
export default async function PartnerPage() {
  const supabase = createServerClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return <TelegramLinkGate />;

  // Plain call, cast with `as` after the await - see
  // app/services/page.tsx's own comment on why a generic-typed call
  // (`.maybeSingle<T>()`/`.returns<T>()`) breaks under this project's
  // still-placeholder Database type.
  const { data: partnerData } = await supabase
    .from("partners")
    .select("id, referral_code, is_founding_partner")
    .eq("user_id", user.id)
    .maybeSingle();
  const partner = partnerData as PartnerRow | null;

  if (!partner) {
    return (
      <div className="page">
        <h1 className="greeting">🤝 Partner Program</h1>
        <div className="card">
          <p className="empty-state" style={{ padding: 0 }}>
            We couldn't load your partner profile. Open the full Partner Dashboard on the website to set it up.
          </p>
        </div>
        <a className="cta-button" href={dashboardPartnersUrl()} target="_blank" rel="noreferrer">
          Open Partner Dashboard
        </a>
      </div>
    );
  }

  const [{ data: metricsData }, { data: activityData }] = await Promise.all([
    supabase.rpc("get_partner_metrics", { p_partner_id: partner.id }),
    supabase.rpc("get_partner_referral_activity", { p_partner_id: partner.id }),
  ]);
  const metricsRows = metricsData as PartnerMetrics[] | null;
  const activity = activityData as ReferralActivityRow[] | null;

  const metrics = metricsRows?.[0];
  // partner_commission_rate needs the REAL paid_clients_count, which only
  // comes back from get_partner_metrics above - so this call happens
  // AFTER that one resolves, not in the same Promise.all (this function
  // is `immutable` SQL with no I/O of its own, so the extra round trip
  // only costs a little latency, never a wrong answer from a stale
  // placeholder count).
  const { data: rate } = metrics
    ? await supabase.rpc("partner_commission_rate", {
        p_paid_clients_count: metrics.paid_clients_count,
        p_is_founding_partner: partner.is_founding_partner,
      })
    : { data: null };

  const link = referralLink(partner.referral_code);
  const commissionPct = rate != null ? Math.round(Number(rate) * 100) : null;
  const shareText = "I'm connected with Nimia Studio, a creative & development partner for Web3 projects. Check them out:";
  const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(shareText)}`;

  return (
    <div className="page">
      <h1 className="greeting">🤝 Partner Program</h1>
      <p className="subtitle">
        Introduce Nimia Studio to projects that need us, and earn a commission when they become a client.
      </p>

      <div className="card">
        <div className="reward-highlight">
          <div>
            <p className="section-title" style={{ margin: 0 }}>
              Available balance
            </p>
            <p className="amount" style={{ margin: "4px 0 0" }}>
              ${formatAmount(metrics?.available_reward_usd ?? 0)}
              <span className="muted-unit">USD</span>
            </p>
          </div>
          {partner.is_founding_partner && <span className="status-badge">🌟 Founding Partner</span>}
        </div>

        <div className="stat-grid" style={{ marginTop: 16 }}>
          <div className="stat-card">
            <p className="value">${formatAmount(metrics?.pending_reward_usd ?? 0)}</p>
            <p className="label">Pending</p>
          </div>
          <div className="stat-card">
            <p className="value">${formatAmount(metrics?.lifetime_reward_usd ?? 0)}</p>
            <p className="label">Lifetime earned</p>
          </div>
          <div className="stat-card">
            <p className="value">{metrics?.referral_count ?? 0}</p>
            <p className="label">People referred</p>
          </div>
          <div className="stat-card">
            <p className="value">{commissionPct != null ? `${commissionPct}%` : "..."}</p>
            <p className="label">Commission rate</p>
          </div>
        </div>
      </div>

      <div className="card">
        <p className="section-title" style={{ marginTop: 0 }}>
          Your referral link
        </p>
        <div className="copy-row">
          <code>{link}</code>
          <CopyLinkButton value={link} />
        </div>
        <a
          className="link-row"
          href={shareUrl}
          target="_blank"
          rel="noreferrer"
          style={{ marginTop: 8, justifyContent: "flex-start", gap: 6 }}
        >
          <span>📤 Share on Telegram</span>
        </a>
      </div>

      <div className="card">
        <p className="section-title" style={{ marginTop: 0 }}>
          Recent referral activity
        </p>
        {!activity?.length ? (
          <p className="empty-state" style={{ padding: "16px 0" }}>
            No referrals yet. Share your link above to get started.
          </p>
        ) : (
          activity.slice(0, 5).map((row, index) => {
            const meta = row.order_status ? orderStatusMeta(row.order_status) : null;
            return (
              <div
                key={row.referral_id}
                className="list-row"
                style={index === 0 ? { borderTop: "none", paddingTop: 4 } : undefined}
              >
                <div className="list-row-header">
                  <p className="list-row-title">{row.referred_name ?? "Nimia client"}</p>
                  {meta ? (
                    <span className="status-badge">
                      <span className="dot" style={{ background: meta.color }} />
                      {meta.label}
                    </span>
                  ) : (
                    <span className="status-badge">Signed up</span>
                  )}
                </div>
                <p className="list-row-meta">
                  {row.reward_usd > 0 ? `$${formatAmount(row.reward_usd)} earned so far` : "No order yet"}
                </p>
              </div>
            );
          })
        )}
      </div>

      <a className="link-row" href={dashboardPartnersUrl()} target="_blank" rel="noreferrer">
        <span>Full Partner Dashboard (withdraw, referral kit)</span>
        <span className="arrow">↗</span>
      </a>
    </div>
  );
}

function formatAmount(value: number): string {
  return Number(value).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
