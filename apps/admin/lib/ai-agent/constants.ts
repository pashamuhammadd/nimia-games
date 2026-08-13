import type { CategoryTierInfo } from "./types";

// Scoring weights, qualification thresholds, and category tiers — the
// single source of truth for the "Animation Opportunity Analysis" /
// "Opportunity Score" sections of the brief (12, 6). Kept as named
// constants (not magic numbers scattered through tools/scoreProject.ts)
// so the Overview/Settings/Find Prospects pages can display the exact
// numbers the engine actually uses.

export const SCORE_MAX = {
  categoryFit: 25,
  visualPotential: 20,
  commercialPotential: 20,
  activity: 15,
  brandPresence: 10,
  contactability: 10,
} as const;

export const SCORE_TOTAL_MAX = Object.values(SCORE_MAX).reduce((sum, n) => sum + n, 0); // 100

// A project at or above this opportunity_score is a "qualified_prospect";
// below it but still worth a human look lands in "opportunity" — see
// tools/scoreProject.ts. A run's own `minOpportunityScore` (Find Prospects
// page) is a SEPARATE, admin-chosen filter for what counts toward that
// run's "qualified" tally — it never lowers a project's actual stored
// prospect status below what these thresholds say.
export const QUALIFIED_SCORE_THRESHOLD = 70;
export const OPPORTUNITY_SCORE_THRESHOLD = 40;

// animation_opportunity level thresholds (spec section 11) — deliberately
// a finer-grained read than the two thresholds above, since a project can
// be a "medium" opportunity without yet crossing into "qualified_prospect"
// territory on prospect_status.
export const OPPORTUNITY_LEVEL_THRESHOLDS = {
  very_high: 80,
  high: 60,
  medium: 40,
  low: 20,
  none: 0,
} as const;

export const DEFAULT_REQUESTED_TARGET = 20;
export const DEFAULT_MIN_OPPORTUNITY_SCORE = 70;

// Spec section 6's four tiers, mapped to CoinGecko category slugs (from
// /coins/categories/list). Best-effort curated list, not guaranteed to be
// exhaustive or perfectly current — CoinGecko occasionally renames/splits
// categories. Verify against the live endpoint if a tier's discovery
// results look thin; see discovery/coingecko-project-provider.ts's header
// comment for how to add a slug here safely (it only ever needs to exist
// in this list — nothing else changes).
export const CATEGORY_TIERS: CategoryTierInfo[] = [
  {
    tier: 1,
    label: "Gaming / GameFi / Metaverse",
    categorySlugs: [
      "gaming",
      "gaming-blockchains",
      "gaming-platforms",
      "play-to-earn",
      "metaverse",
      "virtual-reality",
    ],
  },
  {
    tier: 2,
    label: "NFT / Web3 Entertainment / Creator & Social",
    categorySlugs: [
      "non-fungible-tokens-nft",
      "collectibles-nfts",
      "nft-marketplace",
      "entertainment",
      "creator-economy",
      "social-money",
      "socialfi",
    ],
  },
  {
    tier: 3,
    label: "Memecoin / DeFi / Payments / Wallets",
    categorySlugs: [
      "meme-token",
      "dog-themed-coins",
      "cat-themed-coins",
      "decentralized-finance-defi",
      "decentralized-exchange",
      "lending-borrowing",
      "payment-solutions",
      "wallets",
    ],
  },
  {
    tier: 4,
    label: "Layer 1 / Layer 2 / Infrastructure / Oracle",
    categorySlugs: [
      "layer-1",
      "layer-2",
      "oracle",
      "smart-contract-platform",
      "infrastructure",
      "interoperability",
    ],
  },
];

export function tierForCategorySlug(slug: string): CategoryTierInfo | null {
  return CATEGORY_TIERS.find((t) => t.categorySlugs.includes(slug)) ?? null;
}

export function allCategorySlugs(): string[] {
  return CATEGORY_TIERS.flatMap((t) => t.categorySlugs);
}

export const OUTREACH_STATUS_LABELS: Record<string, string> = {
  not_contacted: "Not Contacted",
  ready: "Ready",
  contacted: "Contacted",
  replied: "Replied",
  no_response: "No Response",
  interested: "Interested",
  not_interested: "Not Interested",
};

export const PROSPECT_STATUS_LABELS: Record<string, string> = {
  project: "Project",
  opportunity: "Opportunity",
  qualified_prospect: "Qualified Prospect",
  contacted: "Contacted",
  replied: "Replied",
  negotiation: "Negotiation",
  client: "Client",
  rejected: "Rejected",
};

export const OPPORTUNITY_LEVEL_LABELS: Record<string, string> = {
  very_high: "Very High",
  high: "High",
  medium: "Medium",
  low: "Low",
  none: "None",
};

export const COMMERCIAL_POTENTIAL_LABELS: Record<string, string> = {
  very_high: "Very High",
  high: "High",
  medium: "Medium",
  low: "Low",
};
