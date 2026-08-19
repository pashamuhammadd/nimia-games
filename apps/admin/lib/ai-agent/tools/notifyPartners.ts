import { notifyProspectFound as notifyDiscordProspectFound } from "@nimia/discord";
import { notifyProspectFound as notifyTelegramProspectFound } from "@nimia/telegram";
import type { AnalyzedProject } from "../types";
import { OPPORTUNITY_LEVEL_LABELS, COMMERCIAL_POTENTIAL_LABELS } from "../constants";

// Tool: notify_partners — AI Prospect Hunter partner broadcast (added 19
// Aug 2026). Fired from orchestrator.ts right after saveProject succeeds,
// ONLY for a project that is BOTH newly discovered (saveProject's
// isNewlyDiscovered — see that file's own comment on why this is almost
// always true by the time anything reaches here, since discovery already
// excludes every previously-saved coingecko_id) AND crosses
// constants.ts's PARTNER_NOTIFY_SCORE_THRESHOLD. This is the ONE place in
// the whole pipeline that fans an analyzed project out to BOTH @nimia/
// discord and @nimia/telegram — deliberately independent sends
// (Promise.allSettled, not a sequential await-then-await) so a Telegram
// outage/misconfiguration can never suppress the Discord post or vice
// versa, and this function itself never throws — same "never let a
// notification failure roll back real work" posture as both of those
// packages' own notifyProspectFound (see their notify.ts files' top
// comments). Called for its side effect only; nothing here is awaited by
// anything that needs its result, and a caller that doesn't even await
// this at all would still be safe — but orchestrator.ts does await it, so
// a Vercel serverless invocation doesn't get frozen mid-flight before the
// notification fetches complete (see docs on waitUntil vs. plain await
// inside a route handler's request lifecycle).
export async function notifyPartners(analyzed: AnalyzedProject): Promise<void> {
  const p = analyzed.project;
  const input = {
    name: p.name,
    symbol: p.symbol,
    // The project's own CoinGecko logo — added 20 Aug 2026 per product
    // request ("ada gambarnya yaitu logo projeknya") so both platforms'
    // notify.ts can render it (Discord's embed thumbnail, Telegram's
    // sendPhoto). Never a guessed/generated image — null just means
    // CoinGecko didn't report one for this project, same "never invent a
    // fact" posture as every other field sourced from `p` here.
    logoUrl: p.logoUrl,
    category: p.categories.length > 0 ? p.categories.join(", ") : null,
    opportunityScore: analyzed.opportunityScore,
    opportunityLevel: OPPORTUNITY_LEVEL_LABELS[analyzed.animationOpportunity] ?? analyzed.animationOpportunity,
    commercialPotential: COMMERCIAL_POTENTIAL_LABELS[analyzed.commercialPotential] ?? analyzed.commercialPotential,
    recommendedServices: analyzed.recommendedServices,
    reasoning: analyzed.reasoning,
    marketCapUsd: p.marketCapUsd,
    links: {
      website: p.homepageUrl,
      twitter: p.socialLinks.twitter,
      telegram: p.socialLinks.telegram,
      discord: p.socialLinks.discord,
      coingeckoUrl: buildCoingeckoUrl(p.coingeckoId),
    },
  };

  const results = await Promise.allSettled([notifyDiscordProspectFound(input), notifyTelegramProspectFound(input)]);
  for (const result of results) {
    if (result.status === "rejected") {
      // Both @nimia/discord and @nimia/telegram's own notifyProspectFound
      // are themselves never-throwing (they catch and console.error
      // internally) — reaching this branch would mean one of them threw
      // anyway (a bug in that package, not an expected API failure), so
      // this is a deliberate second safety net, not the primary error path.
      console.error("[ai-agent] notifyPartners: an unexpected notify failure escaped a package's own safeSend", result.reason);
    }
  }
}

/** CoinGecko coin pages and NFT collection pages live under different URL
 * paths — mirrors discovery/coingecko-project-provider.ts's `nft:{id}`
 * prefix convention (see that file's CoinGeckoNftDiscoveryProvider.discover
 * and types.ts's DiscoveryParams.excludeCoingeckoIds comment) for telling
 * the two apart from a single coingeckoId string. */
function buildCoingeckoUrl(coingeckoId: string): string {
  if (coingeckoId.startsWith("nft:")) {
    return `https://www.coingecko.com/en/nft/${coingeckoId.slice("nft:".length)}`;
  }
  return `https://www.coingecko.com/en/coins/${coingeckoId}`;
}
