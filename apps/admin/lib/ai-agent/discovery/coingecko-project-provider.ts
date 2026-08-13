import type { DiscoveredProject, DiscoveryParams, DiscoverySource, ProjectDeveloperLinks, ProjectSocialLinks } from "../types";
import { coinGeckoFetch, findDiscordLink, findRedditLink, isCoinGeckoConfigured, coinGeckoNotConfiguredReason } from "./coingecko-client";
import { CATEGORY_TIERS, allCategorySlugs, MIN_TARGET_MARKET_CAP_USD, MAX_TARGET_MARKET_CAP_USD } from "../constants";

// CoinGecko Project Discovery — the ONLY discovery source in V2 (spec
// section 20: "source = CoinGecko"). Replaces the retired "AI Client
// Hunter"'s narrower CoinGeckoMemecoinDiscoveryProvider /
// CoinGeckoNftDiscoveryProvider with a single provider that sweeps every
// category tier in constants.ts's CATEGORY_TIERS (spec section 6), not
// just memecoins/NFTs.
//
// What this looks for: coins in the requested CoinGecko category
// slugs (/coins/markets?category=X), enriched with full project detail
// (/coins/{id}) — description, official links, social channels, developer
// links, genesis_date. NFT collections are covered by a second pass
// (nftDiscover below) since CoinGecko's NFT data lives under a completely
// separate /nfts/* API with its own schema, not under /coins/*.
//
// Discovery does NOT decide whether a project is a good prospect — see
// tools/scoreProject.ts for that. The one filter applied here is a bare
// "is this even a real, identifiable project" floor: at least a homepage
// OR one social link present. A project with literally no public presence
// isn't analyzable, let alone contactable.
//
// TARGETING FIX (13 Aug 2026): the first version of this provider always
// requested `/coins/markets?category=X&order=market_cap_desc&page=1` —
// i.e. only ever the single biggest-market-cap page per category. In
// practice that meant every run mostly rediscovered the same blue-chip
// projects (Axie Infinity, The Sandbox, etc.) — exactly the projects most
// likely to already have their own in-house (or already-contracted)
// creative team, and the worst realistic prospects for Nimia's outsourced
// animation services. This provider now walks PAST that top page and
// keeps only candidates inside [MIN_TARGET_MARKET_CAP_USD,
// MAX_TARGET_MARKET_CAP_USD] (constants.ts) before spending any detail-call
// budget on them — see that constant's own comment for the full reasoning.
// CoinGecko's public API has no server-side market-cap-range filter, so
// this band filter has to happen client-side across a few descending-order
// pages per category (still far cheaper than paging through the entire
// category, and market_cap_desc order means we can stop as soon as a page
// is entirely below the band — everything after it is smaller still).
//
// API-budget discipline (spec section 22): capped category sweep + capped
// detail calls per run, parallelized in small batches so one slow/rate-
// limited request doesn't stall the whole run. This runs on CoinGecko's
// free Demo plan (see coingecko-client.ts) — the caps below exist
// specifically to stay well inside that plan's rate limit, not just to
// bound response time.
const MAX_CATEGORIES_PER_RUN = 8;
const MARKETS_PAGE_SIZE = 50;
const MAX_MARKET_PAGES_PER_CATEGORY = 4; // walks past the top (biggest-cap) page(s) to reach the target band
const IN_BAND_TARGET_PER_CATEGORY = 15; // stop paging a category early once it has yielded this many in-band candidates
const MAX_DETAIL_CALLS = 40;
const DETAIL_CONCURRENCY = 8;
const MAX_NFT_DETAIL_CALLS = 15;

function inTargetMarketCapBand(marketCapUsd: number | null): boolean {
  // A null market cap (CoinGecko hasn't ranked/priced it) is let through —
  // it's usually a very new or very thin listing, exactly the kind of
  // "new project" this fix is trying to surface more of. scoreProject.ts's
  // commercial-potential scorer falls back to 24h volume for these.
  if (marketCapUsd == null) return true;
  return marketCapUsd >= MIN_TARGET_MARKET_CAP_USD && marketCapUsd <= MAX_TARGET_MARKET_CAP_USD;
}

