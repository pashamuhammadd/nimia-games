import type { AiBuyingIntent, Candidate, EvidenceItem, FirmographicSignal, ScoreBreakdown, ScoreFactor } from "../types";
import { SCORE_MAX } from "../constants";

// Tool: score_firmographic_lead — the deterministic scoring path for
// candidates that come from a STRUCTURED/firmographic discovery source
// (currently CoinGecko's memecoin + NFT providers) rather than a
// natural-language post that expresses hiring intent (Reddit/Demo).
//
// Why this is a separate module from tools/score.ts rather than a branch
// inside it: score.ts's `buyingIntent` factor is built entirely around
// finding a QUOTED sentence that expresses real hiring intent
// (tools/qualify.ts's STRONG_INTENT_PATTERNS) — CoinGecko data has no such
// sentence anywhere, because nobody said anything. Every factor here is
// instead a signal ABOUT the project (freshness, category, community
// channels, market size) used to infer "this project is a plausible
// cold-outreach target", which is a fundamentally different (and weaker)
// claim than "this person asked to hire an animator". Keeping that
// distinction in its own module — with its own honest reason strings, and
// a `buyingIntent` output that's never "high" (see firmographicBuyingIntent)
// — means nobody reading this code, or a lead's own qualification_reason
// in the UI, can mistake an inferred prospect for an expressed one. See
// buildFirmographicEvidence for the same honesty rule applied to evidence.
//
// A firmographic lead's TOTAL score can still cross QUALIFIED_SCORE_THRESHOLD
// (constants.ts) when every signal is strong — that was an explicit product
// decision (12 Agustus 2026), not an oversight: a brand-new memecoin with a
// full set of official channels and real market data is a good enough cold-
// outreach candidate to auto-qualify, as long as its qualification_reason
// and evidence never overstate what's actually known about it.

function clamp(n: number, max: number): number {
  return Math.max(0, Math.min(max, Math.round(n)));
}

export const TYPICAL_SERVICES: Record<FirmographicSignal["projectType"], { label: string; catalogServiceName: string | null }[]> = {
  memecoin: [
    { label: "Meme Animation", catalogServiceName: null },
    { label: "Logo Animation", catalogServiceName: "Logo Animation" },
    { label: "GIF / Sticker Social Media", catalogServiceName: "GIF / Sticker" },
  ],
  nft: [
    { label: "Trailer Project", catalogServiceName: "Trailer" },
    { label: "Motion Graphic", catalogServiceName: "Motion Graphic" },
    { label: "Character Animation", catalogServiceName: "Character Animation" },
  ],
};

function scorePropensity(signal: FirmographicSignal): ScoreFactor {
  const max = SCORE_MAX.buyingIntent;
  let score = 6;
  const reasons: string[] = [
    "No explicit request for animation was found — this is a prospecting signal inferred from the project's public profile, not a stated need.",
  ];

  const channelCount = Object.values(signal.channels).filter(Boolean).length;
  if (channelCount >= 3) {
    score += 14;
    reasons.push(
      `Active public presence across ${channelCount} official channels — typical of a project actively investing in marketing/community growth.`,
    );
  } else if (channelCount >= 2) {
    score += 7;
    reasons.push(`Public presence across ${channelCount} official channels.`);
  }

  if (signal.listedAt) {
    const ageDays = (Date.now() - new Date(signal.listedAt).getTime()) / (1000 * 60 * 60 * 24);
    if (Number.isFinite(ageDays)) {
      if (ageDays <= 7) {
        score += 10;
        reasons.push(
          "Listed within the last 7 days — new launches commonly commission animated marketing assets (logo reveal, hype/announcement video) around this stage.",
        );
      } else if (ageDays <= 30) {
        score += 5;
        reasons.push("Listed within the last month — still in an early marketing push.");
      }
    }
  } else if (signal.activityUsd != null && signal.activityUsd > 0) {
    score += 5;
    reasons.push(
      `Real recent trading activity (~$${Math.round(signal.activityUsd).toLocaleString()} in 24h volume) — the community is active, not abandoned.`,
    );
  }

  return { score: clamp(score, max), max, reasons };
}

function scoreServiceFit(signal: FirmographicSignal): ScoreFactor {
  const max = SCORE_MAX.serviceFit;
  const services = TYPICAL_SERVICES[signal.projectType];
  const kindLabel = signal.projectType === "memecoin" ? "Memecoin" : "NFT";
  const reasons = [
    `${kindLabel} projects commonly commission ${services.map((s) => s.label).join(", ")} for launch/community marketing — an inferred fit based on project type, not a confirmed request.`,
  ];
  let score = 20; // baseline: both project types are visually-driven, hype-marketing-heavy niches
  if (signal.category) {
    reasons.push(`CoinGecko category: "${signal.category}".`);
    score += 5;
  }
  return { score: clamp(score, max), max, reasons };
}

function scoreProjectRelevance(candidate: Candidate, signal: FirmographicSignal): ScoreFactor {
  const max = SCORE_MAX.projectRelevance;
  let score = 5;
  const reasons = ["Identifiable, named project with a public CoinGecko listing."];

  if (candidate.projectUrl) {
    score += 5;
    reasons.push("Has its own official website.");
  }
  if (signal.marketCapUsd != null) {
    score += 5;
    reasons.push("Has tracked market data — not a dead/placeholder listing.");
  }

  return { score: clamp(score, max), max, reasons };
}

