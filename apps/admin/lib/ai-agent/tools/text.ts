// Small shared text helpers used by every tool in this directory — kept
// separate from any one tool so extract/qualify/score can all quote the
// exact same sentence boundaries when pulling evidence, rather than each
// re-implementing slightly different splitting logic.

/** Splits on sentence-ending punctuation followed by whitespace, or a
 * newline — good enough for the informal, short prospect text this
 * pipeline deals with (Reddit posts, job listings). Deliberately not a
 * real NLP sentence tokenizer; this only needs to produce verbatim
 * substrings of the original text for evidence quoting, not linguistic
 * correctness. */
export function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Returns every sentence containing at least one of `patterns` (case
 * insensitive substring match), each paired with which pattern(s) hit —
 * used both to build evidence quotes and to explain a score factor's
 * reasons in the exact caller's own words. */
export function findMatchingSentences(
  text: string,
  patterns: string[],
): { sentence: string; matched: string[] }[] {
  const sentences = splitSentences(text);
  const results: { sentence: string; matched: string[] }[] = [];

  for (const sentence of sentences) {
    const lower = sentence.toLowerCase();
    const matched = patterns.filter((p) => lower.includes(p.toLowerCase()));
    if (matched.length > 0) {
      results.push({ sentence, matched });
    }
  }

  return results;
}

export function countMatches(text: string, patterns: string[]): number {
  const lower = text.toLowerCase();
  return patterns.filter((p) => lower.includes(p.toLowerCase())).length;
}

export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1).trimEnd()}…`;
}
