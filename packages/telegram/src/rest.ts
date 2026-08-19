import { getTelegramBotConfig } from "./config";

const TELEGRAM_API_BASE = "https://api.telegram.org";

/** Low-level helper every bot call below goes through — mirrors
 * packages/discord/src/rest.ts's discordBotFetch. Telegram's Bot API auth
 * model is simpler than Discord's (no header — the token is part of the
 * URL path itself, `/bot<TOKEN>/<method>`), but this still centralizes the
 * base URL + JSON content-type + JSON-encoding the body so callers below
 * don't repeat it. Not exported — this package's public surface is the
 * specific actions below, not a generic "call any Telegram method"
 * escape hatch. */
async function telegramBotFetch(method: string, body: Record<string, unknown>): Promise<Response> {
  const { botToken } = getTelegramBotConfig();
  return fetch(`${TELEGRAM_API_BASE}/bot${botToken}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

/** A single Telegram inline-keyboard link button — clicking it just opens
 * `url`, exactly like packages/discord/src/rest.ts's DiscordLinkButton
 * (same reasoning: link buttons never trigger a callback to this app, so
 * there is no interaction handler to build for either platform). Added 19
 * Agustus 2026 for the AI Prospect Hunter partner broadcast — same product
 * decision as the Discord side: never a "Mark as Contacted" button, only
 * plain outbound links to the prospect's own channels. */
export type TelegramLinkButton = { label: string; url: string };

/** Wraps `TelegramLinkButton`s into an `inline_keyboard` — one button per
 * row (unlike Discord's buildLinkButtonRow, which packs up to 5 into a
 * single row because Discord caps components-per-row at 5). Telegram has
 * no such tight per-row cap, but one-per-row reads better on mobile for a
 * short, clearly-labeled list like "Website / Twitter / Telegram /
 * Discord / CoinGecko" — a wide multi-button row would shrink each label
 * to the point of being hard to tap. */
export function buildInlineKeyboard(buttons: TelegramLinkButton[]): {
  inline_keyboard: { text: string; url: string }[][];
} {
  return {
    inline_keyboard: buttons.map((button) => [{ text: button.label.slice(0, 64), url: button.url }]),
  };
}

/** Posts a message to `chatId` as the bot (added 19 Agustus 2026, AI
 * Prospect Hunter partner broadcast). `chatId` is whatever
 * getTelegramChannelId (config.ts) returns for the target channel — for a
 * Telegram CHANNEL that's the channel's own numeric id (looks like
 * `-1001234567890`) or its `@username` if it's public; see this package's
 * README for how to obtain either. `parseMode: "HTML"` lets the caller use
 * a small safe subset of HTML tags (`<b>`, `<i>`, `<a href>`, etc.) in
 * `text` — notify.ts is responsible for HTML-escaping any untrusted
 * project-supplied text (name, reasoning, etc.) before it reaches here,
 * this function does no escaping of its own. `disable_web_page_preview:
 * true` is always sent — a project's own website/CoinGecko link already
 * appears as a proper button below the message (via `replyMarkup`), so an
 * auto-expanded link preview card would just be visual noise/duplication.
 * Throws on a non-2xx (or Telegram's own `{ok:false}` body shape, which
 * the Bot API returns with HTTP 200 for some errors) so notify.ts's
 * safeSend has something to catch — same "never let a failure here escape
 * to the caller" posture as the Discord package. */
export async function sendTelegramMessage(
  chatId: string,
  text: string,
  replyMarkup?: { inline_keyboard: { text: string; url: string }[][] },
): Promise<void> {
  const response = await telegramBotFetch("sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    disable_web_page_preview: true,
    ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
  });

  const rawBody = await response.text().catch(() => "");
  let data: { ok?: boolean; description?: string } | null = null;
  try {
    data = rawBody ? (JSON.parse(rawBody) as { ok?: boolean; description?: string }) : null;
  } catch {
    // Non-JSON body (e.g. an upstream 5xx HTML error page) — fall through
    // and report the raw text below instead.
  }

  if (!response.ok || !data?.ok) {
    throw new Error(`Telegram sendMessage failed (${response.status}): ${data?.description ?? (rawBody || "unknown error")}`);
  }
}
