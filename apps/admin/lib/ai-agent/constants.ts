import type { CategoryTier, CategoryTierInfo } from "./types";

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

// AI Prospect Hunter partner broadcast (added 19 Aug 2026 — see
// tools/notifyPartners.ts and orchestrator.ts's call site). Deliberately a
// SEPARATE named constant from OPPORTUNITY_SCORE_THRESHOLD above even
// though it's the same number today — product decision, confirmed
// explicitly by the user ("Lebih longgar (termasuk 'opportunity', skor
// 40+)") rather than the stricter QUALIFIED_SCORE_THRESHOLD (70): a
// project only needs to clear "opportunity" level, not "qualified
// prospect", to be posted to #prospect-hunter (Discord) and the Nimia
// Partner Program Telegram channel. Kept separate so retuning WHO gets
// classified as an "opportunity" in the dashboard (OPPORTUNITY_SCORE_
// THRESHOLD) doesn't silently also retune what partners see broadcast to
// them, and vice versa — if that ever needs its own independent value,
// only this line changes.
export const PARTNER_NOTIFY_SCORE_THRESHOLD = 40;

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

// Prospecting target market-cap band (product decision, 13 Aug 2026 — see
// git history / project notes for the "AI agent salah target" fix). Nimia
// sells OUTSOURCED animation work, so the ideal prospect is funded enough
// to pay for it but NOT yet big enough to have built (or already
// contracted) an in-house/agency creative team of its own:
//   - below MIN_TARGET_MARKET_CAP_USD: almost certainly too early/small to
//     have a real production budget yet.
//   - above MAX_TARGET_MARKET_CAP_USD: almost certainly already has its own
//     creative pipeline — technically "can afford us" but very unlikely to
//     actually buy outsourced animation work, so it's a LOW-priority
//     outbound target despite the deep pockets.
// Used by BOTH discovery (coingecko-project-provider.ts filters candidates
// to this band before spending detail-call budget on them) and scoring
// (tools/scoreProject.ts's scoreCommercialPotential peaks inside this band
// and tapers at both ends — never a flat "bigger market cap = better"
// curve). Adjust these two numbers to retune the whole pipeline's targeting
// — nothing else needs to change.
export const MIN_TARGET_MARKET_CAP_USD = 20_000;
export const MAX_TARGET_MARKET_CAP_USD = 20_000_000;

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

// Default sweep order when the Find Prospects page's tier checkboxes are
// all left unchecked ("sweep all of them" — FindProspectsForm.tsx).
//
// BUG FIXED 19 Aug 2026: discovery/coingecko-project-provider.ts used to
// fall back to allCategorySlugs() above — a flat concatenation of
// CATEGORY_TIERS in tier order — then slice(0, MAX_CATEGORIES_PER_RUN).
// Tier 1 (6 slugs) + Tier 2 (7 slugs) alone is 13 slugs, already bigger
// than MAX_CATEGORIES_PER_RUN ever was, which meant a default "sweep all"
// run NEVER actually reached Tier 3 (Memecoin/DeFi/Payments/Wallets) or
// Tier 4 (Infrastructure) — every unrestricted run silently only ever
// swept Gaming/Metaverse and NFT/Entertainment categories. Since the admin
// never explicitly restricted categories, this looked like "the agent just
// doesn't find memecoin/new projects" rather than the sweep-order bug it
// actually was.
//
// Fixed by interleaving (round-robin) across tiers instead of
// concatenating, so every tier gets a fair share of whatever
// MAX_CATEGORIES_PER_RUN allows. DEFAULT_SWEEP_TIER_ORDER additionally puts
// Tier 3 FIRST in each round (product decision, 19 Aug 2026: Nimia wants
// the default sweep actively biased toward memecoin / new-and-small
// projects, not just "not starved out entirely") — see
// tools/scoreProject.ts's tierBase for the matching scoring-side change.
const DEFAULT_SWEEP_TIER_ORDER: CategoryTier[] = [3, 1, 2, 4];

export function defaultSweepCategorySlugs(): string[] {
  const remainingByTier = new Map<CategoryTier, string[]>(CATEGORY_TIERS.map((t) => [t.tier, [...t.categorySlugs]]));
  const interleaved: string[] = [];
  let tookAny = true;
  while (tookAny) {
    tookAny = false;
    for (const tier of DEFAULT_SWEEP_TIER_ORDER) {
      const slug = remainingByTier.get(tier)?.shift();
      if (slug) {
        interleaved.push(slug);
        tookAny = true;
      }
    }
  }
  return interleaved;
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
