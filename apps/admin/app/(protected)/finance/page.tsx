import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Wallet, Receipt, Coins, TrendingUp, AlertTriangle } from "lucide-react";
import { createServerClient } from "@nimia/db";
import { isFounderRole } from "../../lib/roles";
import { formatIDR, formatUSD } from "../../lib/format";
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
  // varies across Supabase/PostgREST versions.
  const [{ data: invoices }, { data: commissions }, { data: wallets }, { data: recentCommissions }] =
    await Promise.all([
      supabase
        .from("invoices")
        .select("id, invoice_number, status, total, issue_date, created_at, clients(company_name)")
        .order("created_at", { ascending: false })
        .limit(500),
      supabase.from("commissions").select("id, amount_usd, status"),
      supabase
        .from("payment_wallets")
        .select("id, network, address, is_active, stablecoin_symbols, native_symbol, allow_native")
        .order("network"),
      supabase
        .from("commissions")
        .select("id, amount_usd, status, created_at, ambassadors(referral_code)")
        .order("created_at", { ascending: false })
        .limit(6),
    ]);

  const allInvoices = invoices ?? [];
  const totalRevenue = allInvoices
    .filter((i: any) => i.status === "paid")
    .reduce((sum: number, i: any) => sum + Number(i.total ?? 0), 0);
  const outstandingInvoices = allInvoices.filter((i: any) =>
    ["unpaid", "partially_paid", "overdue"].includes(i.status),
  );
  const outstandingTotal = outstandingInvoices.reduce((sum: number, i: any) => sum + Number(i.total ?? 0), 0);

  const allCommissions = commissions ?? [];
  const pendingCommissions = allCommissions.filter((c: any) => c.status === "pending");
  const paidCommissions = allCommissions.filter((c: any) => c.status === "paid");
  const pendingCommissionsTotal = pendingCommissions.reduce(
    (sum: number, c: any) => sum + Number(c.amount_usd ?? 0),
    0,
  );
  const paidCommissionsTotal = paidCommissions.reduce(
    (sum: number, c: any) => sum + Number(c.amount_usd ?? 0),
    0,
  );

  const recentInvoices = allInvoices.slice(0, 6);
  const placeholderWallets = (wallets ?? []).filter((w: any) => w.address?.includes("PLACEHOLDER"));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Finance</h1>
        <p className="mt-1 text-sm text-white/45">
          Founder-only — revenue, outstanding invoices, and ambassador commissions across the whole
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
              {placeholderWallets.map((w: any) => w.network).join(", ")} —{" "}
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
          value={formatIDR(totalRevenue)}
          caption={`${allInvoices.filter((i: any) => i.status === "paid").length} paid invoices`}
          tone="emerald"
        />
        <FinanceTile
          icon={Receipt}
          label="Outstanding Invoices"
          value={formatIDR(outstandingTotal)}
          caption={`${outstandingInvoices.length} unpaid / overdue`}
          tone="amber"
        />
        <FinanceTile
          icon={Coins}
          label="Pending Commissions"
          value={formatUSD(pendingCommissionsTotal)}
          caption={`${pendingCommissions.length} owed to ambassadors`}
          tone="purple"
        />
        <FinanceTile
          icon={Wallet}
          label="Paid Commissions"
          value={formatUSD(paidCommissionsTotal)}
          caption={`${paidCommissions.length} paid out`}
          tone="crimson"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 sm:p-6">
          <h2 className="mb-4 text-base font-semibold text-white">Recent Invoices</h2>
          {recentInvoices.length === 0 ? (
            <p className="py-6 text-center text-sm text-white/35">No invoices yet.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {recentInvoices.map((invoice: any) => (
                <div
                  key={invoice.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-white">
                      {invoice.clients?.company_name || "Client"}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-white/45">
                      {invoice.invoice_number} · {invoice.status}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-semibold text-white/80">
                    {formatIDR(invoice.total)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 sm:p-6">
          <h2 className="mb-4 text-base font-semibold text-white">Recent Commissions</h2>
          {(recentCommissions ?? []).length === 0 ? (
            <p className="py-6 text-center text-sm text-white/35">
              No ambassador commissions yet — these appear automatically once a referred order is
              marked paid.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {(recentCommissions ?? []).map((c: any) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-white">
                      {c.ambassadors?.referral_code ?? "Ambassador"}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-white/45">
                      {c.status} · {formatRelativeTime(c.created_at)}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-semibold text-white/80">
                    {formatUSD(c.amount_usd)}
                  </span>
                </div>
              ))}
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
                        title={chip.live ? "Native coin — converted at live USD rate" : "USD stablecoin — face value"}
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
