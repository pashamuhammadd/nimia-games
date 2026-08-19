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

// Interactions endpoint pair (added 12 Agustus 2026, in-Discord ticket
// button — see docs/DISCORD.md's "In-Discord ticket button" section and
// interactions.ts). Neither of these is the bot token — they're the OTHER
// two credentials Discord's Interactions HTTP endpoint model needs: a
// public key to verify a request actually came from Discord, and the
// Application ID to address the per-interaction webhook used to edit a
// deferred response. Kept separate from getDiscordBotConfig above (not
// bundled in) so apps/admin, which never receives interactions, doesn't
// need either of these set.

/** Discord Developer Portal → General Information → "Public Key" — not a
 * secret (Discord shows it in plaintext), but still required: this is what
 * verifyDiscordInteractionRequest (interactions.ts) checks every incoming
 * request against before trusting anything in its body. */
export function getDiscordPublicKey(): string {
  return requireEnv("DISCORD_PUBLIC_KEY");
}

/** The bot Application's own snowflake id. This is the EXACT SAME value as
 * DISCORD_CLIENT_ID (same field, Discord just labels it differently
 * depending which page of the Developer Portal you're on) — reused here
 * rather than adding a second env var for the same number. Needed to edit a
 * deferred interaction response (interactions.ts's editInteractionResponse)
 * — that endpoint is scoped by application id + interaction token, not by
 * bot token. */
export function getDiscordApplicationId(): string {
  return requireEnv("DISCORD_CLIENT_ID");
}

// Individual role/channel IDs are read where they're used (not bundled
// into getDiscordBotConfig above) so a missing one only breaks the ONE
// feature that needs it — e.g. DISCORD_ROLE_PARTNER_ID not being set yet
// shouldn't stop Client-role assignment from working.
export function getDiscordRoleId(role: "client" | "partner"): string {
  return requireEnv(role === "client" ? "DISCORD_ROLE_CLIENT_ID" : "DISCORD_ROLE_PARTNER_ID");
}

// Ticket staff auto-add (added 19 Agustus 2026, per user request — a
// private ticket thread's own member list was only ever showing the Bot +
// Client, never Founder/Admin). "Manage Threads" on #create-ticket (see
// docs/DISCORD.md's "Server setup notes") lets staff BROWSE to a private
// thread, but that's a permission check, not membership — it never adds
// them as an actual thread member, so they never showed up in the
// thread's own member list and could miss @mentions/notifications for it.
//
// Role ids, NOT specific accounts (per user clarification — "maksudnya
// bukan founder dan admin account, tapi role admin dan foundernya"):
// createSupportTicket (tickets.ts) resolves who currently holds each role
// via listGuildMemberIdsWithRole (rest.ts) at ticket-creation time and
// adds all of them as thread members, so promoting/demoting someone from
// Founder or Admin in Discord itself is the only thing that needs to
// change — no code or env update, unlike a static account-id list would
// need. Deliberately NOT requireEnv'd like the channel/role ids above:
// either one being unset just means that role's members aren't
// auto-added yet, not a hard failure — a caller can configure Admin now
// and Founder later (or vice versa) without breaking ticket creation.
export function getDiscordStaffRoleIds(): string[] {
  return [process.env.DISCORD_ROLE_FOUNDER_ID, process.env.DISCORD_ROLE_ADMIN_ID].filter(
    (id): id is string => Boolean(id),
  );
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
