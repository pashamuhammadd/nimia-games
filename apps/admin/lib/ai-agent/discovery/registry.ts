import type { DiscoverySource, DiscoverySourceStatus } from "../types";
import { DemoDiscoveryProvider } from "./demo-provider";
import { RedditDiscoveryProvider } from "./reddit-provider";
import { CoinGeckoMemecoinDiscoveryProvider } from "./coingecko-memecoin-provider";
import { CoinGeckoNftDiscoveryProvider } from "./coingecko-nft-provider";
import { WebSearchDiscoveryProvider } from "./web-search-provider";
import { JobBoardDiscoveryProvider } from "./job-board-provider";

// Single registry every caller (orchestrator, Find Clients page, Settings
// page) goes through to find out what discovery sources exist — this is
// the actual "plug in a new source later" seam the brief's Data-Source
// Architecture section asks for. Adding a 5th source (e.g. a future
// Discord/Telegram community provider) means: write a class implementing
// DiscoverySource in this directory, add one line below, done — nothing
// in the orchestrator or UI needs to change.
const REGISTRY: DiscoverySource[] = [
  new DemoDiscoveryProvider(),
  new RedditDiscoveryProvider(),
  new CoinGeckoMemecoinDiscoveryProvider(),
  new CoinGeckoNftDiscoveryProvider(),
  new WebSearchDiscoveryProvider(),
  new JobBoardDiscoveryProvider(),
];

export function listDiscoverySources(): DiscoverySource[] {
  return REGISTRY;
}

export function getDiscoverySource(id: string): DiscoverySource | undefined {
  return REGISTRY.find((source) => source.id === id);
}

export function listDiscoverySourceStatuses(): DiscoverySourceStatus[] {
  return REGISTRY.map((source) => {
    const configured = source.isConfigured();
    return {
      id: source.id,
      label: source.label,
      description: source.description,
      configured,
      notConfiguredReason: configured ? undefined : source.notConfiguredReason?.(),
    };
  });
}
