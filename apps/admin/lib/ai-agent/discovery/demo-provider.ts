import type { DiscoveredProject, DiscoveryParams, DiscoverySource } from "../types";

// Demo Discovery Provider (V2) — a handful of hand-written, clearly fake
// PROJECT-shaped sample records, used only to exercise the analysis/
// scoring pipeline end-to-end without a live CoinGecko key.
//
// UNLIKE the retired "AI Client Hunter"'s demo provider, this is NEVER an
// automatic fallback. That was a real gap in V1: if COINGECKO_API_KEY was
// ever unset in production, the orchestrator silently substituted
// Reddit-flavored demo leads into the live dashboard, distinguished only
// by an `is_demo` badge a busy admin could miss. Spec sections 4/24/25 are
// explicit that production must never display fake data, and that a
// missing/failed data source must show a clear error, not a silent
// substitute — see orchestrator.ts's own comment on why a run with no
// configured source now fails outright instead of falling back here.
//
// This provider only ever runs when BOTH of the following are true:
//   1. `AI_HUNTER_DEMO_MODE=true` is explicitly set (never on by default,
//      never set in apps/admin/.env.example's shipped values) — a
//      deliberate two-step opt-in (env var + explicit source selection on
//      the Find Prospects page) rather than a one-click accident.
//   2. It's the ONLY selected source, or COINGECKO_API_KEY is genuinely
//      absent — orchestrator.ts never mixes demo projects into a run that
//      also pulled real CoinGecko data.
//
// Every project below is fixed, hand-written sample data — never
// dynamically generated, never claimed to be real. `isDemo: true` is
// hardcoded so nothing downstream can mistake this for live data.
const DEMO_PROJECTS: DiscoveredProject[] = [
  {
    discoverySourceId: "demo",
    coingeckoId: "demo-pixelquest",
    name: "PixelQuest",
    symbol: "PXQ",
    description:
      "A blockchain-based dungeon-crawler RPG with on-chain item ownership. Actively posting devlogs and concept art " +
      "ahead of a public beta.",
    categories: ["Gaming", "GameFi"],
    matchedCategorySlugs: ["gaming"],
    logoUrl: null,
    homepageUrl: "https://example.com/pixelquest-demo",
    whitepaperUrl: "https://example.com/pixelquest-demo/whitepaper",
    docsUrl: null,
    explorerUrl: null,
    blockchainPlatforms: ["ethereum"],
    launchDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10).toISOString().slice(0, 10),
    firstListedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
    currentPriceUsd: 0.42,
    marketCapUsd: 8_200_000,
    fullyDilutedValuationUsd: 12_000_000,
    volume24hUsd: 620_000,
    marketCapRank: 412,
    circulatingSupply: 19_500_000,
    totalSupply: 28_500_000,
    maxSupply: 30_000_000,
    athUsd: 0.91,
    athDate: null,
    atlUsd: 0.11,
    atlDate: null,
    priceChange24hPct: 4.2,
    socialLinks: { twitter: "https://twitter.com/pixelquest_demo", telegram: "https://t.me/pixelquest_demo", discord: "https://discord.gg/pixelquest-demo", reddit: null, facebook: null },
    developerLinks: { github: ["https://github.com/pixelquest-demo"], sourceCode: ["https://github.com/pixelquest-demo"] },
    rawSourceData: null,
    isDemo: true,
  },
  {
    discoverySourceId: "demo",
    coingeckoId: "demo-nightfall-collective",
    name: "Nightfall Collective",
    symbol: null,
    description:
      "A generative NFT collection of animated character portraits, with an active Discord community and a roadmap " +
      "toward a small animated series.",
    categories: ["NFT", "Collectibles"],
    matchedCategorySlugs: ["non-fungible-tokens-nft"],
    logoUrl: null,
    homepageUrl: "https://example.com/nightfall-demo",
    whitepaperUrl: null,
    docsUrl: null,
    explorerUrl: null,
    blockchainPlatforms: ["solana"],
    launchDate: null,
    firstListedAt: null,
    currentPriceUsd: null,
    marketCapUsd: 940_000,
    fullyDilutedValuationUsd: null,
    volume24hUsd: 41_000,
    marketCapRank: null,
    circulatingSupply: null,
    totalSupply: null,
    maxSupply: null,
    athUsd: null,
    athDate: null,
    atlUsd: null,
    atlDate: null,
    priceChange24hPct: null,
    socialLinks: { twitter: "https://twitter.com/nightfall_demo", telegram: null, discord: "https://discord.gg/nightfall-demo", reddit: null, facebook: null },
    developerLinks: { github: [], sourceCode: [] },
    rawSourceData: null,
    isDemo: true,
  },
  {
    discoverySourceId: "demo",
    coingeckoId: "demo-vaultfi",
    name: "VaultFi",
    symbol: "VLT",
    description: "A lending/borrowing protocol with an established, multi-year track record and modest but steady TVL.",
    categories: ["DeFi", "Lending"],
    matchedCategorySlugs: ["decentralized-finance-defi", "lending-borrowing"],
    logoUrl: null,
    homepageUrl: "https://example.com/vaultfi-demo",
    whitepaperUrl: "https://example.com/vaultfi-demo/whitepaper",
    docsUrl: "https://docs.example.com/vaultfi-demo",
    explorerUrl: "https://etherscan.io/token/0xdemo",
    blockchainPlatforms: ["ethereum"],
    launchDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 900).toISOString().slice(0, 10),
    firstListedAt: null,
    currentPriceUsd: 1.85,
    marketCapUsd: 34_000_000,
    fullyDilutedValuationUsd: 40_000_000,
    volume24hUsd: 1_100_000,
    marketCapRank: 188,
    circulatingSupply: 18_400_000,
    totalSupply: 21_600_000,
    maxSupply: 21_600_000,
    athUsd: 6.4,
    athDate: null,
    atlUsd: 0.38,
    atlDate: null,
    priceChange24hPct: -1.1,
    socialLinks: { twitter: "https://twitter.com/vaultfi_demo", telegram: "https://t.me/vaultfi_demo", discord: null, reddit: "https://reddit.com/r/vaultfi_demo", facebook: null },
    developerLinks: { github: ["https://github.com/vaultfi-demo"], sourceCode: ["https://github.com/vaultfi-demo"] },
    rawSourceData: null,
    isDemo: true,
  },
];

export function isDemoModeEnabled(): boolean {
  return process.env.AI_HUNTER_DEMO_MODE === "true";
}

export class DemoDiscoveryProvider implements DiscoverySource {
  id = "demo";
  label = "Demo Discovery Provider (dev only)";
  description =
    "Fixed, hand-written sample projects used to exercise the scoring pipeline without a live CoinGecko key. " +
    "Only selectable when AI_HUNTER_DEMO_MODE=true is set — never enabled by default, never a silent fallback.";

  isConfigured(): boolean {
    return isDemoModeEnabled();
  }

  notConfiguredReason(): string {
    return "Set AI_HUNTER_DEMO_MODE=true in .env.local to enable this dev-only source. Disabled by default so " +
      "production can never accidentally show fake projects.";
  }

  async discover(_params: DiscoveryParams): Promise<DiscoveredProject[]> {
    await Promise.resolve();
    return [...DEMO_PROJECTS];
  }
}
