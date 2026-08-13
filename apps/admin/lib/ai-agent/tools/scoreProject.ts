import type {
  AiCommercialPotential,
  AiOpportunityLevel,
  DiscoveredProject,
  OpportunityScoreBreakdown,
  ScoreFactor,
} from "../types";
import { SCORE_MAX, OPPORTUNITY_LEVEL_THRESHOLDS, tierForCategorySlug, MIN_TARGET_MARKET_CAP_USD, MAX_TARGET_MARKET_CAP_USD } from "../constants";
import { recommendServicesForCategories, flavorForCategorySlug, type ProjectFlavor } from "../knowledge/animation-services";

// Tool: score_project — the deterministic, transparent 0-100 Opportunity
// Score engine (spec section 12). Every factor returns its own
// {score, max, reasons[]} so the UI can render the exact breakdown the
// spec's own example shows ("Opportunity Score: 88/100, Category Fit:
// 24/25, ..."), and so the number is reproducible from the same inputs
// rather than depending on an LLM call. An optional AI provider
// (../provider.ts) may later polish the reasoning prose, but it is never
// allowed to change these numbers.
//
// Every reason string here is grounded in an actual field on the project
// (category, channel count, market cap, launch recency) — never a
// generic "this project is on CoinGecko, therefore it may need
// animation" (spec section 11's own explicit BAD example). See
// buildReasoning at the bottom for the full project-specific paragraph
// assembled from these same factors.

function clamp(n: number, max: number): number {
  return Math.max(0, Math.min(max, Math.round(n)));
}

function primaryFlavor(categories: string[]): ProjectFlavor {
  if (categories.length === 0) return "infrastructure";
  return flavorForCategorySlug(categories[0]);
}

function channelCount(project: DiscoveredProject): number {
  const { twitter, telegram, discord, reddit, facebook } = project.socialLinks;
  return [twitter, telegram, discord, reddit, facebook].filter(Boolean).length;
}

// ------------------------------------------------------------------
// Category Fit — 0-25 (spec section 6's tier list)
// ------------------------------------------------------------------

function scoreCategoryFit(project: DiscoveredProject): ScoreFactor {
  const max = SCORE_MAX.categoryFit;
  // matchedCategorySlugs is the authoritative CoinGecko category slug(s)
  // this project was actually discovered under — see that field's own
  // comment in types.ts for why this can't be derived from
  // project.categories' human-readable labels instead.
  const matches = project.matchedCategorySlugs
    .map((slug) => tierForCategorySlug(slug))
    .filter((t): t is NonNullable<typeof t> => Boolean(t));

  if (matches.length === 0) {
    return {
      score: 4,
      max,
      reasons: [
        project.categories.length > 0
          ? `Category "${project.categories[0]}" isn't in Nimia's tiered prospecting list — treated as low, not zero, fit (spec: don't reject lower-priority categories outright).`
          : "CoinGecko reported no category for this project — fit is unknown, scored conservatively low.",
      ],
    };
  }

  const bestTier = Math.min(...matches.map((m) => m.tier));
  const tierBase = { 1: 21, 2: 15, 3: 9, 4: 5 }[bestTier] ?? 5;
  const tierLabel = matches.find((m) => m.tier === bestTier)!.label;
  const bonus = matches.filter((m) => m.tier === bestTier).length > 1 ? 3 : 0;

  return {
    score: clamp(tierBase + bonus, max),
    max,
    reasons: [
      `Tier ${bestTier} category (${tierLabel}) — ${bestTier <= 2 ? "high" : "moderate"} animation-business potential for Nimia.`,
      ...(bonus > 0 ? [`Matches multiple Tier ${bestTier} categories, reinforcing the fit.`] : []),
    ],
  };
}

// ------------------------------------------------------------------
// Product / Visual Potential — 0-20
// ------------------------------------------------------------------

const VISUAL_POTENTIAL_BASE: Record<ProjectFlavor, number> = {
  gaming: 17,
  metaverse: 17,
  nft: 16,
  "web3-entertainment": 13,
  meme: 12,
  "ai-web3": 8,
  defi: 6,
  infrastructure: 4,
};

function scoreVisualPotential(project: DiscoveredProject): ScoreFactor {
  const max = SCORE_MAX.visualPotential;
  const flavor = primaryFlavor(project.categories);
  let score = VISUAL_POTENTIAL_BASE[flavor];
  const reasons = [`${flavor.replace("-", " ")} projects are typically visual/product-driven — a natural fit for frame-by-frame animation.`];

  if (project.logoUrl) {
    score += 2;
    reasons.push("Has a visual brand asset (logo) already in place — a project already investing in visual identity.");
  }
  if (project.description && project.description.length > 80) {
    score += 1;
    reasons.push("Has a substantive public description — an identifiable product, not a placeholder listing.");
  }

  return { score: clamp(score, max), max, reasons };
}

