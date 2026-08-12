import type { Candidate, DiscoveryParams, DiscoverySource } from "../types";

// Reddit discovery provider — STRUCTURED STUB, not implemented in V1.
//
// This class exists so the rest of the pipeline (registry, Find Clients
// UI, orchestrator) already has a real slot for Reddit without hardcoding
// anything Reddit-specific elsewhere — exactly what the brief's "modular
// Discovery Source architecture" section asks for. It deliberately does
// NOT call Reddit's API yet, for two reasons:
//
//   1. It would need real registered-app credentials (REDDIT_CLIENT_ID /
//      REDDIT_CLIENT_SECRET / REDDIT_USER_AGENT below) that don't exist
//      yet, and a half-tested integration is worse than an honest stub.
//   2. Reddit's API has specific terms (OAuth "installed app"/"script app"
//      registration, a descriptive User-Agent, strict rate limits, no
//      scraping the HTML site, no circumventing auth) — this file is the
//      one place that integration should live so it's reviewed once,
//      correctly, rather than bolted on ad hoc.
//
// To make this real later (see also this app's README section on this):
//   1. Register an app at https://www.reddit.com/prefs/apps (type
//      "script" is enough for read-only search) and set
//      REDDIT_CLIENT_ID / REDDIT_CLIENT_SECRET / REDDIT_USER_AGENT.
//   2. In discover() below: POST to https://www.reddit.com/api/v1/access_token
//      with grant_type=client_credentials (application-only OAuth — no
//      end-user login, no scraping) to get a bearer token.
//   3. GET https://oauth.reddit.com/search (or a specific subreddit's
//      /search) with that token and the User-Agent header, respecting the
//      X-Ratelimit-* response headers — never issue a second request
//      before the previous one's rate-limit window clears.
//   4. Map each returned post's title/selftext/permalink/author/created_utc
//      into a Candidate, same shape demo-provider.ts already produces —
//      nothing else in this codebase needs to change.
//
// Still NOT allowed even once implemented: creating throwaway accounts,
// scraping non-API pages, or sending any message/DM to a Reddit user —
// this provider's only job is discovery, same as every other source.
export class RedditDiscoveryProvider implements DiscoverySource {
  id = "reddit";
  label = "Reddit";
  description =
    "Official Reddit API search (read-only, application-only OAuth) — not implemented in V1. " +
    "See this file's header comment for exactly what's needed to enable it.";

  isConfigured(): boolean {
    return Boolean(
      process.env.REDDIT_CLIENT_ID && process.env.REDDIT_CLIENT_SECRET && process.env.REDDIT_USER_AGENT,
    );
  }

  notConfiguredReason(): string {
    if (!this.isConfigured()) {
      return "Reddit isn't connected yet — set REDDIT_CLIENT_ID, REDDIT_CLIENT_SECRET, and REDDIT_USER_AGENT, " +
        "and implement the OAuth search call (see reddit-provider.ts). Not implemented in V1.";
    }
    return "Reddit credentials are set, but this provider's discover() is still a stub in V1 — see reddit-provider.ts.";
  }

  async discover(_params: DiscoveryParams): Promise<Candidate[]> {
    // Deliberately a no-op even if credentials happen to be present —
    // implementing the actual OAuth + search call is future work (see
    // header comment). Never falls back to scraping or any other
    // Reddit-terms-violating shortcut.
    await Promise.resolve();
    return [];
  }
}
