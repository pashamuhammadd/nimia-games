import type { Candidate, DiscoveryParams, DiscoverySource } from "../types";

// Reddit discovery provider — LIVE in V1 as of 13 Agustus 2026, via
// Reddit's OFFICIAL read-only OAuth API (application-only "client
// credentials" grant — no end-user login, no scraping, no bypassing
// auth). Only active once REDDIT_CLIENT_ID / REDDIT_CLIENT_SECRET /
// REDDIT_USER_AGENT are all set — see apps/admin/.env.example.
//
// How to get credentials:
//   1. Log into the Reddit account Nimia wants this to run as.
//   2. Go to https://www.reddit.com/prefs/apps → "create another app...".
//   3. Pick type "script", any name/description, redirect URI can be
//      anything (e.g. http://localhost — unused by this flow).
//   4. The string under the app name is REDDIT_CLIENT_ID; "secret" is
//      REDDIT_CLIENT_SECRET.
//   5. REDDIT_USER_AGENT must be descriptive and unique per Reddit's API
//      rules, e.g. "nimia-ai-client-hunter/1.0 (by u/your-reddit-username)".
//
// What this does NOT do, on purpose: create throwaway accounts, message
// or reply to anyone, scrape non-API pages, or exceed Reddit's rate
// limits — this issues a handful of read-only /search requests per run
// (see MAX_QUERIES below) and stops early if Reddit's own rate-limit
// headers say to.
export class RedditDiscoveryProvider implements DiscoverySource {
  id = "reddit";
  label = "Reddit";
  description = "Official Reddit API search (read-only, application-only OAuth).";

  isConfigured(): boolean {
    // PAUSED as of 12 Agustus 2026, pending Reddit's commercial Data API
    // licensing — Reddit's Data API Terms require a separately negotiated
    // (and, per third-party reporting, costly) commercial license for a
    // for-profit product like this one; the free application-only OAuth
    // tier this file implements is explicitly scoped to personal/
    // non-commercial use only. See this app's lib/ai-agent/README.md for
    // the full research behind this call, and
    // coingecko-memecoin-provider.ts / coingecko-nft-provider.ts for the
    // commercial-use-safe sources added in its place.
    //
    // The implementation below is untouched and fully functional — to
    // re-enable it once Nimia has Reddit's written commercial approval,
    // restore this to:
    //   return Boolean(
    //     process.env.REDDIT_CLIENT_ID && process.env.REDDIT_CLIENT_SECRET && process.env.REDDIT_USER_AGENT,
    //   );
    return false;
  }

  notConfiguredReason(): string {
    return "Reddit is paused — its Data API Terms require a separately negotiated commercial license for a " +
      "for-profit tool like this one, which Nimia doesn't currently have. See this file's isConfigured() " +
      "comment for how to re-enable once that's resolved, or use the CoinGecko sources instead.";
  }

  async discover(params: DiscoveryParams): Promise<Candidate[]> {
    if (!this.isConfigured()) return [];

    let token: string;
    try {
      token = await getAppOnlyAccessToken();
    } catch (error) {
      throw new Error(`Reddit authentication failed: ${error instanceof Error ? error.message : String(error)}`);
    }

    const queries = buildSearchQueries(params);
    const perQueryLimit = Math.min(25, Math.max(5, Math.ceil(params.limit / Math.max(queries.length, 1))));
    const candidates: Candidate[] = [];
    const seenIds = new Set<string>();

    for (const query of queries) {
      let posts: RedditPost[];
      try {
        const result = await searchReddit(token, query, perQueryLimit);
        posts = result.posts;
        // Stop issuing further queries this run if Reddit says we're
        // close to the limit — better to return fewer candidates than
        // to risk tripping their rate limiter.
        if (result.rateLimitRemaining !== null && result.rateLimitRemaining < 5) break;
      } catch {
        // One bad query shouldn't sink the whole run — the orchestrator
        // still logs a discovery-level error if EVERY query fails and
        // this provider ends up returning zero candidates.
        continue;
      }

      for (const post of posts) {
        if (seenIds.has(post.id)) continue;
        if (!post.author || post.author === "[deleted]") continue;
        if (post.selftext === "[removed]" || post.selftext === "[deleted]") continue;

        seenIds.add(post.id);
        const text = [post.title, post.selftext].filter(Boolean).join("\n\n").trim();
        if (!text) continue;

        candidates.push({
          discoverySourceId: this.id,
          platform: "Reddit",
          externalId: post.id,
          username: `u/${post.author}`,
          prospectName: null,
          title: post.title,
          text,
          sourceUrl: `https://reddit.com${post.permalink}`,
          projectUrl: null,
          postedAt: new Date(post.created_utc * 1000).toISOString(),
          contactMethod: "platform_dm",
          contactUrl: `https://reddit.com/message/compose/?to=${post.author}`,
          isDemo: false,
        });
      }
    }

    return candidates;
  }
}

