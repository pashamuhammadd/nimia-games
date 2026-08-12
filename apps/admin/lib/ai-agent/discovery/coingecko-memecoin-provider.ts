import type { Candidate, DiscoveryParams, DiscoverySource, FirmographicSignal } from "../types";
import { coinGeckoFetch, findDiscordLink, isCoinGeckoConfigured, coinGeckoNotConfiguredReason } from "./coingecko-client";

// CoinGecko "new memecoin" discovery provider — LIVE as of 12 Agustus
// 2026, via CoinGecko's official public Data API (Demo plan, application
// no-login, read-only — same "official API, not scraping" standard as
// reddit-provider.ts). Added as a commercial-use-safe alternative after
// Reddit's Data API was paused in this app for exactly that reason — see
// reddit-provider.ts's isConfigured() comment and this module's sibling
// coingecko-client.ts for the terms research behind that call.
//
// What this looks for: newly-listed coins (CoinGecko's /coins/list/new
// endpoint) whose CoinGecko category includes "meme", that ALSO have a
// real public presence (website + X/Twitter + at least one of
// Telegram/Discord). Projects like this commonly need launch/marketing
// animation (mascot/meme animation, logo reveal, GIF/sticker packs) even
// though none of them has explicitly asked for it — see
// tools/scoreFirmographic.ts for how that gap is scored and evidenced
// HONESTLY, as an inference, never as a stated request. `serviceFilter`/
// `audienceFilter` (DiscoveryParams) aren't applicable to this source —
// it's category-driven (memecoin), not keyword-search-driven like Reddit.
//
// What this does NOT do, on purpose: guess at a Discord link that isn't
// actually in the API response, claim a market cap CoinGecko didn't
// report, or treat "mentions animation" as evidence — there is no text to
// scan for that here at all, only structured API fields.
const MAX_DETAIL_CALLS = 20;

type CoinGeckoNewCoin = { id: string; symbol: string; name: string; activated_at: number };

type CoinGeckoCoinDetail = {
  id: string;
  categories?: (string | null)[];
  links?: {
    homepage?: string[];
    twitter_screen_name?: string | null;
    telegram_channel_identifier?: string | null;
    chat_url?: string[];
  };
  market_data?: { market_cap?: { usd?: number | null } };
};

export class CoinGeckoMemecoinDiscoveryProvider implements DiscoverySource {
  id = "coingecko-memecoin";
  label = "CoinGecko — New Memecoins";
  description =
    "Newly listed memecoin/meme-token projects (CoinGecko public API) with an active website + X/Telegram/Discord " +
    "presence — a likely-needs-launch-animation prospecting list, not an expressed request. Data via CoinGecko " +
    "(coingecko.com), attribution shown on every lead from this source.";

  isConfigured(): boolean {
    return isCoinGeckoConfigured();
  }

  notConfiguredReason(): string {
    return coinGeckoNotConfiguredReason();
  }

  async discover(params: DiscoveryParams): Promise<Candidate[]> {
    if (!this.isConfigured()) return [];

    let newCoins: CoinGeckoNewCoin[];
    try {
      newCoins = (await coinGeckoFetch("/coins/list/new")) as CoinGeckoNewCoin[];
    } catch (error) {
      throw new Error(`CoinGecko new-coins list failed: ${error instanceof Error ? error.message : String(error)}`);
    }

    const candidates: Candidate[] = [];
    const toCheck = newCoins.slice(0, MAX_DETAIL_CALLS);

    for (const coin of toCheck) {
      if (candidates.length >= params.limit) break;

      let detail: CoinGeckoCoinDetail;
      try {
        detail = (await coinGeckoFetch(`/coins/${coin.id}`, {
          localization: false,
          tickers: false,
          market_data: true,
          community_data: false,
          developer_data: false,
          sparkline: false,
        })) as CoinGeckoCoinDetail;
      } catch {
        // One bad/rate-limited detail call shouldn't sink the whole run.
        continue;
      }

      const categories = (detail.categories ?? []).filter((c): c is string => Boolean(c));
      const memeCategory = categories.find((c) => c.toLowerCase().includes("meme"));
      if (!memeCategory) continue;

      const homepage = detail.links?.homepage?.find((h) => Boolean(h && h.trim())) ?? null;
      const twitterHandle = detail.links?.twitter_screen_name ?? null;
      const telegramChannel = detail.links?.telegram_channel_identifier ?? null;
      const discordLink = findDiscordLink([...(detail.links?.chat_url ?? []), homepage]);

      const channels = {
        website: Boolean(homepage),
        twitter: Boolean(twitterHandle),
        telegram: Boolean(telegramChannel),
        discord: Boolean(discordLink),
      };

      // Filter decided for this source: website + Twitter + (Telegram or
      // Discord) — a project missing these doesn't have enough of a
      // public presence to be worth surfacing as a prospect.
      if (!(channels.website && channels.twitter && (channels.telegram || channels.discord))) continue;

      const marketCapUsd = detail.market_data?.market_cap?.usd ?? null;
      const listedAt = coin.activated_at ? new Date(coin.activated_at * 1000).toISOString() : null;

      const firmographic: FirmographicSignal = {
        projectType: "memecoin",
        category: memeCategory,
        listedAt,
        channels,
        marketCapUsd,
        activityUsd: null,
      };

      const channelList = Object.entries(channels)
        .filter(([, v]) => v)
        .map(([k]) => k)
        .join(", ");
      const text =
        `${coin.name} (${coin.symbol.toUpperCase()}) is a newly listed "${memeCategory}" project on CoinGecko` +
        `${listedAt ? `, added ${new Date(listedAt).toLocaleDateString()}` : ""}. ` +
        `Official channels: ${channelList}.` +
        (marketCapUsd != null ? ` Market cap: ~$${Math.round(marketCapUsd).toLocaleString()}.` : "");

      candidates.push({
        discoverySourceId: this.id,
        platform: "CoinGecko",
        externalId: coin.id,
        username: twitterHandle ? `@${twitterHandle}` : null,
        prospectName: coin.name,
        title: `${coin.name} (${coin.symbol.toUpperCase()})`,
        text,
        sourceUrl: `https://www.coingecko.com/en/coins/${coin.id}`,
        projectUrl: homepage,
        postedAt: listedAt,
        contactMethod: twitterHandle ? "twitter" : telegramChannel ? "telegram" : discordLink ? "discord" : null,
        contactUrl: twitterHandle
          ? `https://twitter.com/${twitterHandle}`
          : telegramChannel
            ? `https://t.me/${telegramChannel}`
            : discordLink,
        isDemo: false,
        firmographic,
      });
    }

    return candidates;
  }
}
