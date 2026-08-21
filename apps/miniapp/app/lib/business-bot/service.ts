import { updateLead } from "./leads";

// Conversation Layer's own control surface (brief §11). `conversationId`
// is this lead's `id` since each lead IS one conversation in this MVP; a
// future multi-conversation-per-lead model, if ever needed, would just
// change what id these take, not their shape.
//
// pauseBot/resumeBot (the brief's own manual-toggle names) were removed
// 21 Agustus 2026 per Pasha's own feedback: the bot already only ever
// replies to the exact Business Chat Link trigger phrase or an actual
// button tap (see trigger.ts and conversation.ts), so a manual
// "stop/start the bot" admin control has nothing left to protect
// against. takeOverConversation/releaseConversation stay — they're not
// a manual toggle, they're the AUTOMATIC silencing that fires the
// instant Pasha replies to a lead himself (webhook route's own
// from.id-matches-owner check), which is still necessary regardless of
// how narrow the bot's own triggers are.

/** Called the instant a business_message arrives whose `from.id` matches
 * this lead's connection owner (Pasha typed it himself from his own
 * Telegram client) — see docs/TELEGRAM_BUSINESS_BOT.md §5 for why this
 * has to be detected on every inbound message rather than relying on
 * any event Telegram itself never sends. Records `human_takeover_at` so
 * Pasha's own review history shows exactly when he stepped in. */
export async function takeOverConversation(conversationId: string): Promise<void> {
  await updateLead(conversationId, {
    bot_status: "HUMAN_ACTIVE",
    human_takeover_at: new Date().toISOString(),
  });
}

/** The other side of takeOverConversation — lets Pasha explicitly hand a
 * conversation back to automation after he's done manually replying
 * (distinct from resumeBot only in framing: this is "I'm done, bot can
 * take back over," resumeBot is "un-pause a lead I never personally
 * took over." Both currently do the identical DB transition — kept as
 * two named functions anyway because the brief asks for both by name,
 * and because a future version might want different side effects for
 * each, e.g. releaseConversation clearing human_takeover_at). */
export async function releaseConversation(conversationId: string): Promise<void> {
  await updateLead(conversationId, { bot_status: "BOT_ACTIVE" });
}
