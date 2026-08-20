import {
  getTelegramClientBotUsername,
  getTelegramMiniAppShortName,
  getTelegramMiniAppUrl,
  getTelegramStudioUrl,
} from "./config";

// Keyboard/deep-link builders for the client-facing bot (docs/TELEGRAM.md
// §2, §3, §10). Kept separate from client-bot.ts (the REST layer) the
// same way packages/discord/src/interactions.ts keeps payload-building
// separate from rest.ts's HTTP calls — these functions build plain
// objects/strings, never call `fetch` themselves.

export interface TelegramInlineButton {
  text: string;
  url?: string;
  web_app?: { url: string };
  callback_data?: string;
}

export type TelegramInlineKeyboard = { inline_keyboard: TelegramInlineButton[][] };

export function inlineKeyboard(rows: TelegramInlineButton[][]): TelegramInlineKeyboard {
  return { inline_keyboard: rows };
}

/** Builds the full URL to a specific screen inside the Mini App (e.g.
 * `orders/1024`, `partner`) — used as a `web_app` inline button's `url`.
 * `web_app` buttons only work in a PRIVATE chat with the bot (a Telegram
 * Bot API restriction), which is exactly the shape every call site here
 * is: the bot's own /start reply, and every lifecycle notification
 * planned for notify.ts (docs/TELEGRAM.md §9), are always sent to the
 * client's own 1:1 chat with the bot, never a group/channel. */
export function miniAppUrl(path = ""): string {
  const base = getTelegramMiniAppUrl().replace(/\/$/, "");
  return path ? `${base}/${path.replace(/^\//, "")}` : base;
}

/** `t.me/<bot>/<shortname>?startapp=<payload>` — Telegram's OTHER Mini
 * App entry mechanism (docs/TELEGRAM.md §10): a plain shareable link
 * (not an in-message button) that opens the Mini App from anywhere, even
 * outside a chat with the bot. Not used by any bot message in this
 * package today — every message the bot itself sends uses a `web_app`
 * button (miniAppUrl above) instead, which is simpler for that specific
 * case. Kept here for the one case that DOES need a shareable plain URL:
 * the Partner Dashboard's own referral-link "Share on Telegram" action
 * inside the Mini App itself (a future apps/miniapp/app/partner pass),
 * which needs a link that works when pasted into ANY chat, not just this
 * bot's own messages. */
export function miniAppStartAppLink(payload?: string): string {
  const username = getTelegramClientBotUsername();
  const shortName = getTelegramMiniAppShortName();
  const base = `https://t.me/${username}/${shortName}`;
  return payload ? `${base}?startapp=${encodeURIComponent(payload)}` : base;
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** The bot's own welcome message text (docs/TELEGRAM.md §1's example
 * copy) — `parse_mode: "HTML"`, same convention as notify.ts's
 * escapeHtml for the one field here that could contain user-controlled
 * text (the Telegram account's own first name). */
export function buildWelcomeText(firstName?: string | null): string {
  const greeting = firstName ? `Welcome to Nimia Studio, ${escapeHtml(firstName)} 👋` : "Welcome to Nimia Studio 👋";
  return `${greeting}\n<b>Professional Game &amp; Digital Production.</b>\n\nWhat would you like to do?`;
}

/** The 5-button main menu (docs/TELEGRAM.md §1) — the FIRST thing every
 * `/start` (with no deep-link payload) gets back. Every button except
 * "Open Nimia Studio" opens the Mini App directly to that section; "Open
 * Nimia Studio" is a plain `url` button to the marketing site itself,
 * deliberately NOT a `web_app` button (a client asking to leave the app
 * entirely should get their normal browser, not stay trapped in the
 * Mini App's webview). */
export function buildMainMenuKeyboard(): TelegramInlineKeyboard {
  return inlineKeyboard([
    [{ text: "🎮 Start a Project", web_app: { url: miniAppUrl("services") } }],
    [{ text: "📦 My Orders", web_app: { url: miniAppUrl("orders") } }],
    [{ text: "🤝 Partner Program", web_app: { url: miniAppUrl("partner") } }],
    [{ text: "💬 Support", web_app: { url: miniAppUrl("account") } }],
    [{ text: "🌐 Open Nimia Studio", url: getTelegramStudioUrl() }],
  ]);
}
