import type { SupabaseClient } from "@supabase/supabase-js";
import { partnerRepository } from "../repository/partner.repository";
import { resolvePartnerLevel, resolveCommissionRate, calculateLevelProgress, type LevelProgress } from "../utils/level-calculator";
import type { Partner, PartnerStatsSummary, FoundingPartnerProgramStatus } from "../types/partner";
import type { Referral } from "../types/referral";
import type { RewardSummary } from "../types/reward";

/**
 * Everything the Partners dashboard page needs, pre-assembled. This is the
 * ONLY layer `app/dashboard/partners/page.tsx` (or any future consumer)
 * should call — it never talks to `partnerRepository` directly.
 */
export interface PartnerOverview {
  partner: Partner;
  stats: PartnerStatsSummary;
  levelProgress: LevelProgress;
  referrals: Referral[];
  rewardSummary: RewardSummary;
  foundingProgram: FoundingPartnerProgramStatus;
}

/**
 * Takes the caller's already-authenticated Supabase client (from
 * `createServerClient(await cookies())`, same as every other
 * `app/dashboard/*` page) rather than creating its own — this module has
 * no opinion on auth/session handling, that stays entirely in app code.
 * (30 Juli 2026, migration 0016: this used to run against a mock
 * repository and only took `userId` — now real, so it needs a client to
 * query with.)
 */
export async function getPartnerOverview(
  supabase: SupabaseClient,
  userId: string,
): Promise<PartnerOverview> {
  const rawPartner = await partnerRepository.findByUserId(supabase, userId);

  // The repository returns a partner shape with placeholder level/rate;
  // resolving the REAL level (and the Founding Partner override) is a
  // business rule that belongs here, not duplicated into every caller.
  const currentLevel = resolvePartnerLevel(rawPartner.paidClientsCount, rawPartner.isFoundingPartner);
  const commissionRate = resolveCommissionRate(currentLevel, rawPartner.isFoundingPartner);
  const partner: Partner = { ...rawPartner, currentLevel, commissionRate };

  const referrals = await partnerRepository.findReferralsByPartnerId(supabase, partner.id);
  const levelProgress = calculateLevelProgress(partner.paidClientsCount, partner.isFoundingPartner);
  const foundingProgram = await partnerRepository.getFoundingProgramStatus(supabase);

  const stats: PartnerStatsSummary = {
    totalReferrals: partner.referralCount,
    paidClients: partner.paidClientsCount,
    pendingRewardUsd: partner.rewardBalance.pendingUsd,
    lifetimeRewardUsd: partner.rewardBalance.lifetimeUsd,
  };

  const rewardSummary: RewardSummary = {
    pendingUsd: partner.rewardBalance.pendingUsd,
    availableUsd: partner.rewardBalance.availableUsd,
    lifetimeUsd: partner.rewardBalance.lifetimeUsd,
  };

  return { partner, stats, levelProgress, referrals, rewardSummary, foundingProgram };
}
