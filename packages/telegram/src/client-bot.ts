import { getTelegramClientBotConfig } from "./config";
import type { TelegramInlineKeyboard } from "./keyboards";

const TELEGRAM_API_BASE = "https://api.telegram.org";

// REST layer for the client-facing bot (docs/TELEGRAM.md §2, §12).
// Deliberately a SEPARATE module from rest.ts, not a parameterized
// version of it — rest.ts/telegramBotFetch is keyed to the AI Prospect
// Hunter broadcast bot's token (getTelegramBotConfig) and is already
// live in production; this file is keyed to the NEW client-facing bot's
// token (getTelegramClientBotConfig) instead. Keeping them separate
// means client-bot work landing here can never regress the already-
// working Prospect Hunter broadcast, and vice versa. Same "plain fetch,
// no SDK" posture as rest.ts and packages/discord/src/rest.ts — every
// call this package makes is a one-shot REST request, never a
// long-polling/Gateway connection (see this package's own README.md).

async function clientBotFetch(method: string, body: Record<string, unknown>): Promise<Response> {
  const { botToken } = getTelegramClientBotConfig();
  return fetch(`${TELEGRAM_API_BASE}/bot${botToken}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

/** Shared response handling — same "non-2xx OR {ok:false} body" check as
 * rest.ts's assertTelegramOk (the Bot API returns HTTP 200 with
 * `{ok:false}` for some errors), extended here to also return `result`
 * since setWebhook/setMyCommands' callers don't need it but a future
 * caller might. */
type TelegramApiResponse = { ok?: boolean; description?: string; result?: unknown };

async function assertOk(response: Response, methodLabel: string): Promise<unknown> {
  const rawBody = await response.text().catch(() => "");
  let data: TelegramApiResponse | null = null;
  try {
    data = rawBody ? (JSON.parse(rawBody) as TelegramApiResponse) : null;
  } catch {
    // Non-JSON body (e.g. an upstream 5xx HTML error page) — fall
    // through and report the raw text below instead.
  }
  if (!response.ok || !data?.ok) {
    throw new Error(
      `Telegram ${methodLabel} failed (${response.status}): ${data?.description ?? (rawBody || "unknown error")}`,
    );
  }
  return data.result;
}

/** Sends a message as the client-facing bot. Throws on failure (unlike
 * notify.ts's never-throwing notifyProspectFound) — the one caller today
 * (the webhook route's /start handler) already runs inside its own
 * try/catch that logs and swallows (see
 * apps/miniapp/app/api/telegram/webhook/route.ts). A FUTURE never-
 * throwing notify.ts pass for lifecycle events (docs/TELEGRAM.md §9)
 * should wrap this the same way notifyProspectFound wraps
 * sendTelegramMessage in notify.ts — that's a decision each caller makes
 * for itself, not something this low-level function should bake in. */
export async function sendClientBotMessage(
  chatId: string,
  text: string,
  replyMarkup?: TelegramInlineKeyboard,
): Promise<void> {
  const response = await clientBotFetch("sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    disable_web_page_preview: true,
    ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
  });
  await assertOk(response, "sendMessage");
}

/** Acknowledges a button tap (`callback_query`) — Telegram shows a
 * loading spinner on the tapped button until this is called (or ~30s
 * pass), so every callback_query update this bot receives must call this
 * once, even with no `text` (a silent ack). `showAlert` pops a modal
 * instead of the small toast. Never throws — an un-acked callback just
 * means the tap spinner times out on its own, never a lost update (same
 * "cosmetic, not data-loss" posture as
 * packages/discord/src/interactions.ts's editInteractionResponse). */
export async function answerCallbackQuery(
  callbackQueryId: string,
  text?: string,
  showAlert = false,
): Promise<void> {
  try {
    const response = await clientBotFetch("answerCallbackQuery", {
      callback_query_id: callbackQueryId,
      ...(text ? { text, show_alert: showAlert } : {}),
    });
    await assertOk(response, "answerCallbackQuery");
  } catch (error) {
    console.error("[telegram] answerCallbackQuery failed", error);
  }
}

/** Registers this app's webhook URL with Telegram — a one-time (or
 * occasional re-run, e.g. after rotating TELEGRAM_WEBHOOK_SECRET) setup
 * call, not something invoked on every request. See this package's
 * README.md "Client-facing bot setup" for how to actually run this (a
 * one-off script, mirroring how Discord's "Post Ticket Button" is a
 * one-off admin action rather than code that runs on every deploy).
 * `secretToken` becomes the value Telegram sends back on every update
 * via the `X-Telegram-Bot-Api-Secret-Token` header — see
 * getTelegramWebhookSecret's own comment (config.ts) for why this
 * exists. Throws on failure — this always runs from an explicit manual
 * step, where silent failure would just leave the operator wondering why
 * the bot never responds. */
export async function setWebhook(url: string, secretToken: string): Promise<void> {
  const response = await clientBotFetch("setWebhook", {
    url,
    secret_token: secretToken,
    allowed_updates: ["message", "callback_query"],
  });
  await assertOk(response, "setWebhook");
}

/** Registers the bot's own command list (shows in Telegram's "/" menu
 * next to the message box) — cosmetic, safe to re-run any time this
 * list changes. Same throw-on-failure posture as setWebhook (a manual
 * setup step, not something silently swallowed in request handling). */
export async function setMyCommands(commands: { command: string; description: string }[]): Promise<void> {
  const response = await clientBotFetch("setMyCommands", { commands });
  await assertOk(response, "setMyCommands");
}