type CoinGeckoMarketRow = {
  id: string;
  symbol: string;
  name: string;
  image: string | null;
  current_price: number | null;
  market_cap: number | null;
  market_cap_rank: number | null;
  fully_diluted_valuation: number | null;
  total_volume: number | null;
  price_change_percentage_24h: number | null;
  circulating_supply: number | null;
  total_supply: number | null;
  max_supply: number | null;
  ath: number | null;
  ath_date: string | null;
  atl: number | null;
  atl_date: string | null;
};

type CoinGeckoCoinDetail = {
  id: string;
  categories?: (string | null)[];
  description?: { en?: string | null };
  genesis_date?: string | null;
  image?: { thumb?: string; small?: string; large?: string };
  platforms?: Record<string, string | null>;
  links?: {
    homepage?: string[];
    blockchain_site?: string[];
    announcement_url?: string[];
    chat_url?: string[];
    twitter_screen_name?: string | null;
    telegram_channel_identifier?: string | null;
    subreddit_url?: string | null;
    facebook_username?: string | null;
    repos_url?: { github?: string[]; bitbucket?: string[] };
  };
};

function firstNonEmpty(values: (string | null | undefined)[]): string | null {
  return values.find((v) => Boolean(v && v.trim())) ?? null;
}

function buildSocialLinks(detail: CoinGeckoCoinDetail): ProjectSocialLinks {
  // Typed as the full (all-optional) `links` shape via the annotation below
  // rather than left to inference — inference would collapse `T | {}` down
  // to a plain `{}` on the fallback branch and then reject every property
  // access below (same "Property 'x' does not exist on type '{}'" failure
  // hit at build time in ProjectsList.tsx's `social_links ?? {}`).
  const links: NonNullable<CoinGeckoCoinDetail["links"]> = detail.links ?? {};
  const homepage = firstNonEmpty(links.homepage ?? []);
  return {
    twitter: links.twitter_screen_name ? `https://twitter.com/${links.twitter_screen_name}` : null,
    telegram: links.telegram_channel_identifier ? `https://t.me/${links.telegram_channel_identifier}` : null,
    discord: findDiscordLink([...(links.chat_url ?? []), homepage]),
    reddit: links.subreddit_url && links.subreddit_url.trim() ? links.subreddit_url : findRedditLink(links.chat_url ?? []),
    facebook: links.facebook_username ? `https://facebook.com/${links.facebook_username}` : null,
  };
}

function buildDeveloperLinks(detail: CoinGeckoCoinDetail): ProjectDeveloperLinks {
  const github = (detail.links?.repos_url?.github ?? []).filter((u): u is string => Boolean(u && u.trim()));
  const bitbucket = (detail.links?.repos_url?.bitbucket ?? []).filter((u): u is string => Boolean(u && u.trim()));
  return { github, sourceCode: [...github, ...bitbucket] };
}

/** CoinGecko has no dedicated whitepaper field — a whitepaper URL is only
 * ever surfaced when it's identifiable by name among the project's own
 * announcement/homepage links, never guessed. */
function findWhitepaperUrl(detail: CoinGeckoCoinDetail): string | null {
  const candidates = [...(detail.links?.announcement_url ?? []), ...(detail.links?.homepage ?? [])];
  return candidates.find((u) => Boolean(u && /whitepaper|litepaper/i.test(u))) ?? null;
}

