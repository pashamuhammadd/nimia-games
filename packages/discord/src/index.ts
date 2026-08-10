// @nimia/discord — thin wrapper around Discord's REST API (OAuth2 account
// linking + bot-token calls). Deliberately built on plain `fetch`, no
// discord.js or any other SDK — per docs/DISCORD.md, this integration
// never needs a persistent Gateway (websocket) connection, only one-shot
// REST calls triggered by things that already happened on the website, so
// a heavier dependency would buy nothing here. See README.md for the full
// list of env vars each export needs and how to obtain each Discord-side
// ID/secret.

export { getDiscordOAuthUrl, exchangeDiscordCode, getDiscordUser, type DiscordUser, type DiscordOAuthToken } from "./oauth";
export { assignGuildRole, removeGuildRole } from "./rest";
export { getDiscordRoleId, getDiscordChannelId } from "./config";
