import { NextRequest, NextResponse } from "next/server";
import {
  getTelegramWebhookSecret,
  sendClientBotMessage,
  answerCallbackQuery,
  buildWelcomeText,
  buildMainMenuKeyboard,
  miniAppUrl,
} from "@nimia/telegram";

// Telegram's webhook target for the client-facing bot (docs/TELEGRAM.md
// §2, §16). Register this route's full URL
// (https://miniapp.nimiastudio.com/api/telegram/webhook) via
// @nimia/telegram's setWebhook() — see packages/telegram/README.md's
// "Client-facing bot + Mini App" setup checklist.
//
// Unlike Discord's Interactions endpoint (packages/discord/src/interactions.ts),
// Telegram has no hard 3-second response deadline — this route just does
// its (tiny) work inline and returns 200, no defer/edit pattern needed.
// The one thing that DOES matter here, same as Discord's endpoint, is
// verifying the request actually came from Telegram BEFORE trusting
// anything in the body — see verifySecret below.
function verifySecret(request: NextRequest): boolean {
  const provided = request.headers.get("x-telegram-bot-api-secret-token");
  return Boolean(provided) && provided === getTelegramWebhookSecret();
}

export async function POST(request: NextRequest) {
  if (!verifySecret(request)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const update = await request.json().catch(() => null);
  if (!update) {
    return NextResponse.json({ ok: true });
  }

  try {
    if (update.message?.text) {
      await handleMessage(update.message);
    } else if (update.callback_query) {
      // No inline buttons carry callback_data yet in this Phase 0/1
      // slice (buildMainMenuKeyboard's buttons are all `web_app`/`url`,
      // neither of which triggers a callback_query) — this branch exists
      // so a FUTURE callback-based button (docs/TELEGRAM.md §11's "light
      // admin actions", explicitly deferred) has somewhere to plug in,
      // and so Telegram never sees an unhandled callback sit un-acked.
      await answerCallbackQuery(update.callback_query.id);
    }
  } catch (error) {
    // Never let a bad/unexpected update crash the webhook — Telegram
    // retries a non-200 response, which would just redeliver the same
    // broken update forever. Same "swallow and log" posture as every
    // notify* function in this package.
    console.error("[telegram/webhook] Failed to handle update", error);
  }

  return NextResponse.json({ ok: true });
}

interface TelegramMessage {
  chat: { id: number };
  text: string;
  from?: { first_name?: string };
}

async function handleMessage(message: TelegramMessage): Promise<void> {
  const chatId = String(message.chat.id);
  const text = message.text.trim();

  if (text === "/start" || text.startsWith("/start ")) {
    const payload = text.startsWith("/start ") ? text.slice("/start ".length).trim() : "";

    if (payload) {
      // Deep link (docs/TELEGRAM.md §10) — reply with a single button
      // straight into the relevant Mini App screen instead of the full
      // main menu. Payload format: order_<id> | partner | service_<slug>.
      const path = deepLinkPath(payload);
      await sendClientBotMessage(chatId, "Here you go 👇", {
        inline_keyboard: [[{ text: "Open Nimia Studio", web_app: { url: miniAppUrl(path) } }]],
      });
      return;
    }

    await sendClientBotMessage(chatId, buildWelcomeText(message.from?.first_name), buildMainMenuKeyboard());
    return;
  }

  // No free-text handling by design (docs/TELEGRAM.md §2 — the bot is a
  // router + notification channel, not a chat AI) — anything else just
  // gets the same main menu back.
  await sendClientBotMessage(chatId, buildWelcomeText(message.from?.first_name), buildMainMenuKeyboard());
}

function deepLinkPath(payload: string): string {
  if (payload.startsWith("order_")) return `orders/${payload.slice("order_".length)}`;
  if (payload === "partner") return "partner";
  if (payload.startsWith("service_")) return `services/${payload.slice("service_".length)}`;
  return "";
}
