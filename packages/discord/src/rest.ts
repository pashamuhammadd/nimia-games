import { getDiscordBotConfig } from "./config";

const DISCORD_API_BASE = "https://discord.com/api/v10";

/** Low-level helper every bot-token REST call below goes through — not
 * exported (this package's public surface is the specific actions below,
 * e.g. assignGuildRole, not a generic "call any Discord endpoint"
 * escape hatch). Centralizes the one thing every bot call needs: the
 * `Bot <token>` auth header, which is a completely different credential
 * from the OAuth access tokens in oauth.ts (bot token = this app acting
 * as itself; OAuth token = this app acting on behalf of whichever user
 * just authorized it). */
async function discordBotFetch(path: string, init?: RequestInit): Promise<Response> {
  const { botToken } = getDiscordBotConfig();
  const response = await fetch(`${DISCORD_API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bot ${botToken}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  return response;
}

/** Grants `roleId` to `discordUserId` in the configured guild
 * (DISCORD_GUILD_ID). Requires the bot's own role to sit ABOVE `roleId`
 * in the server's role list (Discord permission model, not something
 * this code can work around) — see this package's README for the "drag
 * the bot's role above Client/Partner" step. PUT is idempotent — calling
 * this on someone who already has the role is a harmless no-op (204), so
 * callers don't need to check current roles first. */
export async function assignGuildRole(discordUserId: string, roleId: string): Promise<void> {
  const { guildId } = getDiscordBotConfig();
  const response = await discordBotFetch(
    `/guilds/${guildId}/members/${discordUserId}/roles/${roleId}`,
    { method: "PUT" },
  );

  if (!response.ok && response.status !== 204) {
    throw new Error(
      `Discord role assign failed (${response.status}): ${await response.text()} — ` +
        `check the bot's role is positioned above the target role in Server Settings → Roles.`,
    );
  }
}

/** Removes `roleId` from `discordUserId` — used by disconnectDiscordAction
 * (apps/studio) so unlinking a Discord account also drops the role it was
 * granted, rather than leaving a stale Client/Partner role on someone who
 * disconnected. Same idempotency note as assignGuildRole above. */
export async function removeGuildRole(discordUserId: string, roleId: string): Promise<void> {
  const { guildId } = getDiscordBotConfig();
  const response = await discordBotFetch(
    `/guilds/${guildId}/members/${discordUserId}/roles/${roleId}`,
    { method: "DELETE" },
  );

  if (!response.ok && response.status !== 204) {
    throw new Error(`Discord role remove failed (${response.status}): ${await response.text()}`);
  }
}
