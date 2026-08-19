// Shared HTTP plumbing for CoinGecko's official public "Demo" API plan —
// used by discovery/coingecko-project-provider.ts. Kept in one file so
// moving to a paid Pro plan later (different base URL / header — see
// docs.coingecko.com) is a one-file change.
//
// Commercial-use note (checked 12 Agustus 2026, carried over unchanged
// from the retired "AI Client Hunter"): CoinGecko's API Terms
// (coingecko.com/en/api_terms, section 4.1.6) explicitly PERMIT charging
// for a product/service that incorporates the CoinGecko API on the free
// Demo plan — no separate commercial license required. The two hard
// requirements are (a) attribution — a visible "Powered by CoinGecko"
// wherever results are shown (see app/(protected)/ai-prospect-hunter/
// projects/ProjectDetailPanel.tsx's CoinGeckoAttribution), and (b) not
// reselling/redistributing raw API access, and not using the data for
// ad-targeting (neither of which this app does). Re-read the terms
// yourself if Nimia's usage changes materially — this comment is not
// legal advice.

const COINGECKO_BASE_URL = "https://api.coingecko.com/api/v3";
const REQUEST_TIMEOUT_MS = 8000;

// Retry with backoff (added 19 Aug 2026). CoinGecko's free Demo plan is
// capped at 30 calls/minute
// (support.coingecko.com/hc/en-us/articles/4538771776153) — before this
// fix, a single rate-limit hit (or any transient network/5xx blip)
// anywhere in a run PERMANENTLY lost that market page or project detail
// call for the rest of the run (the caller's own try/catch just skipped
// it), which quietly shrank the run's results with no visible error. As
// discovery/coingecko-project-provider.ts's own per-run budget constants
// grew (19 Aug 2026, part of the same coverage push), that risk grew too.
// A 429 response honors CoinGecko's own `Retry-After` header when present;
// any other failure (non-2xx, network error, timeout) backs off with a
// short fixed schedule instead. Up to MAX_RATE_LIMIT_RETRIES extra
// attempts — after that, the original error still propagates to the
// caller exactly as before this change.
const MAX_RATE_LIMIT_RETRIES = 2;
const RETRY_BASE_DELAY_MS = 800;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function isCoinGeckoConfigured(): boolean {
  return Boolean(process.env.COINGECKO_API_KEY);
}

export function coinGeckoNotConfiguredReason(): string {
  return (
    "CoinGecko isn't connected — set COINGECKO_API_KEY (see apps/admin/.env.example for how to get a free " +
    "Demo API key, no credit card required, from the CoinGecko developer dashboard)."
  );
}

export async function coinGeckoFetch(
  path: string,
  params: Record<string, string | number | boolean | undefined> = {},
): Promise<unknown> {
  const url = new URL(`${COINGECKO_BASE_URL}${path}`);
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) continue;
    url.searchParams.set(key, String(value));
  }

  let lastError: unknown;

  for (let attempt = 0; attempt <= MAX_RATE_LIMIT_RETRIES; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch(url.toString(), {
        headers: {
          accept: "application/json",
          "x-cg-demo-api-key": process.env.COINGECKO_API_KEY ?? "",
        },
        signal: controller.signal,
      });

      if (response.status === 429 && attempt < MAX_RATE_LIMIT_RETRIES) {
        const retryAfterHeader = response.headers.get("retry-after");
        const retryAfterSeconds = retryAfterHeader ? Number(retryAfterHeader) : NaN;
        const delayMs = Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0 ? retryAfterSeconds * 1000 : RETRY_BASE_DELAY_MS * (attempt + 1);
        await sleep(delayMs);
        continue;
      }

      if (!response.ok) {
        throw new Error(`CoinGecko ${path} returned ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      lastError = error;
      if (attempt >= MAX_RATE_LIMIT_RETRIES) break;
    } finally {
      clearTimeout(timeout);
    }
  }

  throw lastError instanceof Error ? lastError : new Error(`CoinGecko ${path} failed after ${MAX_RATE_LIMIT_RETRIES + 1} attempt(s).`);
}

/** Best-effort Discord-invite scan across a handful of link fields.
 * CoinGecko's coin schema has no dedicated `discord` field, so a Discord
 * invite is only ever detected when a project happens to have put one in
 * `chat_url` or `homepage` — this never invents a link that isn't
 * actually present in the API response. */
export function findDiscordLink(candidates: (string | null | undefined)[]): string | null {
  for (const value of candidates) {
    if (!value) continue;
    const match = value.match(/https?:\/\/(?:www\.)?discord\.(?:gg|com\/invite)\/[a-z0-9-]+/i);
    if (match) return match[0];
  }
  return null;
}

export function findRedditLink(candidates: (string | null | undefined)[]): string | null {
  for (const value of candidates) {
    if (!value) continue;
    const match = value.match(/https?:\/\/(?:www\.)?reddit\.com\/r\/[a-z0-9_]+/i);
    if (match) return match[0];
  }
  return null;
}
