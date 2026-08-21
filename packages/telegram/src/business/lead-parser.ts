// Pure text parsing — no fetch, no DB, no Telegram-specific types. Kept
// as its own module so it's trivially unit-testable and so it's the one
// obvious place a FUTURE AI Layer (brief §10, "menyediakan fondasi agar
// chatbot nantinya dapat diintegrasikan dengan AI Agent Nimia Studio")
// swaps in for — see ai.ts, which wraps this behind an interface the
// rest of the app depends on instead of calling detectBudgetInText
// directly.

/** Heuristic budget detector — brief §3: "mencoba mendeteksi budget dari
 * pesan. Jika budget tidak ditemukan, jangan langsung membuat flow
 * panjang." Deliberately simple regex, not NLP/AI (brief §10 asks for a
 * FOUNDATION for AI, not AI active in v1) — good enough to catch the
 * overwhelmingly common ways someone states a budget in one sentence
 * ("$150", "around 200 USD", "budget: 500-800"), while erring toward
 * false negatives (missing a budget) rather than false positives
 * (misreading part of the brief as a budget) — a false negative just
 * costs one extra follow-up question (buildBudgetFollowUpMessage), a
 * false positive would silently record the wrong number as
 * expected_budget with no chance to correct it. Returns the matched
 * substring VERBATIM (not normalized/parsed to a number) since
 * expected_budget (migration 0055) is free text by design — Pasha reads
 * it, nothing in this codebase does arithmetic on it. */
export function detectBudgetInText(text: string): string | null {
  const patterns: RegExp[] = [
    // $150, $1,200, $150-$300, $150 - 300
    /\$\s?\d[\d,]*(?:\.\d+)?(?:\s?-\s?\$?\s?\d[\d,]*(?:\.\d+)?)?/,
    // 150 usd, 1200 dollars
    /\b\d[\d,]*(?:\.\d+)?\s?(?:usd|dollars?)\b/i,
    // "budget is/around/of ~150" / "budget: 150-300"
    /\bbudget\b[^\d]{0,20}\d[\d,]*(?:\.\d+)?(?:\s?-\s?\d[\d,]*(?:\.\d+)?)?/i,
    // Indonesian-language prospects sometimes write "sekitar 150"
    /\bsekitar\b[^\d]{0,10}\d[\d,]*(?:\.\d+)?/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[0].trim();
  }
  return null;
}
