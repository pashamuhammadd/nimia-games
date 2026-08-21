// Gate for whether the Business Sales Assistant is allowed to engage a
// BRAND NEW contact at all. Added 21 Agustus 2026 per Pasha's own
// feedback after testing: once this bot is connected to his personal
// Telegram Business account, EVERY message he receives (not just
// prospects who clicked his Business Chat Link) flows through the same
// business_message webhook — ordinary personal contacts, existing
// clients messaging about something else, anyone. Without this gate the
// bot would greet all of them with the sales menu, which is exactly the
// "feels like a stiff Telegram bot, not a professional assistant"
// experience the brief's own §22 explicitly warns against.
//
// The brief's own §2 already specifies the EXACT opening line the
// Business Chat Link pre-fills for a prospect:
//   "Hi Pasha, I'm interested in Nimia Studio. I'd like to discuss a
//   project."
// This module is what recognizes that specific line (and only that
// line) as "yes, this is a real inbound sales inquiry, the bot may
// engage" — everything else reaching Pasha's Business account is left
// completely alone: no lead row created, no reply sent, nothing. This
// check ONLY ever runs for a Telegram user id that has NO existing lead
// row yet (see apps/miniapp/app/api/telegram/business/webhook/route.ts's
// handleBusinessMessage) — once a real conversation has started, every
// later message from that same person is handled normally regardless of
// content, this gate is purely the front door.

/** The exact copy the Business Chat Link is expected to pre-fill (brief
 * §2). Kept as one named constant, not inlined into the matcher below,
 * so updating Pasha's actual Business Chat Link text later only means
 * changing this one line. */
export const BUSINESS_CHAT_LINK_TRIGGER = "Hi Pasha, I'm interested in Nimia Studio. I'd like to discuss a project.";

// Deliberately fuzzy, not a byte-exact comparison — a prospect can tap
// the pre-filled text and still have their keyboard app auto-capitalize
// something differently, swap a straight apostrophe for a curly one, or
// tap send a beat too early/late while editing. Requiring an exact match
// would silently drop real inbound leads over a single stray character.
// The threshold below is deliberately NOT loose enough to match an
// unrelated sentence that merely mentions "Nimia" or "project" — see the
// two-case matching strategy in looksLikeBusinessChatLinkTrigger.

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[‘’ʼ]/g, "'") // curly single quotes/apostrophes -> straight
    .replace(/[“”]/g, '"') // curly double quotes -> straight
    .replace(/\s+/g, " ")
    .trim();
}

function levenshteinDistance(a: string, b: string): number {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const distances: number[][] = Array.from({ length: rows }, () => new Array<number>(cols).fill(0));
  for (let i = 0; i < rows; i++) distances[i][0] = i;
  for (let j = 0; j < cols; j++) distances[0][j] = j;
  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      distances[i][j] =
        a[i - 1] === b[j - 1]
          ? distances[i - 1][j - 1]
          : 1 + Math.min(distances[i - 1][j], distances[i][j - 1], distances[i - 1][j - 1]);
    }
  }
  return distances[a.length][b.length];
}

function similarity(a: string, b: string): number {
  const maxLength = Math.max(a.length, b.length);
  if (maxLength === 0) return 1;
  return 1 - levenshteinDistance(a, b) / maxLength;
}

// How close a normalized message has to be to the normalized trigger
// phrase to count as a match. 0.85 tolerates a missing/extra
// punctuation mark, one swapped word's casing, or a couple of stray
// characters, while still rejecting a genuinely different sentence
// (e.g. a personal contact just saying hi, or an existing client asking
// an unrelated question) — tune this constant if real-world testing
// shows it's too strict/loose for Pasha's actual Business Chat Link
// wording.
const TRIGGER_SIMILARITY_THRESHOLD = 0.85;

/** Returns true only when `rawText` looks like the Business Chat Link's
 * own pre-filled opening line — see this file's top comment for why
 * this exists and where it's called from. Checks two shapes: (1) the
 * WHOLE message closely matches the trigger phrase (the common case —
 * sent unmodified), and (2) the message STARTS WITH something close to
 * the trigger phrase and then continues (a prospect who kept typing
 * before hitting send) — comparing only the leading slice so appended
 * text doesn't dilute the similarity score in case (2). */
export function looksLikeBusinessChatLinkTrigger(rawText: string): boolean {
  const normalizedMessage = normalize(rawText);
  if (!normalizedMessage) return false;
  const normalizedTrigger = normalize(BUSINESS_CHAT_LINK_TRIGGER);

  if (similarity(normalizedMessage, normalizedTrigger) >= TRIGGER_SIMILARITY_THRESHOLD) {
    return true;
  }

  const leadingSlice = normalizedMessage.slice(0, normalizedTrigger.length + 10);
  return similarity(leadingSlice, normalizedTrigger) >= TRIGGER_SIMILARITY_THRESHOLD;
}
