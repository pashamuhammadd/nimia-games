// Nimia Partner Program — core Partner entity types.
//
// This module is intentionally front-end/UI first (30 Juli 2026 brief:
// "JANGAN implementasikan semua logic sekarang. Cukup siapkan struktur dan
// type yang rapi."). Every shape here is designed to map 1:1 onto a future
// `partners` table (see repository/partner.repository.ts for the exact
// column-shaped comments) without needing to change any component or
// service signature later — only the repository's implementation swaps
// from mock data to real Supabase queries.
//
// NOTE: this is a DIFFERENT system from the existing `ambassadors` /
// `referrals` / `commissions` tables added in
// packages/db/migrations/0013_negotiation_payments_ambassadors.sql. That
// migration models an application-based "Ambassador Program" (apply ->
// admin approval -> ambassador row). The Nimia Partner Program described in
// this brief is self-serve: EVERY client account gets a referral code
// automatically, no application/approval step. The two are kept separate
// on purpose here — reconciling them (or deciding Partners supersedes
// Ambassadors) is a Tahap 5+ backend decision, not something to guess at
// while building the UI layer.

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
