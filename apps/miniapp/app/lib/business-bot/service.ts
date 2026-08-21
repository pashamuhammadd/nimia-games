import { updateLead } from "./leads";

// Conversation Layer's own control surface (brief §11 — the exact
// function names the brief asks for, `conversationId` being this lead's
// `id` since each lead IS one conversation in this MVP; a future
// multi-conversation-per-lead model, if ever needed, would just change
// what id these take, not their shape). Every automated reply in
// conversation.ts checks bot_status via these same transitions, and the
// admin notification's Pause/Resume buttons (webhook route's
// callback_query handler) call pauseBot/resumeBot directly — this file
// is the ONE place "what does pausing actually mean" is decided.

/** Manual pause — Pasha tapped "⏸ Pause Bot" on a lead notification, or
 * (future) some other admin action. Distinct from takeOverConversation:
 * this doesn't imply Pasha is actively replying right now, just that
 * automation should stop for this lead until explicitly resumed. */
export async function pauseBot(conversationId: string): Promise<void> {
  await updateLead(conversationId, { bot_status: "WAITING_FOR_HUMAN" });
}

/** Re-enables automation for this lead (brief §11: "Buat sistem agar
 * Pasha nantinya dapat mengaktifkan kembali automation"). Does NOT
 * reset `status` (the conversation-flow step) — resuming a
 * conversation that already reached `completed` just means "the bot
 * COULD reply again if this lead messages," not "restart the
 * qualification flow from scratch." */
export async function resumeBot(conversationId: string): Promise<void> {
  await updateLead(conversationId, { bot_status: "BOT_ACTIVE" });
}

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
