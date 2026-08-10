import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Wallet, Receipt, Coins, TrendingUp, AlertTriangle } from "lucide-react";
import { createServerClient } from "@nimia/db";
import { isFounderRole } from "../../lib/roles";
import { formatUSD } from "../../lib/format";
import { formatRelativeTime } from "../../lib/relativeTime";

export const metadata = { title: "Finance" };

type FinanceTileTone = "crimson" | "amber" | "purple" | "emerald";

const TONE_CLASSES: Record<FinanceTileTone, { badge: string; icon: string }> = {
  crimson: { badge: "bg-[var(--nimia-crimson)]/15", icon: "text-[var(--nimia-pink)]" },
  amber: { badge: "bg-amber-400/15", icon: "text-amber-400" },
  purple: { badge: "bg-purple-400/15", icon: "text-purple-400" },
  emerald: { badge: "bg-emerald-400/15", icon: "text-emerald-400" },
};

function FinanceTile({
  icon: Icon,
  label,
  value,
  caption,
  tone,
}: {
  icon: typeof Wallet;
  label: string;
  value: string;
  caption?: string;
  tone: FinanceTileTone;
}) {
  const colors = TONE_CLASSES[tone];
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5">
      <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${colors.badge}`}>
        <Icon className={`h-5 w-5 ${colors.icon}`} aria-hidden="true" />
      </span>
      <p className="mt-4 text-sm font-medium text-white/50">{label}</p>
      <p className="mt-1 text-2xl font-bold text-white">{value}</p>
      {caption ? <p className="mt-2 text-xs text-white/35">{caption}</p> : null}
    </div>
  );
}

// Rewritten 10 Agustus 2026 (launch-readiness audit fix — see
// [[studio_platform_plan]] memory, "Finance page admin rusak"). This page
// used to query `invoices`/`commissions`/`ambassadors`, three tables that
// no longer reflect reality:
//   - `invoices` has been dead code since migration 0024 (order-based
//     crypto payments replaced the old manual/IDR invoice flow it
//     belonged to — see that migration's own comment). The exact same
//     class of bug was already found and fixed on the Overview page's
//     "Unpaid Invoices" stat; this page just never got the same fix.
//   - `commissions` and `ambassadors` were RENAMED to
//     `commissions_legacy`/`ambassadors_legacy` by migration 0016
//     (30 Juli 2026) when the old Ambassador Program was merged into the
//     Partner Program — those table names haven't existed since that date.
// Because the old queries' Postgres errors were never checked (destructured
// straight into `?? []`), this page silently rendered $0/empty everywhere
// instead of failing loudly — a founder reading this page had no way to
// tell the numbers were wrong.
//
// Now reads real revenue from `orders.final_price_usd` (same source the
// Invoices admin page already uses) and real reward data from
// `partner_rewards` (same source the Partners admin directory, migration
// 0028, already uses) — no new tables, just pointed at the ones the rest
// of the app actually writes to. Revenue is USD-only now (per
// docs/ARCHITECTURE.md: "Harga selalu dalam USD") — the old two-currency
// IDR/USD split belonged to the dead `invoices` flow, so `formatIDR` is no
// longer used here.
export default async function FinancePage() {
  const supabase = createServerClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user!.id)
    .single();

  // Hard gate, independent of the sidebar hiding the link — a founder-only
  // page per docs/ARCHITECTURE.md ("staff ... TIDAK bisa lihat halaman
  // keuangan"), so a staff account typing /finance directly must bounce.
  if (!isFounderRole(profile?.role)) {
    redirect("/");
  }

  // Aggregates are summed in JS rather than via a Postgres aggregate
  // query — this business is early-stage (low row counts), and summing
  // client-side here sidesteps PostgREST aggregate-function syntax that
  // varies across Supabase/PostgREST versions. Same convention as the
  // Invoices admin page and the original version of this page.
  const [{ data: paidOrders }, { data: awaitingOrders }, { data: rewards }, { data: wallets }] =
    await Promise.all([
      supabase
        .from("orders")
        .select(
          "id, full_name, company_name, final_price_usd, payment_verified_at, services(name), clients(company_name)",
        )
        .eq("status", "paid")
        .order("payment_verified_at", { ascending: false }),
      supabase
        .from("orders")
        .select("id, final_price_usd")
        .in("status", ["awaiting_payment", "payment_submitted"]),
      supabase
        .from("partner_rewards")
        .select("id, amount_usd, status, created_at, partners(referral_code)")
        .order("created_at", { ascending: false }),
      supabase
        .from("payment_wallets")
        .select("id, network, address, is_active, stablecoin_symbols, native_symbol, allow_native")
        .order("network"),
    ]);

  const allPaidOrders = paidOrders ?? [];
  const totalRevenue = allPaidOrders.reduce(
    (sum: number, o: any) => sum + Number(o.final_price_usd ?? 0),
    0,
  );
  const now = new Date();
  const thisMonthRevenue = allPaidOrders
    .filter((o: any) => {
      if (!o.payment_verified_at) return false;
      const verified = new Date(o.payment_verified_at);
      return verified.getMonth() === now.getMonth() && verified.getFullYear() === now.getFullYear();
    })
    .reduce((sum: number, o: any) => sum + Number(o.final_price_usd ?? 0), 0);

  const allAwaitingOrders = awaitingOrders ?? [];
  const awaitingTotal = allAwaitingOrders.reduce(
    (sum: number, o: any) => sum + Number(o.final_price_usd ?? 0),
    0,
  );

  const allRewards = rewards ?? [];
  const pendingRewards = allRewards.filter((r: any) => r.status === "pending");
  const availableRewards = allRewards.filter((r: any) => r.status === "available");
  const pendingRewardsTotal = pendingRewards.reduce(
    (sum: number, r: any) => sum + Number(r.amount_usd ?? 0),
    0,
  );
  const availableRewardsTotal = availableRewards.reduce(
    (sum: number, r: any) => sum + Number(r.amount_usd ?? 0),
    0,
  );

  const recentPaidOrders = allPaidOrders.slice(0, 6);
  const recentRewards = allRewards.slice(0, 6);
  const placeholderWallets = (wallets ?? []).filter((w: any) => w.address?.includes("PLACEHOLDER"));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Finance</h1>
        <p className="mt-1 text-sm text-white/45">
          Founder-only: revenue, payments awaiting confirmation, and partner rewards across the whole
          studio.
        </p>
      </div>

      {placeholderWallets.length > 0 ? (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" aria-hidden="true" />
          <div className="text-sm text-amber-100">
            <p className="font-semibold">
              {placeholderWallets.length} payment wallet{placeholderWallets.length === 1 ? "" : "s"} still
              using a placeholder address.
            </p>
            <p className="mt-1 text-amber-100/70">
              {placeholderWallets.map((w: any) => w.network).join(", ")}:{" "}
              {placeholderWallets.length === 1 ? "it needs" : "they need"} your real company wallet
              address before any buyer can actually pay. Update it directly in the{" "}
              <code className="rounded bg-black/20 px-1 py-0.5">payment_wallets</code> table via SQL
              editor.
            </p>
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <FinanceTile
          icon={TrendingUp}
          label="Total Revenue"
          value={formatUSD(totalRevenue)}
          caption={`${allPaidOrders.length} paid order${allPaidOrders.length === 1 ? "" : "s"} · ${formatUSD(thisMonthRevenue)} this month`}
          tone="emerald"
        />
        <FinanceTile
          icon={Receipt}
          label="Awaiting Payment"
          value={formatUSD(awaitingTotal)}
          caption={`${allAwaitingOrders.length} order${allAwaitingOrders.length === 1 ? "" : "s"} in progress`}
          tone="amber"
        />
        <FinanceTile
          icon={Coins}
          label="Pending Partner Rewards"
          value={formatUSD(pendingRewardsTotal)}
          caption={`${pendingRewards.length} reward${pendingRewards.length === 1 ? "" : "s"} owed to partners`}
          tone="purple"
        />
        <FinanceTile
          icon={Wallet}
          label="Available Partner Rewards"
          value={formatUSD(availableRewardsTotal)}
          caption={`${availableRewards.length} reward${availableRewards.length === 1 ? "" : "s"} available`}
          tone="crimson"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-white">Recent Paid Orders</h2>
            <Link href="/invoices" className="text-xs font-medium text-[var(--nimia-pink)] hover:underline">
              View all
            </Link>
          </div>
          {recentPaidOrders.length === 0 ? (
            <p className="py-6 text-center text-sm text-white/35">No paid orders yet.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {recentPaidOrders.map((order: any) => {
                const client = Array.isArray(order.clients) ? order.clients[0] : order.clients;
                const service = Array.isArray(order.services) ? order.services[0] : order.services;
                return (
                  <div
                    key={order.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-white">
                        {client?.company_name || order.company_name || order.full_name}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-white/45">
                        {service?.name ?? "Custom Project"} ·{" "}
                        {order.payment_verified_at ? formatRelativeTime(order.payment_verified_at) : "—"}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-semibold text-white/80">
                      {formatUSD(order.final_price_usd)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-white">Recent Partner Rewards</h2>
            <Link href="/partners" className="text-xs font-medium text-[var(--nimia-pink)] hover:underline">
              View all
            </Link>
          </div>
          {recentRewards.length === 0 ? (
            <p className="py-6 text-center text-sm text-white/35">
              No partner rewards yet. These appear automatically once a referred client&apos;s order is
              marked paid.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {recentRewards.map((reward: any) => {
                const partner = Array.isArray(reward.partners) ? reward.partners[0] : reward.partners;
                return (
                  <div
                    key={reward.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-white">
                        {partner?.referral_code ?? "Partner"}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-white/45">
                        {reward.status === "available" ? "Available" : "Pending"} ·{" "}
                        {formatRelativeTime(reward.created_at)}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-semibold text-white/80">
                      {formatUSD(reward.amount_usd)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      <section className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 sm:p-6">
        <h2 className="mb-4 text-base font-semibold text-white">Payment Wallets</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {(wallets ?? []).map((w: any) => {
            // Accepted currencies: stablecoins at face value, plus the
            // chain's native coin — but native is flagged "live rate" so
            // nobody reading this card mistakes it for a 1:1 USD value.
            const acceptedChips: { label: string; live: boolean }[] = [
              ...((w.stablecoin_symbols ?? []) as string[]).map((s) => ({ label: s, live: false })),
              ...(w.allow_native && w.native_symbol ? [{ label: w.native_symbol, live: true }] : []),
            ];
            return (
              <div key={w.id} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3.5">
                <p className="text-xs font-semibold uppercase tracking-wider text-white/40">{w.network}</p>
                <p className="mt-1 truncate font-mono text-xs text-white/70">{w.address}</p>
                {acceptedChips.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {acceptedChips.map((chip) => (
                      <span
                        key={chip.label}
                        className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                          chip.live
                            ? "bg-purple-400/15 text-purple-300"
                            : "bg-white/[0.06] text-white/55"
                        }`}
                        title={chip.live ? "Native coin, converted at live USD rate" : "USD stablecoin, face value"}
                      >
                        {chip.label}
                        {chip.live ? " · live rate" : ""}
                      </span>
                    ))}
                  </div>
                ) : null}
                <span
                  className={`mt-2 inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${
                    w.is_active ? "bg-emerald-400/15 text-emerald-400" : "bg-white/10 text-white/40"
                  }`}
                >
                  {w.is_active ? "Active" : "Inactive"}
                </span>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
