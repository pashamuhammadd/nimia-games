// @nimia/telegram — thin wrapper around the Telegram Bot API, built on
// plain `fetch` only (no node-telegram-bot-api or any other SDK). Mirrors
// @nimia/discord's own "no SDK" reasoning: every call this package makes
// is a one-shot outbound `sendMessage`, triggered by something that already
// happened elsewhere (an AI Prospect Hunter run finding a new project) —
// never a persistent long-polling/webhook listener, so a full bot
// framework would buy nothing here. See README.md for how to obtain the
// bot token and channel id.

export {
  getTelegramBotConfig,
  getTelegramChannelId,
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
