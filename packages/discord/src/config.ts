// Reads the Discord env vars this package needs, with a clear error the
// moment one is missing rather than a confusing failure deep inside a
// fetch call. See this package's own README.md for exactly how to obtain
// each value from the Discord Developer Portal / the Discord app itself.
//
// Deliberately split into two groups, read lazily (not at module load —
// see the functions below) rather than all validated up front: OAuth_CONFIG
// is only needed by apps/studio's connect/callback routes, BOT_CONFIG is
// needed by anything that calls the Discord REST API as the bot (role
// assignment, channel messages, threads — apps/studio AND apps/admin).
// Reading lazily means an app that only ever needs one half (e.g. a
// future admin-only notification action) doesn't fail to boot just
// because the other half's env vars aren't set there.

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing ${name} — see packages/discord/README.md for where to get this value and which .env file it goes in.`,
    );
  }
  return value;
}

export function getDiscordOAuthConfig() {
  return {
    clientId: requireEnv("DISCORD_CLIENT_ID"),
    clientSecret: requireEnv("DISCORD_CLIENT_SECRET"),
  };
}

export function getDiscordBotConfig() {
  return {
    botToken: requireEnv("DISCORD_BOT_TOKEN"),
    guildId: requireEnv("DISCORD_GUILD_ID"),
  };
}

// Individual role/channel IDs are read where they're used (not bundled
// into getDiscordBotConfig above) so a missing one only breaks the ONE
// feature that needs it — e.g. DISCORD_ROLE_PARTNER_ID not being set yet
// shouldn't stop Client-role assignment from working.
export function getDiscordRoleId(role: "client" | "partner"): string {
  return requireEnv(role === "client" ? "DISCORD_ROLE_CLIENT_ID" : "DISCORD_ROLE_PARTNER_ID");
}

export function getDiscordChannelId(
  channel:
    | "new-orders"
    | "negotiations"
    | "payment-verification"
    | "system-log"
    | "support"
    // Public Community + Partner Program gamification phase (11 Agustus
    // 2026) — see docs/DISCORD.md's "Public Community" and "Partner
    // Discord Channel" sections. "partner-joined" only fires for signups
    // with explicit partner intent (via the /partners page or a referral
    // code — see notifyPartnerJoined's own comment in gamification.ts for
    // why NOT every signup, even though every account technically becomes
    // a Partner per 0016).
    | "partner-joined"
    | "recent-rewards"
    | "partner-leaderboard"
    | "partner-success",
): string {
  const envName =
    {
      "new-orders": "DISCORD_CHANNEL_NEW_ORDERS_ID",
      negotiations: "DISCORD_CHANNEL_NEGOTIATIONS_ID",
      "payment-verification": "DISCORD_CHANNEL_PAYMENT_VERIFICATION_ID",
      "system-log": "DISCORD_CHANNEL_SYSTEM_LOG_ID",
      // Support-ticket pass (9 Agustus 2026) — docs/DISCORD.md's
      // "#create-ticket" channel under SUPPORT. Every private ticket
      // thread is created inside this one channel.
      support: "DISCORD_CHANNEL_SUPPORT_ID",
      // Gamification phase (11 Agustus 2026) — the 4 new channels under
      // docs/DISCORD.md's "Partner Discord Channel" section.
      "partner-joined": "DISCORD_CHANNEL_PARTNER_JOINED_ID",
      "recent-rewards": "DISCORD_CHANNEL_RECENT_REWARDS_ID",
      "partner-leaderboard": "DISCORD_CHANNEL_PARTNER_LEADERBOARD_ID",
      "partner-success": "DISCORD_CHANNEL_PARTNER_SUCCESS_ID",
    } as const satisfies Record<typeof channel, string>;
  return requireEnv(envName[channel]);
}
