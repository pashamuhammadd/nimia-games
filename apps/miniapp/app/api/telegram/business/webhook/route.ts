import { NextRequest, NextResponse } from "next/server";
import {
  getTelegramBusinessWebhookSecret,
  answerBusinessCallbackQuery,
  looksLikeBusinessChatLinkTrigger,
  type BusinessServiceId,
  type AnimationSubtypeId,
} from "@nimia/telegram";
import {
  upsertBusinessConnection,
  getBusinessConnectionOwner,
  getOrCreateLead,
  findLeadByTelegramUserId,
  updateLead,
  wasUpdateAlreadyProcessed,
} from "../../../../lib/business-bot/leads";
import { sendWelcome, handleServiceSelected, handleAnimationSubtypeSelected, handleFreeTextMessage } from "../../../../lib/business-bot/conversation";
import { takeOverConversation } from "../../../../lib/business-bot/service";

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

  const existingLead = await findLeadByTelegramUserId(chatTelegramUserId);

  // Front-door gate (added 21 Agustus 2026, per Pasha's own feedback):
  // once this bot is connected to Pasha's PERSONAL Business account,
  // EVERY message he receives flows through this same webhook — not
  // just prospects who clicked his Business Chat Link. A brand-new
  // contact (no lead row yet) is only ever engaged if their message
  // looks like the Business Chat Link's own pre-filled opening line
  // (brief §2 — see looksLikeBusinessChatLinkTrigger's own comment for
  // the exact matching rules). Anything else from a first-time contact
  // — a personal message, a random DM, literally anything that isn't
  // that specific opener — is left COMPLETELY alone: no lead row
  // created, no reply sent.
  if (!existingLead) {
    if (!text || !looksLikeBusinessChatLinkTrigger(text)) {
      return;
    }
    const lead = await getOrCreateLead({
      telegramUserId: chatTelegramUserId,
      telegramUsername: message.from?.username ?? null,
      firstName: message.from?.first_name ?? null,
      lastName: message.from?.last_name ?? null,
      businessConnectionId,
    });
    await updateLead(lead.id, { last_message: text });
    await sendWelcome(lead);
    return;
  }

  // A returning contact (a lead row already exists). Record the message
  // for Pasha's own visibility regardless of what happens next, then
  // decide whether the bot is allowed to reply to it at all.
  if (text) {
    await updateLead(existingLead.id, { last_message: text });
  }

  // The trigger phrase ALWAYS re-triggers the welcome menu and starts a
  // FRESH qualification round for this same contact — added 21 Agustus
  // 2026, per Pasha's own feedback, extended twice the same day:
  // 1) a lead who finished one round (bot_status WAITING_FOR_HUMAN, set
  //    by conversation.ts's completeLead) had no way to start a NEW
  //    order later — the bot_status gate further below used to run
  //    first and silence everything, trigger phrase included, the
  //    moment a lead was no longer BOT_ACTIVE.
  // 2) (this revision) even bot_status === "HUMAN_ACTIVE" — Pasha
  //    having personally taken over this specific conversation — no
  //    longer blocks it. This is a DELIBERATE, explicit override of the
  //    original brief §10 guarantee ("Conversation tersebut sepenuhnya
  //    menjadi milik Pasha"), per Pasha's own direct instruction: the
  //    trigger phrase must fire "meskipun Pasha sedang berada dalam
  //    chat itu." In effect, this one exact phrase is now treated as an
  //    explicit "start a new automated intake" command from the client
  //    that always takes the bot back from Pasha, even mid manual
  //    conversation — every OTHER free-text message still respects
  //    HUMAN_ACTIVE via the bot_status gate below, this is the only
  //    exception.
  //
  // Checked BEFORE the bot_status gate on purpose, for both reasons
  // above. Resets both `status` (back to 'menu') and `bot_status` (back
  // to BOT_ACTIVE) so the qualification flow restarts cleanly, whatever
  // state the lead was previously in — overwriting this same lead row's
  // service/brief/budget fields once they go through the flow again
  // (this schema keeps one row per Telegram user id, not a separate row
  // per order — Pasha still has every prior order's details in his own
  // already-sent Telegram notifications even after this row is
  // overwritten).
  if (text && looksLikeBusinessChatLinkTrigger(text)) {
    if (existingLead.status !== "menu" || existingLead.bot_status !== "BOT_ACTIVE") {
      await updateLead(existingLead.id, { status: "menu", bot_status: "BOT_ACTIVE" });
    }
    await sendWelcome(existingLead);
    return;
  }

  // bot_status gate — the ONE check that makes human takeover actually
  // silence the bot for every subsequent prospect message too, not just
  // stop it from replying to Pasha (brief §10: "Bot HARUS berhenti...
  // Jangan mengirim follow-up otomatis... Conversation tersebut
  // sepenuhnya menjadi milik Pasha").
  if (existingLead.bot_status !== "BOT_ACTIVE") {
    return;
  }

  // Narrow-trigger gate #2 (added 21 Agustus 2026, per Pasha's own
  // feedback): brief/budget capture is the ONLY step where the bot is
  // allowed to react to free-form text — everywhere else (still on the
  // main menu, or on the animation submenu) it must only ever respond to
  // an actual button tap, handled separately in handleMenuTap below.
  // Free text arriving at any other step is intentionally left
  // unanswered here — see conversation.ts's handleFreeTextMessage for
  // the full reasoning.
  if (existingLead.status === "awaiting_brief" || existingLead.status === "awaiting_budget") {
    if (text) {
      await handleFreeTextMessage(existingLead, text);
    }
    return;
  }
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

  // Any other callback_data (e.g. a stale "lead:pause:"/"lead:resume:"
  // button on an admin notification sent before 21 Agustus 2026, when
  // that manual toggle existed) — just acknowledge the tap so Telegram
  // stops showing a loading spinner; there's no admin action left to
  // perform.
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
