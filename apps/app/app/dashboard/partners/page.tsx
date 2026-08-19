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

// Explicit safety net (added 19 Agustus 2026, after a user report that the
// Founding Partner banner "always shows 1/100"). getFoundingProgramStatus()
// (modules/partners/repository/partner.repository.ts) already runs a real
// `count(*) where is_founding_partner` query every render — it is NOT
// hardcoded — and every new signup already gets counted correctly by
// packages/db/migrations/0016 (extended by 0030/0032)'s
// handle_new_auth_user() trigger, up to the 100-account quota, after which
// resolvePartnerLevel() (modules/partners/utils/level-calculator.ts)
// already starts new partners at Bronze, not Gold. This page reading
// cookies() already opts it into dynamic (uncached) rendering by default,
// so no code change was actually needed for the number to update — this
// just makes that explicit so it can never silently regress if caching
// behavior changes in a future Next.js upgrade. If the number still looks
// stuck after this: confirm migration 0016/0030/0032 have actually been
// run against the production Supabase project (this repo's migrations are
// applied by hand, not automatically — see packages/db/migrations/README.md)
// and that the "new partner" you're testing with is a genuinely new
// account (not the same one reloaded).
export const dynamic = "force-dynamic";

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
        <RewardsCard
          rewards={overview.rewardSummary}
          hasOpenWithdrawalRequest={overview.partner.openWithdrawalRequest !== null}
        />
      </div>

      <ReferralKit />
    </div>
  );
}
