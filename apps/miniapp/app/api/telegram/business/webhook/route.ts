import { NextRequest, NextResponse } from "next/server";
import {
  getTelegramBusinessWebhookSecret,
  answerBusinessCallbackQuery,
  type BusinessServiceId,
  type AnimationSubtypeId,
} from "@nimia/telegram";
import {
  upsertBusinessConnection,
  getBusinessConnectionOwner,
  getOrCreateLead,
  findLeadById,
  findLeadByTelegramUserId,
  updateLead,
  wasUpdateAlreadyProcessed,
} from "../../../../lib/business-bot/leads";
import { sendWelcome, handleServiceSelected, handleAnimationSubtypeSelected, handleFreeTextMessage } from "../../../../lib/business-bot/conversation";
import { pauseBot, resumeBot, takeOverConversation } from "../../../../lib/business-bot/service";

// Webhook for the Business Sales Assistant bot — see
// docs/TELEGRAM_BUSINESS_BOT.md for the full architecture. Deliberately
// a SEPARATE route (and separate bot/secret) from
// apps/miniapp/app/api/telegram/webhook/route.ts (the client-facing Mini
// App bot) — co-located in the same app per that document's §4 decision
// (one app owns every inbound Telegram route, avoiding the
// env-var-per-Vercel-project bug class already hit twice with Discord),
// but a fully separate module so nothing here can ever regress the Mini
// App bot's already-working webhook, and vice versa.
//
// This route is deliberately THIN — verify, dedupe, dispatch. Every
// actual decision (what to say next, whether to persist, who to notify)
// lives in app/lib/business-bot/*, per the brief's own explicit
// "Jangan menaruh seluruh logic di satu file" requirement.

function verifySecret(request: NextRequest): boolean {
  const provided = request.headers.get("x-telegram-bot-api-secret-token");
  return Boolean(provided) && provided === getTelegramBusinessWebhookSecret();
}

