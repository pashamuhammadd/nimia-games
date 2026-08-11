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

/** `joinedViaPartnerPage` added 11 Agustus 2026 (Discord gamification
 * phase) — this file previously only mirrored the Founding Partner
 * override (see header comment above), missing the /partners-page
 * Gold-rate FLOOR migration 0030 added the same day as this file's own
 * "3rd place" comment was written. That gap meant this admin-side helper
 * could under-report a floor partner's level (e.g. showing Bronze for
 * someone who's actually guaranteed at least Gold) anywhere it's called —
 * including the Partners directory list this file was originally built
 * for. Third parameter defaults to `false` so every existing call site
 * keeps compiling and behaving exactly as before; pass the partner's real
 * `joined_via_partner_page` flag (from get_all_partners_admin, 0028/0030,
 * or get_partner_discord_profile, 0035) to get the correct floor applied,
 * same floor logic as apps/studio's resolvePartnerLevel. */
export function resolvePartnerLevelDisplay(
  paidClientsCount: number,
  isFoundingPartner: boolean,
  joinedViaPartnerPage: boolean = false,
) {
  if (isFoundingPartner) return FOUNDING_PARTNER_LEVEL;
  let resolved: (typeof PARTNER_LEVELS)[number] = PARTNER_LEVELS[0];
  for (const config of PARTNER_LEVELS) {
    if (paidClientsCount >= config.minPaidClients) resolved = config;
  }
  if (joinedViaPartnerPage) {
    const floorIndex = PARTNER_LEVELS.indexOf(FOUNDING_PARTNER_LEVEL);
    const resolvedIndex = PARTNER_LEVELS.indexOf(resolved);
    if (resolvedIndex < floorIndex) resolved = FOUNDING_PARTNER_LEVEL;
  }
  return resolved;
}

/** The level immediately after `level`, or null if already at the top
 * tier — added 11 Agustus 2026 alongside joinedViaPartnerPage above,
 * needed by verifyPaymentAction (apps/admin/app/(protected)/orders/actions.ts)
 * to build the "Next milestone: N Successful Paid Referrals → Level" line
 * for #partner-success, mirroring apps/studio's nextPartnerLevel(). */
export function nextPartnerLevelDisplay(level: (typeof PARTNER_LEVELS)[number]) {
  const index = PARTNER_LEVELS.indexOf(level);
  if (index === -1 || index === PARTNER_LEVELS.length - 1) return null;
  return PARTNER_LEVELS[index + 1];
}
