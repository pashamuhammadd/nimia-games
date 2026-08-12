import type { AiBuyingIntent } from "../types";
import { findMatchingSentences } from "./text";

// Tool: analyze_lead (buying-intent half) — classifies how strongly a
// candidate's text expresses actual intent to HIRE someone, as opposed to
// merely mentioning animation. This is the guard against the brief's
// "TRUE PROSPECT vs POSSIBLE PROSPECT vs NOT A PROSPECT" examples —
// keyword-matching alone (e.g. the word "animation" appearing) is
// explicitly NOT enough; see NEGATIVE_PATTERNS and the question-only
// check below, both aimed straight at the brief's own non-prospect
// examples ("check out this animation I found", "how do I make an
// animation in Blender?").

const STRONG_INTENT_PATTERNS = [
  "looking for an animator",
  "looking for a 2d animator",
  "looking for a freelance animator",
  "need an animator",
  "need someone to animate",
  "need someone to create",
  "hiring an animator",
  "looking to hire",
  "seeking an animator",
  "need animation for",
  "willing to pay",
  "budget is",
  "we need",
  "we're looking for",
  "we are looking for",
  "please apply",
  "send your rate",
  "paid position",
  "paid work",
  "commission",
];

const WEAK_INTENT_PATTERNS = [
  "will probably need",
  "might need",
  "planning to get",
  "eventually need",
  "thinking about getting",
  "considering hiring",
  "will need animation",
  "probably need",
  "exploring options for",
  "maybe next year",
  "down the line",
  "once we",
  "not sure on exact budget",
];

// Phrases that strongly indicate this is NOT a prospect at all — sharing/
// appreciating existing work, or asking a how-to/learning question,
// rather than wanting to commission anything.
const NEGATIVE_PATTERNS = [
  "check out this",
  "just sharing",
  "just stumbled across",
  "fan art i made",
  "look at this cool",
  "any recommendations for learning",
  "tutorial recommendations",
  "struggling with",
  "total beginner",
  "just curious",
  "not working on anything",
  "not looking to hire",
];

const QUESTION_LEAD_INS = ["how do i", "how to", "what is the best way to", "any tips on", "does anyone know how"];

export type QualificationSignal = {
  buyingIntent: AiBuyingIntent;
  isLikelyNotAProspect: boolean;
  intentReasons: string[];
  matchedStrongSentence: string | null;
  matchedWeakSentence: string | null;
  matchedNegativeSentence: string | null;
};

export function classifyBuyingIntent(text: string): QualificationSignal {
  const lower = text.toLowerCase();

  const strongHits = findMatchingSentences(text, STRONG_INTENT_PATTERNS);
  const weakHits = findMatchingSentences(text, WEAK_INTENT_PATTERNS);
  const negativeHits = findMatchingSentences(text, NEGATIVE_PATTERNS);

  // A post that is ENTIRELY a how-to/learning question, with no hiring
  // language at all, is the brief's "how do I make an animation in
  // Blender?" case — not a prospect regardless of any animation keyword
  // it also happens to contain.
  const startsWithQuestion = QUESTION_LEAD_INS.some((q) => lower.trimStart().startsWith(q));
  const isQuestionOnly = startsWithQuestion && strongHits.length === 0 && weakHits.length === 0;

  const isLikelyNotAProspect = isQuestionOnly || (negativeHits.length > 0 && strongHits.length === 0 && weakHits.length === 0);

  let buyingIntent: AiBuyingIntent = "none";
  const intentReasons: string[] = [];

  if (isLikelyNotAProspect) {
    buyingIntent = "none";
    if (isQuestionOnly) {
      intentReasons.push("Reads as a how-to/learning question, not a request to hire.");
    }
    if (negativeHits.length > 0) {
      intentReasons.push("Reads as sharing/appreciating existing work, not a commission request.");
    }
  } else if (strongHits.length >= 2) {
    buyingIntent = "high";
    intentReasons.push(`${strongHits.length} explicit hiring phrases found (e.g. "${strongHits[0].sentence}").`);
  } else if (strongHits.length === 1) {
    buyingIntent = "high";
    intentReasons.push(`Explicit hiring language found: "${strongHits[0].sentence}"`);
  } else if (weakHits.length > 0) {
    buyingIntent = "medium";
    intentReasons.push(`Tentative/future hiring language found: "${weakHits[0].sentence}"`);
  } else {
    buyingIntent = "none";
    intentReasons.push("No hiring or commissioning language detected.");
  }

  // A weak-only signal alongside no strong signal but SOME animation
  // context still counts as "low" rather than "none" once serviceFit is
  // known — score.ts handles that nuance; here we only ever report what
  // the text itself says about intent.
  if (buyingIntent === "medium" && weakHits.length === 1 && strongHits.length === 0) {
    buyingIntent = "low";
  }

  return {
    buyingIntent,
    isLikelyNotAProspect,
    intentReasons,
    matchedStrongSentence: strongHits[0]?.sentence ?? null,
    matchedWeakSentence: weakHits[0]?.sentence ?? null,
    matchedNegativeSentence: negativeHits[0]?.sentence ?? null,
  };
}
