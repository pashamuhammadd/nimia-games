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
// getTelegramBotConfig above) so a missing one only breaks the ONE feature
// that needs it. Only one channel exists today (AI Prospect Hunter's
// Nimia Partner Program broadcast, 19 Agustus 2026) but this is typed as
// a union — same pattern as packages/discord/src/config.ts's
// getDiscordChannelId — so adding a second channel later is a one-line
// change here, not a signature change for every caller.
export function getTelegramChannelId(channel: "prospect-hunter"): string {
  const envName =
    {
      "prospect-hunter": "TELEGRAM_CHANNEL_PROSPECT_HUNTER_ID",
    } as const satisfies Record<typeof channel, string>;
  return requireEnv(envName[channel]);
}