// ------------------------------------------------------------------
// Commercial Potential — 0-20
//
// NOT a "bigger market cap = better" curve (product fix, 13 Aug 2026 —
// the AI agent was surfacing mostly blue-chip projects, which almost
// always already have their own in-house or already-contracted creative
// team and are poor outbound prospects for Nimia's outsourced animation
// services, however deep their pockets). This peaks in the
// MIN_TARGET_MARKET_CAP_USD..MAX_TARGET_MARKET_CAP_USD band (constants.ts)
// — funded enough to plausibly pay for outsourced creative work, not yet
// big enough to have built that capability in-house — and tapers off at
// BOTH ends: too small likely means no real production budget yet, too
// big likely means they don't need us. Discovery (coingecko-project-
// provider.ts) already filters candidates to roughly this band before
// they ever reach scoring, so an out-of-band project reaching this
// function is the exception (e.g. a demo-mode fixture), not the norm.
// ------------------------------------------------------------------

function scoreCommercialPotential(project: DiscoveredProject): { factor: ScoreFactor; level: AiCommercialPotential } {
  const max = SCORE_MAX.commercialPotential;
  const cap = project.marketCapUsd ?? project.fullyDilutedValuationUsd;

  if (cap == null) {
    if (project.volume24hUsd != null && project.volume24hUsd > 0) {
      const reasons = [`No market cap reported — using 24h trading volume (~$${Math.round(project.volume24hUsd).toLocaleString()}) as a budget proxy.`];
      const score = project.volume24hUsd >= 50_000 ? 14 : project.volume24hUsd >= 5_000 ? 8 : 3;
      return { factor: { score, max, reasons }, level: score >= 14 ? "high" : score >= 8 ? "medium" : "low" };
    }
    return { factor: { score: 1, max, reasons: ["No market cap or trading volume data available to gauge budget."] }, level: "low" };
  }

  const fmt = (n: number) => `$${Math.round(n).toLocaleString()}`;

  if (cap > MAX_TARGET_MARKET_CAP_USD) {
    return {
      factor: {
        score: 4,
        max,
        reasons: [
          `Market cap ~${fmt(cap)} — well above Nimia's ${fmt(MAX_TARGET_MARKET_CAP_USD)} target ceiling. Projects at this size have almost always already built (or already contracted) their own creative pipeline, so despite the budget this is a low-priority outbound prospect.`,
        ],
      },
      level: "low",
    };
  }
  if (cap >= 5_000_000) {
    return { factor: { score: 15, max, reasons: [`Market cap ~${fmt(cap)} — a solid, established budget and still a plausible buyer of outsourced creative work.`] }, level: "high" };
  }
  if (cap >= 500_000) {
    return {
      factor: {
        score: max,
        max,
        reasons: [`Market cap ~${fmt(cap)} — Nimia's sweet spot: funded enough to commission outsourced animation work, not yet big enough to have built that capability in-house.`],
      },
      level: "very_high",
    };
  }
  if (cap >= MIN_TARGET_MARKET_CAP_USD) {
    return { factor: { score: 10, max, reasons: [`Market cap ~${fmt(cap)} — early-stage; a real but likely modest production budget.`] }, level: "medium" };
  }
  return { factor: { score: 2, max, reasons: [`Market cap ~${fmt(cap)} — too early/small to likely have budget for outsourced animation work yet.`] }, level: "low" };
}

// ------------------------------------------------------------------
// Project Activity — 0-15
// ------------------------------------------------------------------

function scoreActivity(project: DiscoveredProject): ScoreFactor {
  const max = SCORE_MAX.activity;

  if (project.launchDate) {
    const ageDays = (Date.now() - new Date(project.launchDate).getTime()) / (1000 * 60 * 60 * 24);
    if (Number.isFinite(ageDays)) {
      if (ageDays <= 30) return { score: max, max, reasons: [`Launched within the last month (${Math.max(0, Math.round(ageDays))} days ago) — an active marketing window.`] };
      if (ageDays <= 180) return { score: 10, max, reasons: ["Launched within the last 6 months — still in an early growth phase."] };
      return { score: 4, max, reasons: ["Launched more than 6 months ago — activity read from market data alone, not recency."] };
    }
  }

  if (project.volume24hUsd != null) {
    const reasons = [`No launch date available — using 24h trading volume (~$${Math.round(project.volume24hUsd).toLocaleString()}) as an activity proxy instead.`];
    if (project.volume24hUsd >= 100_000) return { score: max, max, reasons };
    if (project.volume24hUsd >= 10_000) return { score: 8, max, reasons };
    if (project.volume24hUsd > 0) return { score: 4, max, reasons };
  }

  return { score: 1, max, reasons: ["No recency or activity data available."] };
}

