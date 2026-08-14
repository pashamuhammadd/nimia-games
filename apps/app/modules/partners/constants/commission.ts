import { PARTNER_LEVEL_CONFIG } from "./partner-level";
import type { PartnerLevel } from "../types/partner";

/**
 * Founding Partners skip the normal level ladder entirely: instant Gold,
 * locked at this rate for life, per the brief ("Instant Gold Partner, 10%
 * Commission, Lifetime Gold Status") — regardless of how their
 * paidClientsCount later moves. utils/level-calculator.ts is what actually
 * applies this override; this constant is just the single source of truth
 * for the rate so it's never hand-typed twice.
 */
export const FOUNDING_PARTNER_COMMISSION_RATE = 0.1;
export const FOUNDING_PARTNER_LEVEL: PartnerLevel = "gold";

/** Commission rate for a given level under the normal (non-founding) ladder. */
export function commissionRateForLevel(level: PartnerLevel): number {
  return PARTNER_LEVEL_CONFIG[level].commissionRate;
}
