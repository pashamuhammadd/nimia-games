// Shared HTTP plumbing for CoinGecko's official public "Demo" API plan —
// used by both coingecko-memecoin-provider.ts and coingecko-nft-provider.ts.
// Kept in one file so both providers authenticate and time out the exact
// same way, and so moving to a paid Pro plan later (different base URL /
// header — see docs.coingecko.com) is a one-file change.
//
// Commercial-use note (checked 12 Agustus 2026, in direct response to the
// same question that was asked about Reddit — see this app's chat
// history / lib/ai-agent/README.md): CoinGecko's API Terms
// (coingecko.com/en/api_terms, section 4.1.6) explicitly PERMIT charging
// for a product/service that incorporates the CoinGecko API on the free
// Demo plan — no separate commercial license is required, unlike Reddit's
// Data API. The two hard requirements are (a) attribution — a visible
// "Powered by CoinGecko" wherever results are shown, see
// app/(protected)/ai-client-hunter/leads/LeadDetailPanel.tsx's
// CoinGeckoAttribution — and (b) not reselling/redistributing raw API
// access, and not using the data for ad-targeting (neither of which this
// app does). Re-read the terms yourself if Nimia's usage changes
// materially (e.g. much higher volume, or redistributing raw data outside
// this app) — this comment is not legal advice.

const COINGECKO_BASE_URL = "https://api.coingecko.com/api/v3";
const REQUEST_TIMEOUT_MS = 8000;

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
    if (!response.ok) {
      throw new Error(`CoinGecko ${path} returned ${response.status}`);
    }
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

/** Best-effort Discord-invite scan across a handful of link fields.
 * CoinGecko's coin schema has no dedicated `discord` field (see
 * coingecko-memecoin-provider.ts's header comment), so a Discord invite
 * is only ever detected when a project happens to have put one in
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
