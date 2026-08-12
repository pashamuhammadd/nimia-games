import type { Candidate, EvidenceItem, ScoreBreakdown, ScoreFactor } from "../types";
import { SCORE_MAX } from "../constants";
import { detectAnimationServices, hasGenericAnimationSignal, type AnimationServiceMatch } from "../knowledge/animation-services";
import type { QualificationSignal } from "./qualify";
import type { ExtractedInfo } from "./extract";
import { findMatchingSentences } from "./text";

// Tool: score_lead — the transparent, deterministic 0-100 scoring engine
// (brief section 6). Every factor below returns its own {score, max,
// reasons[]} so the UI can render the exact same breakdown shown in the
// brief's example ("Buying Intent: 28/30", ...), and so the number is
// reproducible from the same inputs rather than depending on an LLM call
// that might answer differently next time. An optional AI provider (see
// ../provider.ts) may later be layered in to write a nicer prose
// explanation, but it is never allowed to change these numbers — see
// ../orchestrator.ts.

function clamp(n: number, max: number): number {
  return Math.max(0, Math.min(max, Math.round(n)));
}

function scoreBuyingIntent(signal: QualificationSignal): ScoreFactor {
  const max = SCORE_MAX.buyingIntent;
  let score = 0;
  const reasons = [...signal.intentReasons];

  switch (signal.buyingIntent) {
    case "high":
      score = 26;
      break;
    case "medium":
      score = 17;
      break;
    case "low":
      score = 9;
      break;
    case "none":
    default:
      score = 0;
      break;
  }

  // Small bonus for first-person plural framing ("we need", "our team")
  // — usually signals an organized project rather than a lone curious
  // individual, on top of whatever hiring language already scored above.
  if (score > 0 && signal.matchedStrongSentence) {
    const lower = signal.matchedStrongSentence.toLowerCase();
    if (lower.includes("we ") || lower.includes("our ")) {
      score += 3;
      reasons.push('Framed as a team/organization request ("we"/"our"), not just personal curiosity.');
    }
  }

  return { score: clamp(score, max), max, reasons };
}

function scoreServiceFit(matches: AnimationServiceMatch[], text: string): ScoreFactor {
  const max = SCORE_MAX.serviceFit;
  const reasons: string[] = [];

  if (matches.length === 0) {
    if (hasGenericAnimationSignal(text)) {
      reasons.push('Mentions animation generally, but no specific Nimia service category matched (e.g. "needs an animator" with no further detail).');
      return { score: clamp(10, max), max, reasons };
    }
    reasons.push("No animation-related service keywords detected — does not appear to be a fit for Nimia's services.");
    return { score: 0, max, reasons };
  }

  const top = matches[0];
  reasons.push(`Matches Nimia's "${top.category.label}" service (keyword${top.matchedKeywords.length > 1 ? "s" : ""}: ${top.matchedKeywords.join(", ")}).`);
  let score = 15 + top.matchedKeywords.length * 3;

  if (matches.length > 1) {
    reasons.push(`Also touches "${matches[1].category.label}".`);
    score += 3;
  }

  return { score: clamp(score, max), max, reasons };
}

function scoreProjectRelevance(candidate: Candidate, text: string): ScoreFactor {
  const max = SCORE_MAX.projectRelevance;
  let score = 3; // baseline: a post about SOME project, however vague
  const reasons: string[] = [];

  if (candidate.projectUrl) {
    score += 6;
    reasons.push("Links to a real, identifiable project/product.");
  }
  if (candidate.prospectName) {
    score += 3;
    reasons.push(`Associated with a named project/team ("${candidate.prospectName}").`);
  }

  const concretenessHits = findMatchingSentences(text, [
    "our game",
    "our project",
    "our studio",
    "our app",
    "launching",
    "launch",
    "beta",
    "steam",
    "our team",
  ]);
  if (concretenessHits.length > 0) {
    score += 3;
    reasons.push("Describes a concrete, in-progress project rather than a hypothetical one.");
  }

  if (reasons.length === 0) {
    reasons.push("Limited detail about the underlying project — relevance is uncertain.");
  }

  return { score: clamp(score, max), max, reasons };
}

