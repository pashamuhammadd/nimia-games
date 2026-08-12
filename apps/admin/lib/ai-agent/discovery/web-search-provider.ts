import type { Candidate, DiscoveryParams, DiscoverySource } from "../types";

// Web Search discovery provider — STRUCTURED STUB, not implemented in V1.
// Same reasoning as reddit-provider.ts: the interface slot exists so
// "Web Search" is a real, selectable source in the Find Clients UI, but
// this does not call any search API yet — no key is configured, and no
// scraping of search-result pages is an acceptable substitute.
//
// To make this real later: pick a compliant search API (e.g. an official
// search-provider API with its own terms — Bing Web Search API, SerpApi,
// Google Programmable Search, etc.), set WEB_SEARCH_API_KEY /
// WEB_SEARCH_PROVIDER below, and implement discover() to run a handful of
// targeted queries (e.g. `"looking for a 2D animator" game trailer`)
// through that API's official endpoint, then map each result's
// title/snippet/url into a Candidate. Respect that API's own rate limits
// and terms — same constraint as every other source in this directory.
export class WebSearchDiscoveryProvider implements DiscoverySource {
  id = "web_search";
  label = "Web Search";
  description =
    "General web search for public posts/pages mentioning animation needs — not implemented in V1. " +
    "Requires a compliant search API (see this file's header comment).";

  isConfigured(): boolean {
    return Boolean(process.env.WEB_SEARCH_API_KEY);
  }

  notConfiguredReason(): string {
    if (!this.isConfigured()) {
      return "No web search API is connected — set WEB_SEARCH_API_KEY (and WEB_SEARCH_PROVIDER) and implement " +
        "the query in web-search-provider.ts. Not implemented in V1.";
    }
    return "A web search API key is set, but this provider's discover() is still a stub in V1 — see web-search-provider.ts.";
  }

  async discover(_params: DiscoveryParams): Promise<Candidate[]> {
    await Promise.resolve();
    return [];
  }
}
