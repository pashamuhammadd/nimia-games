// @nimia/telegram — thin wrapper around the Telegram Bot API, built on
// plain `fetch` only (no node-telegram-bot-api, telegraf, or any other
// SDK). Mirrors @nimia/discord's own "no SDK" reasoning: every call this
// package makes is a one-shot outbound REST request or a single inbound
// webhook, never a persistent long-polling/Gateway connection.
//
// THREE bots live in this one package, deliberately kept separate end
// to end (see business/config.ts's top comment for why a third was
// added rather than reusing either existing one):
//   - The ORIGINAL bot (config.ts/rest.ts/notify.ts) — AI Prospect
//     Hunter's internal one-way broadcast to a single admin channel.
//   - The CLIENT-FACING bot (client-bot.ts/webapp-auth.ts/keyboards.ts,
//     added 20 Agustus 2026) — the public bot + Mini App described in
//     docs/TELEGRAM.md, with its own token, webhook, and Mini App
//     session bridge.
//   - The BUSINESS SALES ASSISTANT bot (business/*, added 21 Agustus
//     2026) — connects to Pasha's own personal Telegram Business
//     account to auto-qualify leads who message him directly. See
//     docs/TELEGRAM_BUSINESS_BOT.md for the full architecture.
// See README.md for how to obtain every credential each bot needs.

export {
  getTelegramBotConfig,
  getTelegramChannelId,
  getTelegramClientBotConfig,
  getTelegramClientBotUsername,
  getTelegramWebhookSecret,
  getTelegramMiniAppUrl,
  getTelegramMiniAppShortName,
  getTelegramStudioUrl,
  getTelegramWelcomeImageUrl,
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
  sendClientBotPhoto,
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
  buildWelcomeCaption,
  buildMainMenuKeyboard,
  type TelegramInlineButton,
  type TelegramInlineKeyboard,
} from "./keyboards";

// ------------------------------------------------------------------
// Business Sales Assistant (added 21 Agustus 2026)
// ------------------------------------------------------------------
export { getTelegramBusinessBotConfig, getTelegramBusinessWebhookSecret } from "./business/config";
export {
  sendBusinessMessage,
  sendBusinessBotOwnMessage,
  answerBusinessCallbackQuery,
  getBusinessConnection,
  setBusinessWebhook,
} from "./business/rest";
export {
  inlineKeyboard as businessInlineKeyboard,
  buildBusinessMainMenuKeyboard,
  buildAnimationSubmenuKeyboard,
  buildLeadActionsKeyboard,
  BUSINESS_SERVICE_OPTIONS,
  ANIMATION_SUBTYPE_OPTIONS,
  type BusinessServiceId,
  type AnimationSubtypeId,
  type TelegramInlineButton as BusinessInlineButton,
  type TelegramInlineKeyboard as BusinessInlineKeyboard,
} from "./business/keyboards";
export {
  withDisclaimer,
  buildWelcomeMessage,
  buildAnimationMenuMessage,
  buildAnimationBriefPrompt,
  buildServiceBriefPrompt,
  buildBudgetFollowUpMessage,
  buildLeadCompleteMessage,
  buildNewLeadNotification,
  buildServiceHeading,
} from "./business/messages";
export { detectBudgetInText } from "./business/lead-parser";
export { interpretLeadMessage, type LeadMessageInterpretation } from "./business/ai";
