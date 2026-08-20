// Reads the Telegram env vars this package needs, with a clear error the
// moment one is missing rather than a confusing failure deep inside a
// fetch call. See this package's own README.md for exactly how to obtain
// each value from @BotFather / Telegram itself.
//
// Deliberately mirrors packages/discord/src/config.ts's shape (requireEnv
// helper, lazy per-function reads) — same reasoning: an app that only ever
// needs one channel id shouldn't fail to boot just because an unrelated
// env var isn't set there.

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing ${name} — see packages/telegram/README.md for where to get this value and which .env file it goes in.`,
    );
  }
  return value;
}

export function getTelegramBotConfig() {
  return {
    botToken: requireEnv("TELEGRAM_BOT_TOKEN"),
  };
}

// Individual channel ids are read where they're used (not bundled into
// getTelegramBotConfig above) so a missing one only breaks the ONE
// feature that needs it. Only one channel exists today (AI Prospect
// Hunter's Nimia Partner Program broadcast, 19 Agustus 2026) but this is
// typed as a union — same pattern as packages/discord/src/config.ts's
// getDiscordChannelId — so adding a second channel later is a one-line
// change here, not a signature change for every caller.
export function getTelegramChannelId(channel: "prospect-hunter"): string {
  const envName =
    {
      "prospect-hunter": "TELEGRAM_CHANNEL_PROSPECT_HUNTER_ID",
    } as const satisfies Record<typeof channel, string>;
  return requireEnv(envName[channel]);
}

// ------------------------------------------------------------------
// Client-facing bot + Mini App (added 20 Agustus 2026, docs/TELEGRAM.md)
// ------------------------------------------------------------------
//
// Deliberately a SEPARATE bot/token from getTelegramBotConfig above —
// that one is the AI Prospect Hunter's internal broadcast bot (one
// admin-only channel, no webhook, no user-facing identity, see this
// package's own README.md). This one is a public-facing product surface
// (client DMs, the Mini App's own identity) with a completely different
// permission/trust model, so it gets its own BotFather bot and its own
// token — see docs/TELEGRAM.md §0 for why sharing one bot between the
// two personas was rejected. Every getter below follows the same
// "requireEnv, read lazily" convention as the rest of this file and
// packages/discord/src/config.ts — an app that only needs one half
// (e.g. a future admin-only Telegram notification) shouldn't fail to
// boot just because the other half's env vars aren't set there.

export function getTelegramClientBotConfig() {
  return { botToken: requireEnv("TELEGRAM_CLIENT_BOT_TOKEN") };
}

/** The client-facing bot's own @username (no leading @) — used to build
 * the `t.me/<username>/<shortname>?startapp=` shareable link format
 * (keyboards.ts's miniAppStartAppLink). Get this from @BotFather right
 * after creating the bot (same screen that gives you the token). */
export function getTelegramClientBotUsername(): string {
  return requireEnv("TELEGRAM_CLIENT_BOT_USERNAME");
}

/** Shared secret this app sets when registering the webhook (Telegram's
 * `setWebhook` `secret_token` parameter, client-bot.ts's setWebhook) and
 * checks on every inbound request against the
 * `X-Telegram-Bot-Api-Secret-Token` header — see
 * apps/miniapp/app/api/telegram/webhook/route.ts. This is Telegram's
 * built-in webhook-auth mechanism, the equivalent of Discord's Ed25519
 * public-key verification (packages/discord/src/interactions.ts) but
 * simpler: a shared secret rather than asymmetric signing, because
 * Telegram's webhook model has no separate "public key" concept.
 * Generate any long random string for this. */
export function getTelegramWebhookSecret(): string {
  return requireEnv("TELEGRAM_WEBHOOK_SECRET");
}

/** The Mini App's own deployed origin (e.g. https://miniapp.nimiastudio.com)
 * — used to build `web_app` inline button URLs (keyboards.ts's
 * miniAppUrl). Deliberately a full origin, not just a path, because
 * apps/miniapp is its own Vercel project/domain per this monorepo's
 * "one app = one Vercel project" convention (see docs/TELEGRAM.md §12). */
export function getTelegramMiniAppUrl(): string {
  return requireEnv("TELEGRAM_MINIAPP_URL");
}

/** The Mini App's "short name" as registered with @BotFather (/newapp)
 * — only used to build the `t.me/<bot>/<shortname>` shareable link
 * format (keyboards.ts's miniAppStartAppLink), NOT the `web_app` button
 * URLs (those point straight at getTelegramMiniAppUrl's own domain). */
export function getTelegramMiniAppShortName(): string {
  return requireEnv("TELEGRAM_MINIAPP_SHORT_NAME");
}

/** nimiastudio.com's own public URL — used only for the "Open Nimia
 * Studio" main-menu button (keyboards.ts), which is a deliberately plain
 * `url` button (opens the client's regular browser, not the Mini App) —
 * same distinction apps/portfolio's own NEXT_PUBLIC_STUDIO_URL makes.
 * Falls back to production so local dev doesn't need this set to test
 * the rest of the bot. */
export function getTelegramStudioUrl(): string {
  return process.env.TELEGRAM_STUDIO_URL || "https://nimiastudio.com";
}
