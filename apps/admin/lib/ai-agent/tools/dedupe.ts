import type { DiscoveredProject } from "../types";

// Tool: check_duplicate — two layers of dedup, same reasoning the retired
// "AI Client Hunter" used:
//
//   1. WITHIN a single run: dedupeProjectsInBatch below (a project can
//      appear in more than one requested category, e.g. a title tagged
//      both "Gaming" and "Metaverse").
//   2. ACROSS runs: the database's own unique index on
//      ai_projects.coingecko_id (packages/db/migrations/0040) —
//      tools/save.ts upserts on that key, so re-discovering the same
//      project on a later run refreshes the existing row (fresh market
//      data, fresh analysis) instead of inserting a duplicate.
//
// V2's dedupe key is simpler than V1's: CoinGecko is the only discovery
// source, so its own project ID is already a stable, natural identity —
// no need for V1's platform+username/URL fallback chain.
export function buildDedupeKey(project: DiscoveredProject): string {
  return project.coingeckoId.toLowerCase().trim();
}

export function dedupeProjectsInBatch(projects: DiscoveredProject[]): DiscoveredProject[] {
  const seen = new Set<string>();
  const result: DiscoveredProject[] = [];
  for (const project of projects) {
    const key = buildDedupeKey(project);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(project);
  }
  return result;
}
