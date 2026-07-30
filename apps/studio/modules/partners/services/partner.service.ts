import { partnerRepository } from "../repository/partner.repository";
import { resolvePartnerLevel, resolveCommissionRate, calculateLevelProgress, type LevelProgress } from "../utils/level-calculator";
import type { Partner, PartnerStatsSummary, FoundingPartnerProgramStatus } from "../types/partner";
import type { Referral } from "../types/referral";
import type { RewardSummary } from "../types/reward";

/**
 * Everything the Partners dashboard page needs, pre-assembled. This is the
 * ONLY layer `app/dashboard/partners/page.tsx` (or any future consumer)
 * should call — it never talks to `partnerRepository` directly, and it
 * never needs to know the repository is mock data today vs. a real
 * `partners` table tomorrow.
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
 * Async even though nothing below currently awaits anything — this is the
 * shape every call site should already assume (`page.tsx` calling it with
 * `await`), so switching the repository to real Supabase queries later
 * doesn't change this function's signature or any caller.
 */
export async function getPartnerOverview(userId: string): Promise<PartnerOverview> {
  const rawPartner = partnerRepository.findByUserId(userId);

  // The repository returns a partner shape with placeholder level/rate;
  // resolving the REAL level (and the Founding Partner override) is a
  // business rule that belongs here, not duplicated into every caller.
  const currentLevel = resolvePartnerLevel(rawPartner.paidClientsCount, rawPartner.isFoundingPartner);
  const commissionRate = resolveCommissionRate(currentLevel, rawPartner.isFoundingPartner);
  const partner: Partner = { ...rawPartner, currentLevel, commissionRate };

  const referrals = partnerRepository.findReferralsByPartnerId(partner.id);
  const levelProgress = calculateLevelProgress(partner.paidClientsCount, partner.isFoundingPartner);
  const foundingProgram = partnerRepository.getFoundingProgramStatus();

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
