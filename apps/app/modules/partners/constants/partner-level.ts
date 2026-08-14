import type { PartnerLevel } from "../types/partner";

/** Static config for one partner tier — thresholds are on `paidClientsCount`, per the brief. */
export interface PartnerLevelConfig {
  level: PartnerLevel;
  label: string;
  emoji: string;
  /** Inclusive lower bound of paid clients required for this level. */
  minPaidClients: number;
  /** Inclusive upper bound, or null for the top (uncapped) tier. */
  maxPaidClients: number | null;
  commissionRate: number;
}

// Order matters — utils/level-calculator.ts relies on this being sorted
// ascending by minPaidClients so it can walk it once.
export const PARTNER_LEVELS: PartnerLevelConfig[] = [
  { level: "bronze", label: "Bronze", emoji: "🥉", minPaidClients: 0, maxPaidClients: 2, commissionRate: 0.05 },
  { level: "silver", label: "Silver", emoji: "🥈", minPaidClients: 3, maxPaidClients: 6, commissionRate: 0.07 },
  { level: "gold", label: "Gold", emoji: "🥇", minPaidClients: 7, maxPaidClients: 14, commissionRate: 0.1 },
  { level: "platinum", label: "Platinum", emoji: "💎", minPaidClients: 15, maxPaidClients: null, commissionRate: 0.12 },
];

export const PARTNER_LEVEL_CONFIG: Record<PartnerLevel, PartnerLevelConfig> = Object.fromEntries(
  PARTNER_LEVELS.map((config) => [config.level, config]),
) as Record<PartnerLevel, PartnerLevelConfig>;

export function partnerLevelConfig(level: PartnerLevel): PartnerLevelConfig {
  return PARTNER_LEVEL_CONFIG[level];
}

/** The level immediately after `level`, or null if already at the top tier. */
export function nextPartnerLevel(level: PartnerLevel): PartnerLevelConfig | null {
  const index = PARTNER_LEVELS.findIndex((config) => config.level === level);
  if (index === -1 || index === PARTNER_LEVELS.length - 1) return null;
  return PARTNER_LEVELS[index + 1];
}
