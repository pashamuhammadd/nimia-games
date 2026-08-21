// Env config for the Telegram Business Sales Assistant — see
// docs/TELEGRAM_BUSINESS_BOT.md for the full architecture and
// docs/TELEGRAM_BUSINESS_BOT.md §3 for why this is a THIRD, fully
// separate bot/token from both the AI Prospect Hunter bot (config.ts's
// getTelegramBotConfig) and the client-facing Mini App bot
// (config.ts's getTelegramClientBotConfig): three different personas,
// three different trust models, sharing one bot would mean any change
// to one persona risks regressing the others. Same "requireEnv, read
// lazily" convention as every other config.ts in this monorepo.

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing ${name} — see packages/telegram/README.md's "Business Sales Assistant" section for where to get this value and which .env file it goes in.`,
    );
  }
  return value;
}

export function getTelegramBusinessBotConfig() {
  return { botToken: requireEnv("TELEGRAM_BUSINESS_BOT_TOKEN") };
}

/** Shared secret this app sets when registering the webhook (Telegram's
 * `setWebhook` `secret_token` parameter) and checks on every inbound
 * request against the `X-Telegram-Bot-Api-Secret-Token` header — same
 * mechanism, same reasoning, as getTelegramWebhookSecret (the Mini App
 * bot's own webhook secret) but deliberately a SEPARATE value: these are
 * two different bots with two different webhook URLs
 * (apps/miniapp/app/api/telegram/business/webhook/route.ts vs
 * .../telegram/webhook/route.ts), and a leaked secret for one must never
 * grant access to the other. */
export function getTelegramBusinessWebhookSecret(): string {
  return requireEnv("TELEGRAM_BUSINESS_WEBHOOK_SECRET");
}

// Deliberately NO "admin Telegram user id" env var here — unlike a
// static config value, WHO owns the Business Connection is something
// Telegram itself tells us (the business_connection update's own
// `user.id`), stored in `telegram_business_connections`
// (migration 0055) the moment Pasha connects the bot. Hardcoding it as
// an env var would (a) require a manual step before the bot could even
// detect its own owner, and (b) go stale the moment Pasha ever
// reconnects. See app/lib/business-bot/leads.ts's
// getBusinessConnectionOwner for how the webhook resolves this
// dynamically instead.
