import type { Candidate } from "../types";
import { findMatchingSentences } from "./text";

// Tool: extract_project_information — pulls budget/deadline/contact
// signals out of a candidate's raw text via plain regex/keyword matching.
// Deliberately conservative: this only ever returns text that actually
// appears in `candidate.text` (or structured fields the discovery source
// already supplied), never an inference dressed up as a fact — e.g. it
// will not guess a dollar figure from vague language like "reasonable
// budget", it just surfaces the sentence itself and lets the scoring
// engine (tools/score.ts) treat "budget mentioned but unspecified" as its
// own, lower-confidence signal.

const CURRENCY_AMOUNT_RE = /\$\s?\d[\d,]*(?:\.\d+)?(?:\s?[-–]\s?\$?\d[\d,]*(?:\.\d+)?)?|\d[\d,]*\s?(?:usd|usdc|usdt)\b/gi;

const VAGUE_BUDGET_PATTERNS = [
  "budget flexible",
  "budget is flexible",
  "flexible budget",
  "paying well",
  "willing to pay",
  "not sure on exact budget",
  "no budget",
  "no fixed budget",
  "budget tbd",
  "open to quotes",
  "send your rate",
  "paid position",
  "paid work",
];

const DEADLINE_PATTERNS = [
  "asap",
  "as soon as possible",
  "deadline",
  "by next",
  "within the next",
  "within 1 week",
  "within 2 weeks",
  "within 3 weeks",
  "within 4 weeks",
  "before our launch",
  "before launch",
  "next week",
  "next month",
  "this month",
  "in 2 weeks",
  "in a few weeks",
  "in a couple of weeks",
  "ongoing work",
  "urgent",
];

const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;
const DISCORD_INVITE_RE = /discord\.gg\/[a-z0-9-]+/i;
const TELEGRAM_HANDLE_RE = /(?:^|\s)@[a-z0-9_]{4,}/i;
const DM_PHRASE_RE = /\bdm me\b|\bmessage me\b|\breply here\b|\bpm me\b/i;

export type ExtractedInfo = {
  budgetInformation: string | null;
  deadlineInformation: string | null;
  contactMethod: string | null;
  contactUrl: string | null;
};

export function extractProjectInformation(candidate: Candidate): ExtractedInfo {
  const text = candidate.text;

  // Budget — prefer an explicit currency amount (verbatim regex match),
  // fall back to a "vague but present" budget sentence, else null.
  let budgetInformation: string | null = null;
  const amountMatches = text.match(CURRENCY_AMOUNT_RE);
  if (amountMatches && amountMatches.length > 0) {
    budgetInformation = amountMatches.slice(0, 2).join(", ");
  } else {
    const vague = findMatchingSentences(text, VAGUE_BUDGET_PATTERNS);
    if (vague.length > 0) {
      budgetInformation = vague[0].sentence;
    }
  }

  // Deadline — first sentence that mentions urgency/timing language.
  let deadlineInformation: string | null = null;
  const deadlineHits = findMatchingSentences(text, DEADLINE_PATTERNS);
  if (deadlineHits.length > 0) {
    deadlineInformation = deadlineHits[0].sentence;
  }

  // Contact — prefer whatever the discovery source already supplied
  // structurally (it knows its own platform's contact conventions better
  // than a regex on free text ever could); only fall back to scanning
  // the text itself when the source didn't provide one.
  let contactMethod: string | null = candidate.contactMethod ?? null;
  let contactUrl: string | null = candidate.contactUrl ?? null;

  if (!contactMethod) {
    const email = text.match(EMAIL_RE)?.[0] ?? null;
    const discordInvite = text.match(DISCORD_INVITE_RE)?.[0] ?? null;
    const telegramHandle = text.match(TELEGRAM_HANDLE_RE)?.[0]?.trim() ?? null;

    if (email) {
      contactMethod = "email";
      contactUrl = contactUrl ?? `mailto:${email}`;
    } else if (discordInvite) {
      contactMethod = "discord";
      contactUrl = contactUrl ?? `https://${discordInvite}`;
    } else if (telegramHandle) {
      contactMethod = "telegram";
      contactUrl = contactUrl ?? `https://t.me/${telegramHandle.replace("@", "")}`;
    } else if (DM_PHRASE_RE.test(text) && candidate.sourceUrl) {
      contactMethod = "platform_dm";
      contactUrl = contactUrl ?? candidate.sourceUrl;
    }
  }

  return { budgetInformation, deadlineInformation, contactMethod, contactUrl };
}
