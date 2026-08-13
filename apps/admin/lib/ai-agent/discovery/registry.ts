import type { DiscoverySource, DiscoverySourceStatus } from "../types";
import { DemoDiscoveryProvider } from "./demo-provider";
import { CoinGeckoProjectDiscoveryProvider, CoinGeckoNftDiscoveryProvider } from "./coingecko-project-provider";

// Single registry every caller (orchestrator, Find Prospects page,
// Settings page) goes through to find out what discovery sources exist —
// the actual "plug in a new source later" seam (spec section 20:
// "architecture should remain extensible for future sources, but V1 must
// be CoinGecko-focused"). Adding a future source means: write a class
// implementing DiscoverySource in this directory, add one line below,
// done — nothing in the orchestrator or UI needs to change.
//
// Reddit, Web Search, and Job Board discovery providers from the retired
// "AI Client Hunter" are gone, not just unregistered — see this app's git
// history for reddit-provider.ts / web-search-provider.ts /
// job-board-provider.ts if a future source needs a starting point. None
// of the three fit this module's new source model (CoinGecko-only, spec
// section 20) and Reddit's provider was already permanently disabled for
// commercial-license reasons (see the retired lib/ai-agent/README.md).
const REGISTRY: DiscoverySource[] = [
  new CoinGeckoProjectDiscoveryProvider(),
  new CoinGeckoNftDiscoveryProvider(),
  new DemoDiscoveryProvider(),
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
