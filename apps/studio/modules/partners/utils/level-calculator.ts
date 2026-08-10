import { PARTNER_LEVELS, nextPartnerLevel, partnerLevelConfig } from "../constants/partner-level";
import { FOUNDING_PARTNER_COMMISSION_RATE, FOUNDING_PARTNER_LEVEL } from "../constants/commission";
import type { PartnerLevel } from "../types/partner";

/**
 * Resolves a partner's level from their paid-clients count, with two
 * overrides applied first:
 *   1. Founding Partner — "Instant Gold ... Lifetime Gold Status" per the
 *      brief, so their level never drops (or rises) with the normal
 *      ladder, regardless of paidClientsCount.
 *   2. Signed up via the public /partners marketing page (added 10
 *      Agustus 2026, per user decision) — a Gold-rate FLOOR, not a lock:
 *      guaranteed at least Gold (0.10) from day one, but unlike Founding
 *      Partner this one is NOT capped — enough paid clients still carries
 *      them on up to Platinum. Implemented as a floor on the resolved
 *      level itself (bump Bronze/Silver up to Gold) rather than a
 *      separate rate override, so every other derived value (progress
 *      bar, "next level" label, badge) stays correct without having to
 *      special-case this flag anywhere else.
 */
export function resolvePartnerLevel(
  paidClientsCount: number,
  isFoundingPartner: boolean,
  joinedViaPartnerPage: boolean = false,
): PartnerLevel {
  if (isFoundingPartner) return FOUNDING_PARTNER_LEVEL;

  let resolved: PartnerLevel = PARTNER_LEVELS[0].level;
  for (const config of PARTNER_LEVELS) {
    if (paidClientsCount >= config.minPaidClients) {
      resolved = config.level;
    }
  }

  if (joinedViaPartnerPage) {
    const floorRank = PARTNER_LEVELS.findIndex((config) => config.level === FOUNDING_PARTNER_LEVEL);
    const resolvedRank = PARTNER_LEVELS.findIndex((config) => config.level === resolved);
    if (resolvedRank < floorRank) {
      resolved = FOUNDING_PARTNER_LEVEL; // Gold — same tier Founding Partner uses, just not locked.
    }
  }

  return resolved;
}

/** Commission rate for a partner given their level + founding status. */
export function resolveCommissionRate(level: PartnerLevel, isFoundingPartner: boolean): number {
  if (isFoundingPartner) return FOUNDING_PARTNER_COMMISSION_RATE;
  return partnerLevelConfig(level).commissionRate;
}

export interface LevelProgress {
  level: PartnerLevel;
  levelLabel: string;
  levelEmoji: string;
  paidClientsCount: number;
  /** Paid clients needed to reach `nextLevel`, or null if already at the top tier. */
  targetPaidClients: number | null;
  nextLevelLabel: string | null;
  /** 0-100, clamped — for progress bars. 100 when already at the top tier. */
  progressPercent: number;
}

/**
 * Progress-to-next-level for the Partner Progress card. Founding Partners
 * are already at a fixed Gold level with no "next" to climb toward (their
 * status doesn't change with more paid clients), so this reports them as
 * fully progressed rather than showing a misleading bar toward Platinum
 * they were never on a track for. A /partners-page floor partner is NOT
 * special-cased the same way — they start the bar already at Gold (via
 * resolvePartnerLevel's floor above), but nextPartnerLevel("gold") still
 * resolves to Platinum, so their progress bar correctly shows how far
 * they are from Platinum instead of freezing at "done".
 */
export function calculateLevelProgress(
  paidClientsCount: number,
  isFoundingPartner: boolean,
  joinedViaPartnerPage: boolean = false,
): LevelProgress {
  const level = resolvePartnerLevel(paidClientsCount, isFoundingPartner, joinedViaPartnerPage);
  const config = partnerLevelConfig(level);
  const next = isFoundingPartner ? null : nextPartnerLevel(level);

  if (!next) {
    return {
      level,
      levelLabel: config.label,
      levelEmoji: config.emoji,
      paidClientsCount,
      targetPaidClients: null,
      nextLevelLabel: null,
      progressPercent: 100,
    };
  }

  const span = next.minPaidClients - config.minPaidClients;
  const progressed = paidClientsCount - config.minPaidClients;
  const progressPercent = span > 0 ? Math.max(0, Math.min(100, Math.round((progressed / span) * 100))) : 100;

  return {
    level,
    levelLabel: config.label,
    levelEmoji: config.emoji,
    paidClientsCount,
    targetPaidClients: next.minPaidClients,
    nextLevelLabel: next.label,
    progressPercent,
  };
}
