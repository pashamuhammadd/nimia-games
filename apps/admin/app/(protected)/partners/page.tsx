import { cookies } from "next/headers";
import { createServerClient } from "@nimia/db";
import { PartnersAdminList, type PartnerDirectoryRow } from "./PartnersAdminList";

export const metadata = { title: "Partners" };

// Admin directory for the Nimia Partner Program (added 10 Agustus 2026 —
// the client-facing side, apps/studio/app/dashboard/partners, has been
// live since 30 Juli 2026, but staff never had any way to see who the
// partners are). get_all_partners_admin() (packages/db/migrations/0028_partner_admin_directory.sql)
// does all the referral-count/reward aggregation server-side in one round
// trip (rather than N+1 calls to get_partner_metrics() per partner) and
// already filters out staff/admin/founder accounts, which also get an
// auto-provisioned partners row per 0016's trigger but aren't meaningfully
// "partners" for this directory's purpose.
export default async function PartnersAdminPage() {
  const supabase = createServerClient(await cookies());

  const { data: partners } = await supabase.rpc("get_all_partners_admin");
  const rows = (partners as any as PartnerDirectoryRow[]) ?? [];

  const totalPending = rows.reduce((sum, partner) => sum + Number(partner.pending_reward_usd), 0);
  const totalAvailable = rows.reduce((sum, partner) => sum + Number(partner.available_reward_usd), 0);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Partners</h1>
        <p className="mt-1 text-sm text-white/45">
          {rows.length} partner{rows.length === 1 ? "" : "s"} · $
          {totalPending.toLocaleString("en-US", { minimumFractionDigits: 2 })} pending reward · $
          {totalAvailable.toLocaleString("en-US", { minimumFractionDigits: 2 })} available reward. There's no
          payout/withdraw system yet (by design, see 0016's own comment) — this page is view-only.
        </p>
      </div>

      <PartnersAdminList partners={rows} />
    </div>
  );
}
