import { getTelegramBusinessBotConfig } from "./config";
import type { TelegramInlineKeyboard } from "./keyboards";

const TELEGRAM_API_BASE = "https://api.telegram.org";

// REST layer for the Business Sales Assistant bot — same "plain fetch,
// no SDK, one module per bot token" posture as rest.ts (Prospect
// Hunter) and client-bot.ts (Mini App bot). See config.ts's top comment
// for why this is a fully separate module rather than a parameterized
// version of either.

async function businessBotFetch(method: string, body: Record<string, unknown>): Promise<Response> {
  const { botToken } = getTelegramBusinessBotConfig();
  return fetch(`${TELEGRAM_API_BASE}/bot${botToken}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

type TelegramApiResponse<T = unknown> = { ok?: boolean; description?: string; result?: T };

/** Same "non-2xx OR {ok:false} body" check every other Telegram REST
 * module in this package uses (the Bot API returns HTTP 200 with
 * `{ok:false}` for some errors, so `response.ok` alone isn't enough). */
async function assertOk<T>(response: Response, methodLabel: string): Promise<T> {
  const rawBody = await response.text().catch(() => "");
  let data: TelegramApiResponse<T> | null = null;
  try {
    data = rawBody ? (JSON.parse(rawBody) as TelegramApiResponse<T>) : null;
  } catch {
    // Non-JSON body (e.g. an upstream 5xx HTML error page) — fall
    // through and report the raw text below instead.
  }
  if (!response.ok || !data?.ok) {
    throw new Error(
      `Telegram ${methodLabel} failed (${response.status}): ${data?.description ?? (rawBody || "unknown error")}`,
    );
  }
  return data.result as T;
}

/** Sends a message INTO the prospect's chat with Pasha, AS the business
 * account — the whole point of a Business Connection (see
 * docs/TELEGRAM_BUSINESS_BOT.md §2). `businessConnectionId` is the
 * connection this lead's conversation belongs to
 * (telegram_business_leads.business_connection_id, migration 0055).
 * Throws on failure — the webhook route's own try/catch (same posture
 * as client-bot.ts's sendClientBotMessage) decides what "failed to
 * reply to a prospect" means for that specific call site, this function
 * doesn't swallow anything itself. */
export async function sendBusinessMessage(
  businessConnectionId: string,
  chatId: string,
  text: string,
  replyMarkup?: TelegramInlineKeyboard,
): Promise<void> {
  const response = await businessBotFetch("sendMessage", {
    business_connection_id: businessConnectionId,
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    disable_web_page_preview: true,
    ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
  });
  await assertOk(response, "sendMessage(business)");
}

/** Sends a message as the bot's OWN regular identity (no
 * `business_connection_id`) — used for exactly one thing today: the
 * "New Lead" notification to Pasha (docs/TELEGRAM_BUSINESS_BOT.md §8).
 * Deliberately a separate function from sendBusinessMessage, not an
 * optional param, so a call site can never accidentally send a
 * business-context message to the wrong chat by forgetting to pass the
 * connection id — the two call shapes are simply different functions. */
export async function sendBusinessBotOwnMessage(
  chatId: string,
  text: string,
  replyMarkup?: TelegramInlineKeyboard,
): Promise<void> {
  const response = await businessBotFetch("sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    disable_web_page_preview: true,
    ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
  });
  await assertOk(response, "sendMessage(own)");
}

/** Acknowledges a button tap — see client-bot.ts's answerCallbackQuery
 * for why this must be called on every callback_query (Telegram shows a
 * loading spinner on the tapped button until this is called or ~30s
 * pass). Never throws — same "cosmetic, not data-loss" posture. */
export async function answerBusinessCallbackQuery(
  callbackQueryId: string,
  text?: string,
  showAlert = false,
): Promise<void> {
  try {
    const response = await businessBotFetch("answerCallbackQuery", {
      callback_query_id: callbackQueryId,
      ...(text ? { text, show_alert: showAlert } : {}),
    });
    await assertOk(response, "answerCallbackQuery");
  } catch (error) {
    console.error("[telegram/business] answerCallbackQuery failed", error);
  }
}

/** Fetches a Business Connection's current state directly from Telegram
 * — the fallback path for when a business_message arrives for a
 * connection_id this app hasn't cached yet in
 * `telegram_business_connections` (migration 0055), e.g. if the
 * `business_connection` update that should have preceded it was ever
 * missed/dropped. Normal operation never needs this (the webhook syncs
 * the table on every `business_connection` update), but relying on that
 * alone without a fallback would mean a single missed update leaves the
 * bot permanently unable to reply on that connection. */
export async function getBusinessConnection(connectionId: string): Promise<{
  id: string;
  user: { id: number };
  is_enabled: boolean;
  rights?: { can_reply?: boolean };
}> {
  const response = await businessBotFetch("getBusinessConnection", { business_connection_id: connectionId });
  return assertOk(response, "getBusinessConnection");
}

/** Registers this app's webhook URL for the Business Assistant bot —
 * `allowed_updates` deliberately lists the business_* update types PLUS
 * plain `callback_query` (needed for the admin notification's Pause/
 * Resume buttons, which are sent via sendBusinessBotOwnMessage — a
 * REGULAR message, so their taps arrive as a regular callback_query, not
 * a business one). One-time setup call — see this package's README.md
 * "Business Sales Assistant setup" checklist for how to actually run
 * this. Throws on failure (an explicit manual step, where silent failure
 * would just leave the operator wondering why the bot never responds). */
export async function setBusinessWebhook(url: string, secretToken: string): Promise<void> {
  const response = await businessBotFetch("setWebhook", {
    url,
    secret_token: secretToken,
    allowed_updates: ["business_connection", "business_message", "edited_business_message", "callback_query"],
  });
  await assertOk(response, "setWebhook");
}