export async function POST(request: NextRequest) {
  if (!verifySecret(request)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const update = await request.json().catch(() => null);
  if (!update?.update_id) {
    return NextResponse.json({ ok: true });
  }

  // Idempotency FIRST, before any other work — a redelivered update_id
  // short-circuits here regardless of which branch below would have run
  // (brief §20).
  if (await wasUpdateAlreadyProcessed(update.update_id)) {
    return NextResponse.json({ ok: true });
  }

  try {
    if (update.business_connection) {
      await handleBusinessConnection(update.business_connection);
    } else if (update.business_message) {
      await handleBusinessMessage(update.business_message);
    } else if (update.callback_query) {
      await handleCallbackQuery(update.callback_query);
    }
    // Every other update type (edited_business_message,
    // deleted_business_messages, etc.) is intentionally a no-op for
    // this MVP — see docs/TELEGRAM_BUSINESS_BOT.md's roadmap for what's
    // deferred vs. in scope.
  } catch (error) {
    // Never let a bad/unexpected update crash the webhook — same
    // "swallow and log" posture as the Mini App bot's own webhook route
    // and every notify* function in this codebase. A non-200 response
    // would make Telegram redeliver the same update forever.
    console.error("[telegram/business/webhook] Failed to handle update", error);
  }

  return NextResponse.json({ ok: true });
}

interface BusinessConnectionUpdate {
  id: string;
  user: { id: number };
  is_enabled: boolean;
  rights?: { can_reply?: boolean };
}

async function handleBusinessConnection(connection: BusinessConnectionUpdate): Promise<void> {
  await upsertBusinessConnection({
    connectionId: connection.id,
    telegramUserId: String(connection.user.id),
    isEnabled: connection.is_enabled,
    canReply: Boolean(connection.rights?.can_reply),
  });
}

interface BusinessMessage {
  business_connection_id: string;
  chat: { id: number };
  from?: { id: number; first_name?: string; last_name?: string; username?: string };
  text?: string;
  caption?: string;
}

async function handleBusinessMessage(message: BusinessMessage): Promise<void> {
  const businessConnectionId = message.business_connection_id;
  // The CHAT this message belongs to is always the prospect's own
  // Telegram id — Telegram delivers business_message updates for BOTH
  // directions of a given business chat (Pasha's own replies included),
  // so chat.id unambiguously identifies which lead conversation this is
  // about regardless of who actually sent it.
  const chatTelegramUserId = String(message.chat.id);
  const fromTelegramUserId = message.from ? String(message.from.id) : null;
  const text = (message.text ?? message.caption ?? "").trim();

  const owner = await getBusinessConnectionOwner(businessConnectionId);
  if (!owner || !owner.isEnabled) {
    console.error("[telegram/business/webhook] Unknown or disabled business connection", businessConnectionId);
    return;
  }

  if (fromTelegramUserId && fromTelegramUserId === owner.telegramUserId) {
    // Pasha typed this himself, from his own device — human takeover
    // (docs/TELEGRAM_BUSINESS_BOT.md §5). Never auto-reply to Pasha's
    // own messages. Only acts if a lead already exists for this chat —
    // see findLeadByTelegramUserId's own comment for why this never
    // creates one.
    const lead = await findLeadByTelegramUserId(chatTelegramUserId);
    if (lead && lead.bot_status !== "HUMAN_ACTIVE") {
      await takeOverConversation(lead.id);
    }
    return;
  }

  // A message from the prospect. can_reply is a right Pasha grants (or
  // doesn't) when connecting the bot — respect it rather than assuming.
  if (!owner.canReply) {
    console.error("[telegram/business/webhook] Business connection lacks can_reply rights, staying silent", businessConnectionId);
    return;
  }

  const lead = await getOrCreateLead({
    telegramUserId: chatTelegramUserId,
    telegramUsername: message.from?.username ?? null,
    firstName: message.from?.first_name ?? null,
    lastName: message.from?.last_name ?? null,
    businessConnectionId,
  });

  if (text) {
    await updateLead(lead.id, { last_message: text });
  }

  // bot_status gate — the ONE check that makes human takeover actually
  // silence the bot for every subsequent prospect message too, not just
  // stop it from replying to Pasha (brief §10: "Bot HARUS berhenti...
  // Jangan mengirim follow-up otomatis... Conversation tersebut
  // sepenuhnya menjadi milik Pasha").
  if (lead.bot_status !== "BOT_ACTIVE") {
    return;
  }

  if (lead.status === "menu" || !text) {
    await sendWelcome(lead);
    return;
  }

  await handleFreeTextMessage(lead, text);
}

interface CallbackQueryUpdate {
  id: string;
  data?: string;
  from: { id: number };
  business_connection_id?: string;
  message?: { business_connection_id?: string };
}

async function handleCallbackQuery(callbackQuery: CallbackQueryUpdate): Promise<void> {
  const data = callbackQuery.data;
  if (!data) {
    await answerBusinessCallbackQuery(callbackQuery.id);
    return;
  }

  if (data.startsWith("svc:") || data.startsWith("anim:")) {
    await handleMenuTap(callbackQuery, data);
    return;
  }

  if (data.startsWith("lead:pause:") || data.startsWith("lead:resume:")) {
    await handleAdminAction(callbackQuery, data);
    return;
  }

  await answerBusinessCallbackQuery(callbackQuery.id);
}

/** A tap on the main menu or animation submenu — sent to the prospect
 * via sendBusinessMessage, so this tap should carry a
 * business_connection_id. NOTE (unverified against a live bot, flagged
 * in docs/TELEGRAM_BUSINESS_BOT.md): the exact field Telegram populates
 * for a callback_query on a business-context message isn't spelled out
 * in the public Bot API docs at the time this was written — this reads
 * BOTH the top-level `callback_query.business_connection_id` (present
 * on newer Bot API versions per third-party framework support) and the
 * nested `callback_query.message.business_connection_id` (confirmed
 * present on any Message object that was sent via a business
 * connection), and uses whichever is set. If neither is populated in
 * practice, this logs an error rather than guessing — test this exact
 * path against the real bot once deployed and see docs/TELEGRAM_BUSINESS_BOT.md
 * if it needs adjusting. */
async function handleMenuTap(callbackQuery: CallbackQueryUpdate, data: string): Promise<void> {
  await answerBusinessCallbackQuery(callbackQuery.id);

  const businessConnectionId = callbackQuery.business_connection_id ?? callbackQuery.message?.business_connection_id;
  if (!businessConnectionId) {
    console.error(
      "[telegram/business/webhook] Menu tap callback_query has no business_connection_id on either field — see this function's own comment",
    );
    return;
  }

  const lead = await findLeadByTelegramUserId(String(callbackQuery.from.id));
  if (!lead || lead.bot_status !== "BOT_ACTIVE") return;

  if (data.startsWith("svc:")) {
    await handleServiceSelected(lead, data.slice("svc:".length) as BusinessServiceId);
  } else {
    await handleAnimationSubtypeSelected(lead, data.slice("anim:".length) as AnimationSubtypeId);
  }
}

/** Pause/Resume tap on the "New Lead" admin notification — that
 * notification is sent as a REGULAR bot message (sendBusinessBotOwnMessage,
 * no business_connection_id at all), so this callback_query is a
 * perfectly ordinary one; no business-context ambiguity here. Still
 * re-verifies the tapper is the lead's own connection owner (brief §20)
 * rather than trusting that only Pasha could ever see this button —
 * defense in depth, since a callback_data value is not secret. */
async function handleAdminAction(callbackQuery: CallbackQueryUpdate, data: string): Promise<void> {
  const [, action, leadId] = data.split(":");
  const lead = leadId ? await findLeadById(leadId) : null;
  if (!lead) {
    await answerBusinessCallbackQuery(callbackQuery.id, "Lead not found", true);
    return;
  }

  const owner = await getBusinessConnectionOwner(lead.business_connection_id);
  if (!owner || String(callbackQuery.from.id) !== owner.telegramUserId) {
    await answerBusinessCallbackQuery(callbackQuery.id, "Not authorized", true);
    return;
  }

  if (action === "pause") {
    await pauseBot(lead.id);
    await answerBusinessCallbackQuery(callbackQuery.id, "Bot paused for this lead");
  } else {
    await resumeBot(lead.id);
    await answerBusinessCallbackQuery(callbackQuery.id, "Bot resumed for this lead");
  }
}
