import { PARTNER_LEVELS, nextPartnerLevel, partnerLevelConfig } from "../constants/partner-level";
import { FOUNDING_PARTNER_COMMISSION_RATE, FOUNDING_PARTNER_LEVEL } from "../constants/commission";
import type { PartnerLevel } from "../types/partner";

/**
 * Resolves a partner's level from their paid-clients count, with the
 * Founding Partner override applied first — Founding Partners are
 * "Instant Gold ... Lifetime Gold Status" per the brief, so their level
 * never drops (or rises) with the normal ladder, regardless of
 * paidClientsCount.
 */
export function resolvePartnerLevel(paidClientsCount: number, isFoundingPartner: boolean): PartnerLevel {
  if (isFoundingPartner) return FOUNDING_PARTNER_LEVEL;

  let resolved: PartnerLevel = PARTNER_LEVELS[0].level;
  for (const config of PARTNER_LEVELS) {
    if (paidClientsCount >= config.minPaidClients) {
      resolved = config.level;
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
 * they were never on a track for.
 */
export function calculateLevelProgress(paidClientsCount: number, isFoundingPartner: boolean): LevelProgress {
  const level = resolvePartnerLevel(paidClientsCount, isFoundingPartner);
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
