import type { Candidate } from "../types";

// Tool: check_duplicate — two layers of dedup, matching the brief's "A
// prospect found multiple times should not create multiple identical
// lead records":
//
//   1. WITHIN a single run: dedupeCandidatesInBatch below, before any
//      analysis work is even done (cheapest place to drop a repeat).
//   2. ACROSS runs: the database's own unique index on
//      ai_leads.dedupe_key (packages/db/migrations/0039) — tools/save.ts
//      upserts on that key, so re-discovering the same prospect on a
//      later run updates the existing row (fresh score, fresh
//      last_updated, a new ai_lead_sources trail entry) instead of
//      inserting a duplicate.
//
// The key itself is intentionally simple and platform+identity based —
// see this file's own buildDedupeKey — rather than a fuzzy text-similarity
// match, so it stays predictable and explainable rather than occasionally
// merging two different people who happened to write similar posts.
export function buildDedupeKey(candidate: Candidate): string {
  const identity = (candidate.username || candidate.sourceUrl || candidate.prospectName || candidate.externalId || "unknown")
    .toLowerCase()
    .trim();
  return `${candidate.platform.toLowerCase().trim()}:${identity}`;
}

export function dedupeCandidatesInBatch(candidates: Candidate[]): Candidate[] {
  const seen = new Set<string>();
  const result: Candidate[] = [];
  for (const candidate of candidates) {
    const key = buildDedupeKey(candidate);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(candidate);
  }
  return result;
}