function mapToDiscoveredProject(
  sourceId: string,
  market: CoinGeckoMarketRow,
  detail: CoinGeckoCoinDetail,
  matchedCategorySlugs: string[],
): DiscoveredProject {
  const categories = (detail.categories ?? []).filter((c): c is string => Boolean(c));
  const homepage = firstNonEmpty(detail.links?.homepage ?? []);
  const explorer = firstNonEmpty(detail.links?.blockchain_site ?? []);
  const blockchainPlatforms = Object.keys(detail.platforms ?? {}).filter((k) => Boolean(k && detail.platforms?.[k]));

  return {
    discoverySourceId: sourceId,
    coingeckoId: market.id,
    name: market.name,
    symbol: market.symbol ? market.symbol.toUpperCase() : null,
    description: detail.description?.en?.trim() || null,
    categories,
    matchedCategorySlugs,
    logoUrl: detail.image?.large || detail.image?.small || market.image || null,

    homepageUrl: homepage,
    whitepaperUrl: findWhitepaperUrl(detail),
    docsUrl: null, // CoinGecko has no dedicated docs field — never fabricated.
    explorerUrl: explorer,
    blockchainPlatforms,

    launchDate: detail.genesis_date || null,
    firstListedAt: null, // Only /coins/list/new (very recent listings) has this — see nftDiscover's own note for the NFT-side limitation.

    currentPriceUsd: market.current_price,
    marketCapUsd: market.market_cap,
    fullyDilutedValuationUsd: market.fully_diluted_valuation,
    volume24hUsd: market.total_volume,
    marketCapRank: market.market_cap_rank,
    circulatingSupply: market.circulating_supply,
    totalSupply: market.total_supply,
    maxSupply: market.max_supply,
    athUsd: market.ath,
    athDate: market.ath_date,
    atlUsd: market.atl,
    atlDate: market.atl_date,
    priceChange24hPct: market.price_change_percentage_24h,

    socialLinks: buildSocialLinks(detail),
    developerLinks: buildDeveloperLinks(detail),
    rawSourceData: { market, detail },
    isDemo: false,
  };
}

function hasAnyPublicPresence(project: DiscoveredProject): boolean {
  return Boolean(
    project.homepageUrl ||
      project.socialLinks.twitter ||
      project.socialLinks.telegram ||
      project.socialLinks.discord ||
      project.socialLinks.reddit,
  );
}

export class CoinGeckoProjectDiscoveryProvider implements DiscoverySource {
  id = "coingecko-projects";
  label = "CoinGecko — Crypto/Web3 Projects";
  description =
    "Projects across Gaming/GameFi/Metaverse, NFT/Web3 entertainment, Memecoin/DeFi, and Layer 1/2/Infrastructure " +
    "categories (CoinGecko public API) — a prospecting list of real, identifiable projects, not an expressed " +
    "request for animation work. Data via CoinGecko (coingecko.com), attribution shown on every project from this " +
    "source.";

  isConfigured(): boolean {
    return isCoinGeckoConfigured();
  }

  notConfiguredReason(): string {
    return coinGeckoNotConfiguredReason();
  }

