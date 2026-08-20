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
 * text (the Telegram account's own first name). Kept as the fallback
 * plain-text `/start` reply (sendClientBotMessage) for when
 * getTelegramWelcomeImageUrl() isn't configured — see
 * buildWelcomeCaption below for the richer photo-caption version sent
 * when an image IS configured. */
export function buildWelcomeText(firstName?: string | null): string {
  const greeting = firstName ? `Welcome to Nimia Studio, ${escapeHtml(firstName)} 👋` : "Welcome to Nimia Studio 👋";
  return `${greeting}\n<b>Professional Game &amp; Digital Production.</b>\n\nWhat would you like to do?`;
}

/** The richer `/start` copy sent as a photo caption (client-bot.ts's
 * sendClientBotPhoto) when TELEGRAM_WELCOME_IMAGE_URL is configured —
 * pitches the studio's services + the Partner Program's referral-
 * commission angle in one message, per the copy Pasha supplied 20
 * Agustus 2026. Kept under Telegram's 1024-char photo-caption limit
 * (~570 chars as written — see this package's own test count before
 * editing this string, a caption over the limit makes sendPhoto fail
 * outright). Deliberately does NOT reuse the outreach copy's "Sorry if
 * this message comes at an inconvenient time" line — that line only
 * makes sense for an unsolicited cold DM (AI Prospect Hunter's use
 * case, notify.ts), not here, where the person just typed /start
 * themselves. */
export function buildWelcomeCaption(firstName?: string | null): string {
  const greeting = firstName ? `Hey ${escapeHtml(firstName)} 👋` : "Hey there 👋";
  return (
    `${greeting}\n\n` +
    `We're <b>Nimia Studio</b> — a creative &amp; development partner helping Web3 projects look more professional, credible, and launch-ready.\n\n` +
    `We can help with:\n` +
    `🎨 Animation\n` +
    `🌐 Websites &amp; landing pages\n` +
    `🤖 Bots &amp; custom systems\n` +
    `🎮 Game development\n` +
    `😂 Memes &amp; creative content\n` +
    `✨ Branding &amp; other creative production\n\n` +
    `Have a project? Let's take it to the next level.\n` +
    `Know someone who needs this? Introduce them and earn a commission when they become a client — no selling, no project management, we handle the rest.\n\n` +
    `What would you like to do? 👇`
  );
}

/** `nimiastudio.com/portfolio` — a plain `url` button (docs/TELEGRAM.md's
 * "Open Nimia Studio" button already establishes the precedent: a client
 * asking to see finished work should land in their normal browser, not
 * stay trapped in the Mini App's webview, same reasoning as that button
 * below). Built from getTelegramStudioUrl() rather than a new env var —
 * one less credential to configure for a path that's always the same
 * origin as the studio site itself. */
function portfolioUrl(): string {
  return `${getTelegramStudioUrl().replace(/\/$/, "")}/portfolio`;
}

/** The main menu (docs/TELEGRAM.md §1) — the FIRST thing every `/start`
 * (with no deep-link payload) gets back, either as this keyboard alone
 * (buildWelcomeText, plain sendClientBotMessage) or attached to
 * buildWelcomeCaption's photo (sendClientBotPhoto) when an image is
 * configured. Every button except "View Our Portfolio" and "Open Nimia
 * Studio" opens the Mini App directly to that section; those two are
 * deliberately plain `url` buttons instead of `web_app` — a client
 * asking to see finished work or leave the app entirely should get
 * their normal browser, not stay trapped in the Mini App's webview. */
export function buildMainMenuKeyboard(): TelegramInlineKeyboard {
  return inlineKeyboard([
    [{ text: "🎮 Start a Project", web_app: { url: miniAppUrl("services") } }],
    [{ text: "🤝 Partner Program", web_app: { url: miniAppUrl("partner") } }],
    [{ text: "🎨 View Our Portfolio", url: portfolioUrl() }],
    [
      { text: "📦 My Orders", web_app: { url: miniAppUrl("orders") } },
      { text: "💬 Support", web_app: { url: miniAppUrl("account") } },
    ],
    [{ text: "🌐 Open Nimia Studio", url: getTelegramStudioUrl() }],
  ]);
}
