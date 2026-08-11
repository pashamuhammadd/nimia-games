import { cookies } from "next/headers";
import { createServerClient } from "@nimia/db";
import { PartnersAdminList, type PartnerDirectoryRow } from "./PartnersAdminList";
import { PartnerWithdrawalRequests, type WithdrawalRequestRow } from "./PartnerWithdrawalRequests";
import { isFounderRole } from "../../lib/roles";

export const metadata = { title: "Partners" };

function partnerLabel(partner: PartnerDirectoryRow) {
  return partner.company_name || partner.full_name || "Unnamed partner";
}

// Admin directory for the Nimia Partner Program (added 10 Agustus 2026 —
// the client-facing side, apps/studio/app/dashboard/partners, has been
// live since 30 Juli 2026, but staff never had any way to see who the
// partners are). get_all_partners_admin() (packages/db/migrations/0028_partner_admin_directory.sql)
// does all the referral-count/reward aggregation server-side in one round
// trip (rather than N+1 calls to get_partner_metrics() per partner) and
// already filters out staff/admin/founder accounts, which also get an
// auto-provisioned partners row per 0016's trigger but aren't meaningfully
// "partners" for this directory's purpose.
//
// Withdrawal requests (11 Agustus 2026, migration
// packages/db/migrations/0033_partner_reward_withdrawals.sql) — this page
// is no longer view-only. `partner_withdrawal_requests` has no admin RPC
// of its own (its RLS select policy is already is_admin()-gated, same as
// every table in this schema written by a trusted RPC — see 0033's own
// comment), so this is a plain `.from()` select; the partner's display
// name is joined in JS against the directory rows already fetched above
// (same "aggregate in JS, no new view/RPC" convention the Clients admin
// page's own comment already established) rather than a second round
// trip or a hand-rolled Postgres join.
export default async function PartnersAdminPage() {
  const supabase = createServerClient(await cookies());

  const [{ data: partners }, { data: withdrawalRows }, { data: authData }] = await Promise.all([
    supabase.rpc("get_all_partners_admin"),
    supabase
      .from("partner_withdrawal_requests")
      .select("id, partner_id, amount_usd, wallet_network, wallet_address, status, admin_note, requested_at, processed_at")
      .order("requested_at", { ascending: false }),
    supabase.auth.getUser(),
  ]);

  const rows = (partners as any as PartnerDirectoryRow[]) ?? [];
  const labelByPartnerId = new Map(rows.map((partner) => [partner.partner_id, partnerLabel(partner)]));

  const withdrawalRequests: WithdrawalRequestRow[] = (withdrawalRows ?? []).map((row: any) => ({
    id: row.id,
    partner_id: row.partner_id,
    partner_label: labelByPartnerId.get(row.partner_id) ?? "Unknown partner",
    amount_usd: Number(row.amount_usd),
    wallet_network: row.wallet_network,
    wallet_address: row.wallet_address,
    status: row.status,
    admin_note: row.admin_note,
    requested_at: row.requested_at,
    processed_at: row.processed_at,
  }));

  let isFounder = false;
  if (authData?.user) {
    const { data: profile } = await supabase.from("users").select("role").eq("id", authData.user.id).single();
    isFounder = isFounderRole(profile?.role);
  }

  const totalPending = rows.reduce((sum, partner) => sum + Number(partner.pending_reward_usd), 0);
  const totalAvailable = rows.reduce((sum, partner) => sum + Number(partner.available_reward_usd), 0);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Partners</h1>
        <p className="mt-1 text-sm text-white/45">
          {rows.length} partner{rows.length === 1 ? "" : "s"} · $
          {totalPending.toLocaleString("en-US", { minimumFractionDigits: 2 })} pending reward · $
          {totalAvailable.toLocaleString("en-US", { minimumFractionDigits: 2 })} available reward.
        </p>
      </div>

      <PartnerWithdrawalRequests requests={withdrawalRequests} isFounder={isFounder} />

      <PartnersAdminList partners={rows} />
    </div>
  );
}