  async discover(params: DiscoveryParams): Promise<DiscoveredProject[]> {
    if (!this.isConfigured()) return [];

    const requestedSlugs = params.categorySlugs.length > 0 ? params.categorySlugs : allCategorySlugs();
    const categorySlugs = requestedSlugs.slice(0, MAX_CATEGORIES_PER_RUN);

    // Track every category slug that surfaced each coin — a coin can
    // legitimately appear under more than one requested category, and
    // this map is the ONLY reliable way to know a project's tier later
    // (tools/scoreProject.ts), since CoinGecko's /coins/{id} `categories`
    // field returns human-readable labels ("Gaming (Games)") that don't
    // reliably map back to the slugs this file queried with.
    const slugsByCoinId = new Map<string, Set<string>>();
    const marketRowById = new Map<string, CoinGeckoMarketRow>();

    for (const slug of categorySlugs) {
      let inBandForThisCategory = 0;

      for (let page = 1; page <= MAX_MARKET_PAGES_PER_CATEGORY; page++) {
        let rows: CoinGeckoMarketRow[];
        try {
          rows = (await coinGeckoFetch("/coins/markets", {
            vs_currency: "usd",
            category: slug,
            order: "market_cap_desc",
            per_page: MARKETS_PAGE_SIZE,
            page,
            sparkline: false,
          })) as CoinGeckoMarketRow[];
        } catch {
          // One bad category/page shouldn't sink the whole run — the
          // orchestrator logs a discovery-level error only if every
          // category fails outright.
          break;
        }

        if (rows.length === 0) break; // ran out of pages for this category

        for (const row of rows) {
          if (!inTargetMarketCapBand(row.market_cap)) continue;
          if (!slugsByCoinId.has(row.id)) slugsByCoinId.set(row.id, new Set());
          slugsByCoinId.get(row.id)!.add(slug);
          if (!marketRowById.has(row.id)) {
            marketRowById.set(row.id, row);
            inBandForThisCategory++;
          }
        }

        // market_cap_desc means every row on this page is >= every row on
        // the next one — once a whole page lands inside-or-below the band,
        // paging further can only turn up smaller (still relevant) coins,
        // and once we've gathered enough for this category there's no
        // budget reason to keep paging into the very long tail.
        if (inBandForThisCategory >= IN_BAND_TARGET_PER_CATEGORY) break;
        const pageMax = Math.max(...rows.map((r) => r.market_cap ?? 0));
        if (pageMax > 0 && pageMax < MIN_TARGET_MARKET_CAP_USD) break; // already past the band's floor
      }
    }

    const toDetail = Array.from(marketRowById.values()).slice(0, MAX_DETAIL_CALLS);
    const results: DiscoveredProject[] = [];

    for (let i = 0; i < toDetail.length && results.length < params.limit; i += DETAIL_CONCURRENCY) {
      const batch = toDetail.slice(i, i + DETAIL_CONCURRENCY);
      const detailResults = await Promise.all(
        batch.map(async (market) => {
          try {
            const detail = (await coinGeckoFetch(`/coins/${market.id}`, {
              localization: false,
              tickers: false,
              market_data: false,
              community_data: false,
              developer_data: false,
              sparkline: false,
            })) as CoinGeckoCoinDetail;
            return { market, detail };
          } catch {
            return null; // one rate-limited/bad detail call shouldn't sink the run
          }
        }),
      );

      for (const entry of detailResults) {
        if (!entry) continue;
        if (results.length >= params.limit) break;
        const matchedSlugs = Array.from(slugsByCoinId.get(entry.market.id) ?? []);
        const project = mapToDiscoveredProject(this.id, entry.market, entry.detail, matchedSlugs);
        if (!hasAnyPublicPresence(project)) continue;
        results.push(project);
      }
    }

    return results;
  }
}

// ------------------------------------------------------------------
// NFT collections — CoinGecko's NFT data lives under a wholly separate
// /nfts/* API (different schema, no shared coin ID space with /coins/*),
// so this is its own function rather than a branch inside discover()
// above. Registered as a second DiscoverySource (see registry.ts) so it
// can be toggled independently on the Find Prospects page.
//
// IMPORTANT LIMITATION carried over from the retired "AI Client Hunter":
// CoinGecko's NFT API has no listing-date field at all (unlike
// /coins/list/new for coins) — firstListedAt/launchDate are always null
// here, and tools/scoreProject.ts's activity factor falls back to 24h
// trading volume as an activity proxy for NFT-sourced projects and says
// so in its own reasons, never pretends otherwise.
//
// TARGETING FIX (13 Aug 2026, same reasoning as the coin-market provider
// above): `/nfts/list` has no market-cap query param, so unlike the coin
// sweep we can't band-filter before spending detail-call budget — a
// collection's market cap is only known after `/nfts/{id}`. As a
// best-effort mitigation: order by market cap descending and SKIP the top
// `NFT_SKIP_TOP_N` entries before even requesting detail for them (those
// are almost always established blue-chip collections with their own
// creative team), then apply the same MAX_TARGET_MARKET_CAP_USD ceiling
// post-detail as a safety net. This is honestly a cruder fix than the coin
// provider's — it can't see market cap before the detail call — but it's
// a real improvement over the old `h24_volume_usd_desc` order, which
// guaranteed the single most-hyped (almost always biggest) collections
// every run.
// ------------------------------------------------------------------

const NFT_SKIP_TOP_N = 40;
const NFT_LIST_PAGE_SIZE = 100;

