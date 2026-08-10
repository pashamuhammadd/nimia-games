// Mirrors apps/studio/modules/partners/utils/level-calculator.ts +
// constants/partner-level.ts EXACTLY — level thresholds are DERIVED, not
// stored (see packages/db/migrations/0016_partner_program.sql's own
// comment on the `partners` table: "there is exactly one source of truth
// for the level ladder"), and there's no shared package apps/admin and
// apps/studio can both import this from (separate Next.js apps in the
// monorepo). That migration's own comment already accepts "keep 2 places
// in sync manually" for its SQL partner_commission_rate() vs. apps/studio's
// TS file — this is now a 3rd place with the same caveat. If you ever
// change the Bronze/Silver/Gold/Platinum thresholds, update ALL THREE:
// this file, apps/studio/modules/partners/constants/partner-level.ts, and
// 0016's partner_commission_rate().
const PARTNER_LEVELS = [
  { label: "Bronze", emoji: "🥉", minPaidClients: 0 },
  { label: "Silver", emoji: "🥈", minPaidClients: 3 },
  { label: "Gold", emoji: "🥇", minPaidClients: 7 },
  { label: "Platinum", emoji: "💎", minPaidClients: 15 },
] as const;

// Founding Partners are "Instant Gold ... Lifetime Gold Status" per the
// original brief — same override apps/studio's level-calculator.ts
// applies (resolvePartnerLevel there checks isFoundingPartner FIRST,
// before the normal ladder).
const FOUNDING_PARTNER_LEVEL = PARTNER_LEVELS[2]; // Gold

export function resolvePartnerLevelDisplay(paidClientsCount: number, isFoundingPartner: boolean) {
  if (isFoundingPartner) return FOUNDING_PARTNER_LEVEL;
  let resolved: (typeof PARTNER_LEVELS)[number] = PARTNER_LEVELS[0];
  for (const config of PARTNER_LEVELS) {
    if (paidClientsCount >= config.minPaidClients) resolved = config;
  }
  return resolved;
}
