import { REFERRAL_CODE_CHARSET, REFERRAL_CODE_LENGTH } from "../utils/generate-referral-code";
import { FOUNDING_PARTNER_QUOTA } from "../constants/founding-partner";
import type { Partner, FoundingPartnerProgramStatus } from "../types/partner";
import type { Referral, ReferralStatus } from "../types/referral";

// ------------------------------------------------------------------
// Mock data-access layer.
//
// This is the ONLY file in the module that should ever know its data is
// fake. Every method signature below is written the way a real repository
// backed by @nimia/db would look (findByUserId, findReferralsByPartnerId,
// getFoundingProgramStatus) so that swapping the method BODIES for real
// Supabase queries later is a one-file change — services/partner.service.ts
// and everything above it never needs to know the difference.
//
// Values are derived deterministically from a seed (hash of userId/partnerId)
// rather than Math.random() so the same signed-in user sees the same
// numbers on every request/reload instead of jittering — a real table read
// would behave the same way (stable until the underlying row changes).
// ------------------------------------------------------------------

function hashSeed(input: string): number {
  let hash = 0;
  for (const ch of input) {
    hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  }
  return hash || 1;
}

function seededInt(seed: number, min: number, max: number): number {
  const span = max - min + 1;
  return min + (Math.abs(seed) % span);
}

/**
 * Deterministic stand-in for utils/generate-referral-code.ts's
 * `generateReferralCode()`. That function is the REAL generator (uses
 * crypto randomness) meant to be called exactly once, at account creation,
 * with the result persisted forever — it's intentionally not used here,
 * since calling it per-request would make the mock partner's code change
 * on every page reload.
 */
function seededReferralCode(seed: number): string {
  const charset = REFERRAL_CODE_CHARSET;
  let value = Math.abs(seed);
  let code = "";
  for (let i = 0; i < REFERRAL_CODE_LENGTH; i += 1) {
    code += charset[value % charset.length];
    value = Math.floor(value / charset.length) + (i + 1) * 7919; // prime mix-in avoids short repeat cycles
  }
  return code;
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://studio.nimiagames.com";

function referralLinkFor(code: string): string {
  return `${SITE_URL}/r/${code}`;
}

const MOCK_REFERRED_NAMES = [
  "Alex Wijaya",
  "Bianca Putri",
  "Chandra Kusuma",
  "Dewi Lestari",
  "Farhan Hidayat",
  "Grace Tanuwijaya",
  "Hendra Saputra",
  "Indah Permata",
  "Joko Prasetyo",
  "Kevin Halim",
  "Laras Ayu",
  "Made Surya",
];

const REFERRAL_STATUS_CYCLE: ReferralStatus[] = [
  "registered",
  "waiting_first_order",
  "waiting_payment",
  "reward_released",
];

export interface PartnerRepository {
  findByUserId(userId: string): Partner;
  findReferralsByPartnerId(partnerId: string): Referral[];
  getFoundingProgramStatus(): FoundingPartnerProgramStatus;
}

export const partnerRepository: PartnerRepository = {
  // Real impl (Tahap 5+): `select * from partners where user_id = :userId`,
  // auto-creating a row with a freshly generateReferralCode()'d code the
  // first time a user has none.
  findByUserId(userId: string): Partner {
    const seed = hashSeed(userId);
    const code = seededReferralCode(seed);
    const referralCount = seededInt(seed, 4, 22);
    const paidClientsCount = Math.min(referralCount, seededInt(seed >> 3, 1, 9));
    const isFoundingPartner = seed % 5 === 0; // ~1 in 5 mock accounts, purely for demo variety
    const foundingPartnerNumber = isFoundingPartner ? seededInt(seed >> 5, 1, 72) : undefined;

    return {
      id: `partner_${seed}`,
      userId,
      referralCode: code,
      referralLink: referralLinkFor(code),
      referralCount,
      paidClientsCount,
      // Placeholder — services/partner.service.ts resolves the real level
      // (and overrides commissionRate) via utils/level-calculator so this
      // repository doesn't need to duplicate that business rule.
      currentLevel: "bronze",
      commissionRate: 0.05,
      isFoundingPartner,
      foundingPartnerNumber,
      rewardBalance: {
        pendingUsd: seededInt(seed >> 2, 0, 4) * 25,
        availableUsd: seededInt(seed >> 4, 0, 6) * 40,
        lifetimeUsd: seededInt(seed >> 1, 3, 20) * 55,
      },
      createdAt: new Date(Date.now() - seededInt(seed, 10, 200) * 86_400_000).toISOString(),
    };
  },

  // Real impl: `select * from referrals where partner_id = :partnerId order by created_at desc`.
  findReferralsByPartnerId(partnerId: string): Referral[] {
    const seed = hashSeed(partnerId);
    const count = seededInt(seed, 3, MOCK_REFERRED_NAMES.length);

    return Array.from({ length: count }, (_, index) => {
      const rowSeed = seed + index * 17;
      const status = REFERRAL_STATUS_CYCLE[rowSeed % REFERRAL_STATUS_CYCLE.length];
      return {
        id: `referral_${partnerId}_${index}`,
        partnerId,
        referredName: MOCK_REFERRED_NAMES[(seed + index) % MOCK_REFERRED_NAMES.length],
        status,
        rewardUsd: status === "reward_released" ? seededInt(rowSeed, 1, 5) * 25 : 0,
        createdAt: new Date(Date.now() - (index + 1) * 3 * 86_400_000).toISOString(),
      };
    });
  },

  // Real impl: `select count(*) from partners where is_founding_partner`.
  getFoundingProgramStatus(): FoundingPartnerProgramStatus {
    const claimed = 72;
    return {
      quota: FOUNDING_PARTNER_QUOTA,
      claimed,
      isOpen: claimed < FOUNDING_PARTNER_QUOTA,
    };
  },
};