type CoinGeckoNftListItem = { id: string; name: string; symbol: string };
type CoinGeckoNftDetail = {
  id: string;
  name: string;
  description?: string | null;
  image?: { small?: string };
  links?: { homepage?: string | null; twitter?: string | null; discord?: string | null };
  market_cap?: { usd?: number | null };
  volume_24h?: { usd?: number | null };
};

export class CoinGeckoNftDiscoveryProvider implements DiscoverySource {
  id = "coingecko-nft";
  label = "CoinGecko — NFT Collections";
  description =
    "NFT collections with real recent trading activity (CoinGecko public API). CoinGecko has no listing-date " +
    "field for NFTs, so recency is approximated by 24h trading volume, not launch date.";

  isConfigured(): boolean {
    return isCoinGeckoConfigured();
  }

  notConfiguredReason(): string {
    return coinGeckoNotConfiguredReason();
  }

  async discover(params: DiscoveryParams): Promise<DiscoveredProject[]> {
    if (!this.isConfigured()) return [];

    let list: CoinGeckoNftListItem[];
    try {
      list = (await coinGeckoFetch("/nfts/list", {
        order: "market_cap_usd_desc",
        per_page: NFT_LIST_PAGE_SIZE,
        page: 1,
      })) as CoinGeckoNftListItem[];
    } catch (error) {
      throw new Error(`CoinGecko NFT list failed: ${error instanceof Error ? error.message : String(error)}`);
    }

    // Skip the top of the list (blue-chip collections, see this class's
    // header comment) before taking our detail-call budget's worth.
    const toCheck = list.slice(NFT_SKIP_TOP_N, NFT_SKIP_TOP_N + MAX_NFT_DETAIL_CALLS);
    const results: DiscoveredProject[] = [];

    for (let i = 0; i < toCheck.length && results.length < params.limit; i += DETAIL_CONCURRENCY) {
      const batch = toCheck.slice(i, i + DETAIL_CONCURRENCY);
      const detailResults = await Promise.all(
        batch.map(async (item) => {
          try {
            const detail = (await coinGeckoFetch(`/nfts/${item.id}`)) as CoinGeckoNftDetail;
            return { item, detail };
          } catch {
            return null;
          }
        }),
      );

      for (const entry of detailResults) {
        if (!entry) continue;
        if (results.length >= params.limit) break;
        const { item, detail } = entry;

        const socialLinks: ProjectSocialLinks = {
          twitter: detail.links?.twitter ?? null,
          telegram: null,
          discord: detail.links?.discord ?? null,
          reddit: null,
          facebook: null,
        };
        if (!detail.links?.homepage && !socialLinks.twitter && !socialLinks.discord) continue;
        if (!inTargetMarketCapBand(detail.market_cap?.usd ?? null)) continue;

        results.push({
          discoverySourceId: this.id,
          coingeckoId: `nft:${item.id}`,
          name: detail.name,
          symbol: item.symbol ? item.symbol.toUpperCase() : null,
          description: detail.description?.trim() || null,
          categories: ["NFT"],
          matchedCategorySlugs: ["non-fungible-tokens-nft"],
          logoUrl: detail.image?.small ?? null,

          homepageUrl: detail.links?.homepage ?? null,
          whitepaperUrl: null,
          docsUrl: null,
          explorerUrl: null,
          blockchainPlatforms: [],

          launchDate: null,
          firstListedAt: null,

          currentPriceUsd: null,
          marketCapUsd: detail.market_cap?.usd ?? null,
          fullyDilutedValuationUsd: null,
          volume24hUsd: detail.volume_24h?.usd ?? null,
          marketCapRank: null,
          circulatingSupply: null,
          totalSupply: null,
          maxSupply: null,
          athUsd: null,
          athDate: null,
          atlUsd: null,
          atlDate: null,
          priceChange24hPct: null,

          socialLinks,
          developerLinks: { github: [], sourceCode: [] },
          rawSourceData: { item, detail },
          isDemo: false,
        });
      }
    }

    return results;
  }
}
