// Nimia Partner Program — core Partner entity types.
//
// Shipped UI-first with a mock repository (30 Juli 2026), then wired to a
// real `partners` table the same day (migration
// packages/db/migrations/0016_partner_program.sql) — see
// repository/partner.repository.ts for the real Supabase queries. Every
// shape here maps 1:1 onto that table (+ the get_partner_metrics RPC for
// the derived counters).
//
// HISTORY: this used to be explicitly separate from the older
// application-based "Ambassador Program"
// (ambassador_applications/ambassadors/referrals/commissions, from
// packages/db/migrations/0013_negotiation_payments_ambassadors.sql).
// Migration 0016 MERGED the two per the user's decision: existing
// ambassador rows were migrated into `partners`/`partner_referrals`/
// `partner_rewards`, and the old tables were renamed to `*_legacy` (kept
// for audit, no longer read by the app). There is now only ONE referral
// system — this one, self-serve, every account gets a code automatically.

/** The four partner tiers, ordered lowest to highest. */
export type PartnerLevel = "bronze" | "silver" | "gold" | "platinum";

/**
 * A single partner account — one per Nimia Studio client/user. Mirrors what
 * will eventually be a `partners` row (1:1 with `users`/`clients`).
 */
export interface Partner {
  id: string;
  userId: string;

  /** Permanent, unique, uppercase 8-character code — see utils/generate-referral-code.ts. */
  referralCode: string;
  /** Derived from referralCode; never stored separately to avoid drift. */
  referralLink: string;

  /** Total people who registered using this partner's code/link. */
  referralCount: number;
  /** Subset of referralCount who went on to become a paying client — this is what drives level. */
  paidClientsCount: number;

  currentLevel: PartnerLevel;
  commissionRate: number; // e.g. 0.05 for 5%

  /** True for the first 100 accounts that ever joined the partner program. */
  isFoundingPartner: boolean;
  /** 1-based join order, e.g. 72 of the Founding Partner quota. Only set when isFoundingPartner. */
  foundingPartnerNumber?: number;

  /**
   * True if this account registered through studio.nimiagames.com/partners
   * (10 Agustus 2026, per user decision) rather than a plain /register
   * visit or a referral link. Grants a Gold-rate (10%) commission FLOOR —
   * unlike isFoundingPartner, this does NOT lock the level; enough paid
   * clients still carries the partner on up to Platinum. See
   * utils/level-calculator.ts#resolvePartnerLevel for how the floor is
   * applied.
   */
  joinedViaPartnerPage: boolean;

  rewardBalance: {
    pendingUsd: number;
    availableUsd: number;
    lifetimeUsd: number;
  };

  createdAt: string;
}

/**
 * Aggregate counters shown in the Hero Statistics row — derived from
 * Partner + referral list, not stored separately. Named "...Summary"
 * (rather than the more obvious `PartnerStats`) specifically to avoid
 * colliding with the `PartnerStats` COMPONENT in components/partner-stats.tsx
 * — the module root barrel does `export *` from both types/ and
 * components/, and two same-named exports from different `export *`
 * sources get silently dropped from the aggregate (ES module spec
 * behavior), not flagged as an error — so this collision would otherwise
 * fail silently instead of at compile time.
 */
export interface PartnerStatsSummary {
  totalReferrals: number;
  paidClients: number;
  pendingRewardUsd: number;
  lifetimeRewardUsd: number;
}

/** Founding Partner quota/progress — global across the whole program, not per-partner. */
export interface FoundingPartnerProgramStatus {
  quota: number;
  claimed: number;
  isOpen: boolean;
}
