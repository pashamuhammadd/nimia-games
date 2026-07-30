import { cookies } from "next/headers";
import { createServerClient } from "@nimia/db";
import {
  PartnerBanner,
  FoundingPartnerBanner,
  PartnerStats,
  ReferralCodeCard,
  ReferralLinkCard,
  PartnerLevelCard,
  PartnerProgress,
  ReferralActivityTable,
  RewardsCard,
  ReferralKit,
  getPartnerOverview,
} from "@/modules/partners";

export const metadata = { title: "Partners" };

// Server Component — per the brief's architecture rules, this page ONLY
// imports from "@/modules/partners" (the module's root barrel) and never
// reaches into modules/partners/services or /repository directly, and it
// carries no business logic of its own beyond wiring auth -> service call
// -> components.
export default async function PartnersPage() {
  const supabase = createServerClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Defense in depth, same as app/dashboard/layout.tsx — middleware.ts
  // already keeps signed-out visitors out of /dashboard/*.
  const overview = await getPartnerOverview(supabase, user!.id);

  return (
    <div className="flex flex-col gap-6">
      <PartnerBanner
        referralCode={overview.partner.referralCode}
        referralLink={overview.partner.referralLink}
      />

      <FoundingPartnerBanner
        claimed={overview.foundingProgram.claimed}
        quota={overview.foundingProgram.quota}
        isOpen={overview.foundingProgram.isOpen}
      />

      <PartnerStats stats={overview.stats} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ReferralCodeCard referralCode={overview.partner.referralCode} />
        <ReferralLinkCard referralLink={overview.partner.referralLink} />
      </div>

      <PartnerLevelCard currentLevel={overview.partner.currentLevel} />

      <PartnerProgress progress={overview.levelProgress} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ReferralActivityTable referrals={overview.referrals} />
        </div>
        <RewardsCard rewards={overview.rewardSummary} />
      </div>

      <ReferralKit />
    </div>
  );
}