// ------------------------------------------------------------------
// Brand / Community Presence — 0-10
// ------------------------------------------------------------------

function scoreBrandPresence(project: DiscoveredProject): ScoreFactor {
  const max = SCORE_MAX.brandPresence;
  const channels = channelCount(project);
  let score = channels * 1.6;
  const reasons = [`Present on ${channels} official community channel${channels === 1 ? "" : "s"} (Twitter/Telegram/Discord/Reddit/Facebook).`];

  if (project.description) {
    score += 1;
    reasons.push("Has a public project description.");
  }

  return { score: clamp(score, max), max, reasons };
}

// ------------------------------------------------------------------
// Information / Contactability — 0-10
// ------------------------------------------------------------------

function scoreContactability(project: DiscoveredProject): ScoreFactor {
  const max = SCORE_MAX.contactability;
  const openable = [project.homepageUrl, project.socialLinks.twitter, project.socialLinks.discord, project.socialLinks.telegram, project.developerLinks.github[0]].filter(Boolean).length;

  if (openable === 0) {
    return { score: 0, max, reasons: ["No official link could be opened to reach or learn more about this project."] };
  }

  return {
    score: clamp(openable * 2, max),
    max,
    reasons: [`${openable} direct, openable official link${openable === 1 ? "" : "s"} available (website/X/Discord/Telegram/GitHub).`],
  };
}

// ------------------------------------------------------------------
// Assembly
// ------------------------------------------------------------------

export function opportunityLevelForScore(total: number): AiOpportunityLevel {
  if (total >= OPPORTUNITY_LEVEL_THRESHOLDS.very_high) return "very_high";
  if (total >= OPPORTUNITY_LEVEL_THRESHOLDS.high) return "high";
  if (total >= OPPORTUNITY_LEVEL_THRESHOLDS.medium) return "medium";
  if (total >= OPPORTUNITY_LEVEL_THRESHOLDS.low) return "low";
  return "none";
}

export function scoreProject(project: DiscoveredProject): {
  breakdown: OpportunityScoreBreakdown;
  commercialPotential: AiCommercialPotential;
  recommendedServices: string[];
  reasoning: string;
} {
  const categoryFit = scoreCategoryFit(project);
  const visualPotential = scoreVisualPotential(project);
  const { factor: commercialPotentialFactor, level: commercialPotential } = scoreCommercialPotential(project);
  const activity = scoreActivity(project);
  const brandPresence = scoreBrandPresence(project);
  const contactability = scoreContactability(project);

  const total = clamp(
    categoryFit.score + visualPotential.score + commercialPotentialFactor.score + activity.score + brandPresence.score + contactability.score,
    100,
  );

  const breakdown: OpportunityScoreBreakdown = {
    categoryFit,
    visualPotential,
    commercialPotential: commercialPotentialFactor,
    activity,
    brandPresence,
    contactability,
    total,
  };

  const services = recommendServicesForCategories(project.categories);
  const recommendedServices = services.map((s) => s.label);

  return {
    breakdown,
    commercialPotential,
    recommendedServices,
    reasoning: buildReasoning(project, breakdown, services.map((s) => s.label)),
  };
}

/** Builds the project-specific "why" paragraph (spec section 11) —
 * always cites the project's own category, channels, and market data;
 * never the spec's own labeled-BAD generic reasoning. Always states this
 * is an inferred prospecting read, not an expressed request, since
 * nothing in this pipeline ever has a sentence from the project asking
 * for animation work. */
function buildReasoning(project: DiscoveredProject, breakdown: OpportunityScoreBreakdown, services: string[]): string {
  const flavor = primaryFlavor(project.categories);
  const categoryLabel = project.categories[0] ?? "an uncategorized project";
  const channels = channelCount(project);

  const parts: string[] = [];
  parts.push(
    `${project.name} is ${flavor === "infrastructure" ? "an infrastructure-focused" : `a ${flavor.replace("-", " ")}`} project (CoinGecko category: "${categoryLabel}")` +
      `${channels > 0 ? ` with an active public presence across ${channels} official channel${channels === 1 ? "" : "s"}` : " with limited public presence"}.`,
  );
  if (services.length > 0) {
    parts.push(`${services.join(", ")} ${services.length > 1 ? "are" : "is"} plausible fits given this project's category and visual profile.`);
  }
  parts.push(
    "This is a prospecting signal inferred from the project's public profile (category, channels, market activity) — no explicit request for animation work was found or expected; review the project's own links before any outreach.",
  );
  return parts.join(" ");
}
