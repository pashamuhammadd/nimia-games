import type { Candidate, DiscoveryParams, DiscoverySource, FirmographicSignal } from "../types";
import { coinGeckoFetch, isCoinGeckoConfigured, coinGeckoNotConfiguredReason } from "./coingecko-client";

// CoinGecko "emerging NFT collection" discovery provider — LIVE as of 12
// Agustus 2026. See coingecko-memecoin-provider.ts's header comment for
// the shared commercial-use/attribution notes; this file only covers
// what's specific to NFTs.
//
// IMPORTANT LIMITATION: CoinGecko's NFT API has no "listed_at"/"added"
// date field (unlike /coins/list/new for coins) — see
// docs.coingecko.com/reference/nfts-list. There is no way to ask
// CoinGecko for literally-newest NFT collections. As a proxy for
// "emerging" (as opposed to an already-huge, established collection),
// this sorts by ascending market cap and requires real recent trading
// volume (proof the project is alive, not abandoned). That is an
// approximation, NOT a real launch date — this candidate's
// `firmographic.listedAt` is always null, and tools/scoreFirmographic.ts
// never pretends otherwise (it falls back to trading-volume-as-activity
// and says so in its own reasons).
const PAGE_SIZE = 50;
const MAX_DETAIL_CALLS = 20;
const MIN_24H_VOLUME_USD = 50;

type CoinGeckoNftListItem = { id: string; name: string; symbol: string; asset_platform_id: string };

type CoinGeckoNftDetail = {
  id: string;
  name: string;
  links?: { homepage?: string | null; twitter?: string | null; discord?: string | null };
  market_cap?: { usd?: number | null };
  volume_24h?: { usd?: number | null };
};

function twitterHandleFromUrl(url: string | null): string | null {
  if (!url) return null;
  const match = url.match(/(?:twitter|x)\.com\/([a-z0-9_]+)/i);
  return match ? `@${match[1]}` : null;
}

export class CoinGeckoNftDiscoveryProvider implements DiscoverySource {
  id = "coingecko-nft";
  label = "CoinGecko — Emerging NFT Collections";
  description =
    "Smaller NFT collections (CoinGecko public API) with real recent trading activity and a website/X/Discord " +
    "presence — a likely-needs-animation prospecting list (trailers, motion graphics), not an expressed request. " +
    "CoinGecko has no listing-date field for NFTs, so \"emerging\" is approximated by market cap + activity, not " +
    "launch date. Data via CoinGecko (coingecko.com), attribution shown on every lead from this source.";

  isConfigured(): boolean {
    return isCoinGeckoConfigured();
  }

  notConfiguredReason(): string {
    return coinGeckoNotConfiguredReason();
  }

  async discover(params: DiscoveryParams): Promise<Candidate[]> {
    if (!this.isConfigured()) return [];

    let list: CoinGeckoNftListItem[];
    try {
      list = (await coinGeckoFetch("/nfts/list", {
        order: "market_cap_usd_asc",
        per_page: PAGE_SIZE,
        page: 1,
      })) as CoinGeckoNftListItem[];
    } catch (error) {
      throw new Error(`CoinGecko NFT list failed: ${error instanceof Error ? error.message : String(error)}`);
    }

    const candidates: Candidate[] = [];
    const toCheck = list.slice(0, MAX_DETAIL_CALLS);

    for (const item of toCheck) {
      if (candidates.length >= params.limit) break;

      let detail: CoinGeckoNftDetail;
      try {
        detail = (await coinGeckoFetch(`/nfts/${item.id}`)) as CoinGeckoNftDetail;
      } catch {
        continue;
      }

      const website = detail.links?.homepage ?? null;
      const twitter = detail.links?.twitter ?? null;
      const discord = detail.links?.discord ?? null;
      const volume24hUsd = detail.volume_24h?.usd ?? null;

      const channels = { website: Boolean(website), twitter: Boolean(twitter), telegram: false, discord: Boolean(discord) };

      // Filter decided for this source: website + Twitter + Discord —
      // CoinGecko's NFT endpoint doesn't expose Telegram at all, so
      // there's no "Telegram or Discord" fallback here like the memecoin
      // provider has.
      if (!(channels.website && channels.twitter && channels.discord)) continue;
      if (!volume24hUsd || volume24hUsd < MIN_24H_VOLUME_USD) continue;

      const marketCapUsd = detail.market_cap?.usd ?? null;
      const firmographic: FirmographicSignal = {
        projectType: "nft",
        category: null,
        listedAt: null,
        channels,
        marketCapUsd,
        activityUsd: volume24hUsd,
      };

      const text =
        `${detail.name} is an NFT collection on CoinGecko with an official website, X, and Discord, and ` +
        `~$${Math.round(volume24hUsd).toLocaleString()} in trading volume over the last 24h — an active, real ` +
        `community.`;

      candidates.push({
        discoverySourceId: this.id,
        platform: "CoinGecko NFT",
        externalId: item.id,
        username: twitterHandleFromUrl(twitter),
        prospectName: detail.name,
        title: detail.name,
        text,
        sourceUrl: `https://www.coingecko.com/en/nft/${item.id}`,
        projectUrl: website,
        postedAt: null,
        contactMethod: twitter ? "twitter" : "discord",
        contactUrl: twitter ?? discord,
        isDemo: false,
        firmographic,
      });
    }

    return candidates;
  }
}