function scoreBudgetPotential(extracted: ExtractedInfo): ScoreFactor {
  const max = SCORE_MAX.budgetPotential;
  const reasons: string[] = [];

  if (!extracted.budgetInformation) {
    reasons.push("No budget information mentioned.");
    return { score: 2, max, reasons };
  }

  const amounts = extracted.budgetInformation.match(/\d[\d,]*/g)?.map((n) => Number(n.replace(/,/g, ""))) ?? [];
  const highestAmount = amounts.length > 0 ? Math.max(...amounts) : null;

  if (highestAmount != null) {
    reasons.push(`Explicit budget mentioned: "${extracted.budgetInformation}".`);
    if (highestAmount >= 1000) return { score: max, max, reasons };
    if (highestAmount >= 500) return { score: 8, max, reasons };
    if (highestAmount >= 200) return { score: 6, max, reasons };
    return { score: 4, max, reasons };
  }

  reasons.push(`Budget mentioned but unspecified: "${extracted.budgetInformation}".`);
  return { score: 5, max, reasons };
}

function scoreProjectActivity(candidate: Candidate, extracted: ExtractedInfo): ScoreFactor {
  const max = SCORE_MAX.projectActivity;
  let score = 4;
  const reasons: string[] = [];

  if (candidate.postedAt) {
    const ageHours = (Date.now() - new Date(candidate.postedAt).getTime()) / (1000 * 60 * 60);
    if (Number.isFinite(ageHours)) {
      if (ageHours <= 24) {
        score += 4;
        reasons.push("Posted within the last 24 hours — highly active lead.");
      } else if (ageHours <= 24 * 7) {
        score += 2;
        reasons.push("Posted within the last week.");
      } else {
        reasons.push("Posted more than a week ago — may be stale.");
      }
    }
  } else {
    reasons.push("No timestamp available to judge recency.");
  }

  if (extracted.deadlineInformation) {
    score += 2;
    reasons.push(`States a timeline: "${extracted.deadlineInformation}".`);
  }

  return { score: clamp(score, max), max, reasons };
}

function scoreContactability(extracted: ExtractedInfo, candidate: Candidate): ScoreFactor {
  const max = SCORE_MAX.contactability;
  const reasons: string[] = [];

  if (extracted.contactUrl && extracted.contactMethod) {
    reasons.push(`Direct contact method available (${extracted.contactMethod}).`);
    return { score: max, max, reasons };
  }
  if (candidate.username) {
    reasons.push("No direct contact link, but a public username/handle is available to reach out through.");
    return { score: 6, max, reasons };
  }
  if (candidate.sourceUrl) {
    reasons.push("No contact info found — could only be reached by replying publicly on the source page.");
    return { score: 3, max, reasons };
  }
  reasons.push("No way to identify or reach this prospect was found.");
  return { score: 0, max, reasons };
}

export function scoreLead(
  candidate: Candidate,
  signal: QualificationSignal,
  extracted: ExtractedInfo,
): { breakdown: ScoreBreakdown; serviceMatches: AnimationServiceMatch[] } {
  const text = candidate.text;
  const serviceMatches = detectAnimationServices(text);

  const buyingIntent = scoreBuyingIntent(signal);
  const serviceFit = scoreServiceFit(serviceMatches, text);
  const projectRelevance = scoreProjectRelevance(candidate, text);
  const budgetPotential = scoreBudgetPotential(extracted);
  const projectActivity = scoreProjectActivity(candidate, extracted);
  const contactability = scoreContactability(extracted, candidate);

  const total = clamp(
    buyingIntent.score +
      serviceFit.score +
      projectRelevance.score +
      budgetPotential.score +
      projectActivity.score +
      contactability.score,
    100,
  );

  return {
    breakdown: { buyingIntent, serviceFit, projectRelevance, budgetPotential, projectActivity, contactability, total },
    serviceMatches,
  };
}

/** Builds the evidence list (brief section 8) — every quote is a
 * VERBATIM substring of candidate.text, never paraphrased or invented.
 * Returns an empty array (never a made-up quote) when nothing in the
 * text actually supports the qualification — callers must treat an empty
 * array as "Insufficient evidence" and score/qualify accordingly. */
export function buildEvidence(candidate: Candidate, signal: QualificationSignal, serviceMatches: AnimationServiceMatch[]): EvidenceItem[] {
  const evidence: EvidenceItem[] = [];
  const seen = new Set<string>();

  const add = (quote: string | null) => {
    if (!quote) return;
    const trimmed = quote.trim();
    if (!trimmed || seen.has(trimmed)) return;
    seen.add(trimmed);
    evidence.push({ quote: trimmed, sourceUrl: candidate.sourceUrl });
  };

  add(signal.matchedStrongSentence);
  if (evidence.length === 0) add(signal.matchedWeakSentence);

  if (serviceMatches.length > 0) {
    const hit = findMatchingSentences(candidate.text, serviceMatches[0].matchedKeywords)[0];
    add(hit?.sentence ?? null);
  }

  return evidence.slice(0, 3);
}
