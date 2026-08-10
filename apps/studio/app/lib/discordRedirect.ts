// Shared by both app/api/discord/connect/route.ts and .../callback/route.ts
// — Discord's OAuth2 spec requires the `redirect_uri` sent to the
// authorize URL and the one sent to the token-exchange call to be BYTE-
// FOR-BYTE identical, or the exchange is rejected outright. Computing it
// in one place instead of duplicating the same expression in both route
// files removes the risk of the two silently drifting apart later (same
// class of bug as apps/www's old canonical-URL drift — see
// [[rebuild_decisions]] — one copy edited, the other forgotten).
export function getDiscordRedirectUri(requestUrl: string): string {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(requestUrl).origin;
  return `${base}/api/discord/callback`;
}

// Name + short lifetime for the CSRF-protection cookie connect/route.ts
// sets and callback/route.ts checks. Scoped to /api/discord (not the
// whole site) since nothing outside this flow ever needs to read it.
export const DISCORD_OAUTH_STATE_COOKIE = "nimia_discord_oauth_state";
export const DISCORD_OAUTH_STATE_MAX_AGE_SECONDS = 600; // 10 minutes — plenty for a login+consent round trip, short enough that a stale cookie can't be replayed later.