// ------------------------------------------------------------------
// Reddit API plumbing — kept private to this file. Nothing here is
// re-exported; the orchestrator only ever talks to the DiscoverySource
// interface above.
// ------------------------------------------------------------------

const MAX_QUERIES = 3;
const REQUEST_TIMEOUT_MS = 8000;

type RedditPost = {
  id: string;
  title: string;
  selftext: string;
  author: string;
  permalink: string;
  created_utc: number;
};

async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

/** Application-only OAuth (grant_type=client_credentials) — read-only,
 * no Reddit user ever has to log in or grant anything. Token is fetched
 * fresh per run rather than cached across invocations; at this module's
 * expected call volume (an admin manually starting a run) that's a
 * negligible cost and keeps this stateless, which matters for a
 * serverless deployment (brief section 19). */
async function getAppOnlyAccessToken(): Promise<string> {
  const clientId = process.env.REDDIT_CLIENT_ID!;
  const clientSecret = process.env.REDDIT_CLIENT_SECRET!;
  const userAgent = process.env.REDDIT_USER_AGENT!;

  const response = await fetchWithTimeout("https://www.reddit.com/api/v1/access_token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": userAgent,
    },
    body: "grant_type=client_credentials",
  });

  if (!response.ok) {
    throw new Error(`token endpoint returned ${response.status}`);
  }

  const json = (await response.json()) as { access_token?: string };
  if (!json.access_token) {
    throw new Error("token endpoint returned no access_token");
  }
  return json.access_token;
}

/** Buys-intent phrases matched against real Reddit search — deliberately
 * a SUBSET of tools/qualify.ts's own STRONG_INTENT_PATTERNS (kept
 * independent rather than imported, since a shorter, higher-precision
 * list makes for better search queries than the full qualification
 * pattern list — the qualification engine still re-scores every result
 * on its own merits regardless of which phrase found it). */
const SEARCH_INTENT_PHRASES = [
  "looking for an animator",
  "need an animator",
  "need someone to animate",
  "hiring an animator",
];

function buildSearchQueries(params: DiscoveryParams): string[] {
  const extra = [params.serviceFilter, params.audienceFilter].filter(Boolean).join(" ").trim();
  return SEARCH_INTENT_PHRASES.slice(0, MAX_QUERIES).map((phrase) => {
    const quoted = `"${phrase}"`;
    return extra ? `${quoted} ${extra}` : quoted;
  });
}

async function searchReddit(
  token: string,
  query: string,
  limit: number,
): Promise<{ posts: RedditPost[]; rateLimitRemaining: number | null }> {
  const url = new URL("https://oauth.reddit.com/search");
  url.searchParams.set("q", query);
  url.searchParams.set("sort", "relevance");
  url.searchParams.set("t", "month");
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("type", "link");

  const response = await fetchWithTimeout(url.toString(), {
    headers: {
      Authorization: `Bearer ${token}`,
      "User-Agent": process.env.REDDIT_USER_AGENT!,
    },
  });

  const rateLimitHeader = response.headers.get("x-ratelimit-remaining");
  const parsedRateLimit = rateLimitHeader !== null ? Number.parseFloat(rateLimitHeader) : Number.NaN;
  const rateLimitRemaining = Number.isFinite(parsedRateLimit) ? parsedRateLimit : null;

  if (!response.ok) {
    throw new Error(`search endpoint returned ${response.status}`);
  }

  const json = (await response.json()) as {
    data?: { children?: { data: RedditPost }[] };
  };
  const posts = (json.data?.children ?? []).map((child) => child.data);

  return { posts, rateLimitRemaining };
}
