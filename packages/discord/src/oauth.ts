import { getDiscordOAuthConfig } from "./config";

const DISCORD_API_BASE = "https://discord.com/api/v10";

// "identify" gets id/username/avatar, which is what connect_discord_account
// (0025) stores. "guilds.join" (added 10 Agustus 2026) lets the callback
// route's addGuildMember() call (rest.ts) actually add the client to the
// Nimia Studio server using this OAuth token + the bot token together —
// the ORIGINAL assumption here was that clients would already be guild
// members (join via a normal invite link) and this flow would only ever
// link an existing membership. Production testing proved that wrong: a
// client connecting Discord for the first time who ISN'T already in the
// server never got added at all, which made assignGuildRole and
// addThreadMember (support tickets) silently no-op (Discord 404s "Unknown
// Member" for both against a non-member). Note: anyone who connected under
// the old "identify"-only scope has to Disconnect + Connect again to grant
// this new scope — Discord doesn't retroactively widen an existing grant.
const OAUTH_SCOPE = "identify guilds.join";

/** Builds the URL apps/studio's `/api/discord/connect` route redirects the
 * client to. `state` should be a random value the caller also stashes in a
 * short-lived cookie, so the callback route can confirm the request that
 * comes back from Discord matches the one it sent (CSRF protection — same
 * purpose as the `state` param in any OAuth2 flow). `redirectUri` MUST be
 * registered exactly (scheme, host, path) under this app's OAuth2 →
 * Redirects in the Discord Developer Portal, or Discord rejects the
 * request outright. */
export function getDiscordOAuthUrl(state: string, redirectUri: string): string {
  const { clientId } = getDiscordOAuthConfig();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: OAUTH_SCOPE,
    state,
    prompt: "consent",
  });
  return `https://discord.com/oauth2/authorize?${params.toString()}`;
}

export interface DiscordOAuthToken {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
}

/** Exchanges the `code` Discord's redirect back to `/api/discord/callback`
 * included for a real access token — server-to-server, using the app's
 * Client Secret, never exposed to the browser. `redirectUri` must be the
 * EXACT SAME value passed to getDiscordOAuthUrl above (Discord checks
 * this matches, not just that it's registered). */
export async function exchangeDiscordCode(
  code: string,
  redirectUri: string,
): Promise<DiscordOAuthToken> {
  const { clientId, clientSecret } = getDiscordOAuthConfig();

  const response = await fetch(`${DISCORD_API_BASE}/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!response.ok) {
    throw new Error(`Discord token exchange failed (${response.status}): ${await response.text()}`);
  }

  return (await response.json()) as DiscordOAuthToken;
}

export interface DiscordUser {
  id: string;
  username: string;
  avatarUrl: string | null;
}

/** Fetches the Discord account's own profile using the access token from
 * exchangeDiscordCode above (NOT the bot token — this is "who authorized
 * this app", not a bot lookup). `id` is the stable snowflake this whole
 * integration keys off (see 0025_discord_account_linking.sql's own
 * comment on why never the username). */
export async function getDiscordUser(accessToken: string): Promise<DiscordUser> {
  const response = await fetch(`${DISCORD_API_BASE}/users/@me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error(`Fetching the Discord profile failed (${response.status}): ${await response.text()}`);
  }

  const data = (await response.json()) as { id: string; username: string; avatar: string | null };

  return {
    id: data.id,
    username: data.username,
    avatarUrl: data.avatar
      ? `https://cdn.discordapp.com/avatars/${data.id}/${data.avatar}.png?size=128`
      : null,
  };
}
