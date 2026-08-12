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
// CoinGecko for literally-newest NFT collections. `firmographic.listedAt`
// is always null here, and tools/scoreFirmographic.ts never pretends
// otherwise (it falls back to trading-volume-as-activity and says so in
// its own reasons).
//
// Tuning note (13 Agustus 2026 — first real run returned 0 candidates):
// the original version sorted by ASCENDING market cap as a proxy for
// "small/emerging" — that was a bug, not just a strict filter: ascending
// market cap surfaces CoinGecko's SMALLEST-tracked collections first,
// which in practice are mostly dead/delisted/spam entries with zero
// trading activity and no social links at all, not real emerging
// projects. Switched to sorting by DESCENDING 24h volume instead — that
// surfaces collections with real, current trading activity first, which
// is a much better proxy for "an actual active community" than market
// cap ever was. Also widened the scan window and required only Twitter OR
// Discord (not both) alongside a website, matching the same leniency the
// memecoin provider's "Telegram or Discord" rule already had — requiring
// literally all three social links was this file's own extra-strict
// choice, not something explicitly decided for this source.
const PAGE_SIZE = 50;
const MAX_DETAIL_CALLS = 40;
const DETAIL_CONCURRENCY = 10;
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
    "NFT collections with real recent trading activity (CoinGecko public API) and a website + X/Discord presence " +
    "— a likely-needs-animation prospecting list (trailers, motion graphics), not an expressed request. CoinGecko " +
    "has no listing-date field for NFTs, so \"emerging\" is approximated by recent trading volume, not launch " +
    "date. Data via CoinGecko (coingecko.com), attribution shown on every lead from this source.";

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
        order: "h24_volume_usd_desc",
        per_page: PAGE_SIZE,
        page: 1,
      })) as CoinGeckoNftListItem[];
    } catch (error) {
      throw new Error(`CoinGecko NFT list failed: ${error instanceof Error ? error.message : String(error)}`);
    }

    const candidates: Candidate[] = [];
    const toCheck = list.slice(0, MAX_DETAIL_CALLS);

    for (let i = 0; i < toCheck.length && candidates.length < params.limit; i += DETAIL_CONCURRENCY) {
      const batch = toCheck.slice(i, i + DETAIL_CONCURRENCY);
      const results = await Promise.all(
        batch.map(async (item) => {
          try {
            const detail = (await coinGeckoFetch(`/nfts/${item.id}`)) as CoinGeckoNftDetail;
            return { item, detail };
          } catch {
            return null;
          }
        }),
      );

      for (const entry of results) {
        if (!entry) continue;
        if (candidates.length >= params.limit) break;
        const { item, detail } = entry;

        const website = detail.links?.homepage ?? null;
        const twitter = detail.links?.twitter ?? null;
        const discord = detail.links?.discord ?? null;
        const volume24hUsd = detail.volume_24h?.usd ?? null;

        const channels = { website: Boolean(website), twitter: Boolean(twitter), telegram: false, discord: Boolean(discord) };

        // Filter for this source: website + (Twitter or Discord) + real
        // recent trading volume.
        if (!(channels.website && (channels.twitter || channels.discord))) continue;
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

        const channelList = Object.entries(channels)
          .filter(([, v]) => v)
          .map(([k]) => k)
          .join(", ");
        const text =
          `${detail.name} is an NFT collection on CoinGecko with official channels (${channelList}) and ` +
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
    }

    return candidates;
  }
}
