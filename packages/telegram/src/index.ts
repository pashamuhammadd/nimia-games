// @nimia/telegram — thin wrapper around the Telegram Bot API, built on
// plain `fetch` only (no node-telegram-bot-api, telegraf, or any other
// SDK). Mirrors @nimia/discord's own "no SDK" reasoning: every call this
// package makes is a one-shot outbound REST request or a single inbound
// webhook, never a persistent long-polling/Gateway connection.
//
// Two bots live in this one package, deliberately kept separate end to
// end (see config.ts's "Client-facing bot + Mini App" section for why):
//   - The ORIGINAL bot (config.ts/rest.ts/notify.ts) — AI Prospect
//     Hunter's internal one-way broadcast to a single admin channel.
//   - The CLIENT-FACING bot (client-bot.ts/webapp-auth.ts/keyboards.ts,
//     added 20 Agustus 2026) — the public bot + Mini App described in
//     docs/TELEGRAM.md, with its own token, webhook, and Mini App
//     session bridge.
// See README.md for how to obtain every credential either bot needs.

export {
  getTelegramBotConfig,
  getTelegramChannelId,
  getTelegramClientBotConfig,
  getTelegramClientBotUsername,
  getTelegramWebhookSecret,
  getTelegramMiniAppUrl,
  getTelegramMiniAppShortName,
  getTelegramStudioUrl,
} from "./config";
export {
  sendTelegramMessage,
  buildInlineKeyboard,
  type TelegramLinkButton,
} from "./rest";
export {
  notifyProspectFound,
  type ProspectFoundInput,
} from "./notify";
export {
  sendClientBotMessage,
  answerCallbackQuery,
  setWebhook,
  setMyCommands,
} from "./client-bot";
export {
  verifyTelegramInitData,
  type VerifiedTelegramUser,
} from "./webapp-auth";
export {
  inlineKeyboard,
  miniAppUrl,
  miniAppStartAppLink,
  buildWelcomeText,
  buildMainMenuKeyboard,
  type TelegramInlineButton,
  type TelegramInlineKeyboard,
} from "./keyboards";