function scoreBudgetPotential(signal: FirmographicSignal): ScoreFactor {
  const max = SCORE_MAX.budgetPotential;
  const cap = signal.marketCapUsd;
  if (cap == null) {
    return { score: 2, max, reasons: ["No market cap data available to gauge budget."] };
  }
  const reasons = [`Market cap ~$${Math.round(cap).toLocaleString()} (CoinGecko).`];
  if (cap >= 5_000_000) return { score: max, max, reasons };
  if (cap >= 1_000_000) return { score: 7, max, reasons };
  if (cap >= 100_000) return { score: 4, max, reasons };
  return { score: 2, max, reasons };
}

function scoreProjectActivity(signal: FirmographicSignal): ScoreFactor {
  const max = SCORE_MAX.projectActivity;
  if (signal.listedAt) {
    const ageDays = (Date.now() - new Date(signal.listedAt).getTime()) / (1000 * 60 * 60 * 24);
    if (Number.isFinite(ageDays)) {
      if (ageDays <= 3) return { score: max, max, reasons: ["Listed within the last 3 days."] };
      if (ageDays <= 7) return { score: 7, max, reasons: ["Listed within the last 7 days."] };
      if (ageDays <= 30) return { score: 4, max, reasons: ["Listed within the last month."] };
      return { score: 1, max, reasons: ["Listed more than a month ago."] };
    }
  }
  if (signal.activityUsd != null) {
    const reasons = [
      `CoinGecko's NFT API has no listing date — using 24h trading volume (~$${Math.round(signal.activityUsd).toLocaleString()}) as an activity proxy instead.`,
    ];
    if (signal.activityUsd >= 10_000) return { score: max, max, reasons };
    if (signal.activityUsd >= 1_000) return { score: 6, max, reasons };
    return { score: 3, max, reasons };
  }
  return { score: 1, max, reasons: ["No recency or activity data available."] };
}

function scoreContactability(candidate: Candidate, signal: FirmographicSignal): ScoreFactor {
  const max = SCORE_MAX.contactability;
  if (candidate.contactUrl && candidate.contactMethod) {
    return { score: max, max, reasons: [`Direct contact method available (${candidate.contactMethod}).`] };
  }
  const channelCount = Object.values(signal.channels).filter(Boolean).length;
  if (channelCount >= 2) {
    return { score: 6, max, reasons: ["No direct contact link, but multiple public community channels are available to reach out through."] };
  }
  if (channelCount === 1) return { score: 3, max, reasons: ["Only one public channel found."] };
  return { score: 0, max, reasons: ["No way to identify or reach this project was found."] };
}

export function scoreFirmographicLead(candidate: Candidate, signal: FirmographicSignal): { breakdown: ScoreBreakdown } {
  const buyingIntent = scorePropensity(signal);
  const serviceFit = scoreServiceFit(signal);
  const projectRelevance = scoreProjectRelevance(candidate, signal);
  const budgetPotential = scoreBudgetPotential(signal);
  const projectActivity = scoreProjectActivity(signal);
  const contactability = scoreContactability(candidate, signal);

  const total = clamp(
    buyingIntent.score + serviceFit.score + projectRelevance.score + budgetPotential.score + projectActivity.score + contactability.score,
    100,
  );

  return { breakdown: { buyingIntent, serviceFit, projectRelevance, budgetPotential, projectActivity, contactability, total } };
}

/** Mirrors tools/score.ts's `buildEvidence`, but for firmographic
 * candidates: every item is a verifiable FACT about the project (from the
 * CoinGecko API response), never a quote of something the prospect said —
 * because nothing was said. Capped at 3 for UI consistency with the
 * text-based path. */
export function buildFirmographicEvidence(candidate: Candidate, signal: FirmographicSignal): EvidenceItem[] {
  const evidence: EvidenceItem[] = [];
  const kindLabel = signal.projectType === "memecoin" ? "Memecoin" : "NFT";

  evidence.push({
    quote:
      `${kindLabel} project listed on CoinGecko` +
      (signal.category ? ` under category "${signal.category}"` : "") +
      (signal.listedAt ? `, added ${new Date(signal.listedAt).toLocaleDateString()}` : "") +
      ".",
    sourceUrl: candidate.sourceUrl,
  });

  const channelNames = Object.entries(signal.channels)
    .filter(([, v]) => v)
    .map(([k]) => k);
  if (channelNames.length > 0) {
    evidence.push({ quote: `Official channels present: ${channelNames.join(", ")}.`, sourceUrl: candidate.sourceUrl });
  }

  if (signal.marketCapUsd != null) {
    evidence.push({ quote: `Market cap: ~$${Math.round(signal.marketCapUsd).toLocaleString()} (CoinGecko).`, sourceUrl: candidate.sourceUrl });
  } else if (signal.activityUsd != null) {
    evidence.push({ quote: `24h trading volume: ~$${Math.round(signal.activityUsd).toLocaleString()} (CoinGecko).`, sourceUrl: candidate.sourceUrl });
  }

  return evidence.slice(0, 3);
}

/** buyingIntent enum output for AnalyzedLead — deliberately never "high":
 * that value is reserved for sources where the prospect explicitly said
 * they want to hire someone (see tools/qualify.ts). A firmographic lead's
 * propensity score can still be strong enough to reach "qualified"
 * overall (via serviceFit/budget/activity/contactability), it just never
 * claims to have found an expressed hiring intent it didn't. */
export function firmographicBuyingIntent(propensityScore: number, max: number): AiBuyingIntent {
  const fraction = max > 0 ? propensityScore / max : 0;
  if (fraction >= 0.7) return "medium";
  if (fraction >= 0.35) return "low";
  return "none";
}
