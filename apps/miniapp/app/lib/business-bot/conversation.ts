import {
  sendBusinessMessage,
  buildBusinessMainMenuKeyboard,
  buildAnimationSubmenuKeyboard,
  buildWelcomeMessage,
  buildAnimationMenuMessage,
  buildAnimationBriefPrompt,
  buildServiceBriefPrompt,
  buildBudgetFollowUpMessage,
  buildLeadCompleteMessage,
  interpretLeadMessage,
  type BusinessServiceId,
  type AnimationSubtypeId,
} from "@nimia/telegram";
import { updateLead, type BusinessLead } from "./leads";
import { notifyNewLead } from "./notify";

// Conversation Layer (brief §16/§17) — the qualification state machine
// itself. Deliberately the ONLY module that decides what message a
// prospect gets next; the webhook route (app/api/telegram/business/webhook)
// just verifies/dispatches, and leads.ts just persists — keeping "what
// happens next" in one place is what makes the 6-step flow (brief
// §2–§9) auditable against this one file instead of scattered across
// the route handler.
//
// Every function here assumes the caller (the webhook route) has
// ALREADY confirmed bot_status === "BOT_ACTIVE" for this lead — none of
// these re-check it, by design, so a future caller (e.g. a manual
// "resend this step" admin action) can reuse them without fighting an
// internal guard that assumes it's always being called from the
// business_message handler.

/** First contact — sent exactly once, the moment a brand-new lead row is
 * created for a message that matched the Business Chat Link's trigger
 * phrase (trigger.ts + the webhook route's front-door gate). Never
 * resent for a returning 'menu'-status contact who types free text
 * instead of tapping a button — per Pasha's own feedback (21 Agustus
 * 2026), the bot must only ever reply to that one specific trigger
 * message or to an actual button tap, nothing else. The webhook route
 * enforces this by only calling sendWelcome right after creating a
 * fresh lead, never on a later message. */
export async function sendWelcome(lead: BusinessLead): Promise<void> {
  await sendBusinessMessage(
    lead.business_connection_id,
    lead.telegram_user_id,
    buildWelcomeMessage(),
    buildBusinessMainMenuKeyboard(),
  );
}

/** Main-menu button tap (brief §2's 6 options). `animation` opens a
 * submenu (brief §3); every other service goes straight to its own
 * brief+budget prompt (brief §4–§8: "Jangan tampilkan submenu."). */
export async function handleServiceSelected(lead: BusinessLead, service: BusinessServiceId): Promise<void> {
  if (service === "animation") {
    await sendBusinessMessage(
      lead.business_connection_id,
      lead.telegram_user_id,
      buildAnimationMenuMessage(),
      buildAnimationSubmenuKeyboard(),
    );
    await updateLead(lead.id, { service, status: "animation_menu" });
    return;
  }

  await sendBusinessMessage(lead.business_connection_id, lead.telegram_user_id, buildServiceBriefPrompt(service));
  await updateLead(lead.id, { service, status: "awaiting_brief" });
}

/** Animation submenu tap (brief §3). */
export async function handleAnimationSubtypeSelected(lead: BusinessLead, subtype: AnimationSubtypeId): Promise<void> {
  await sendBusinessMessage(
    lead.business_connection_id,
    lead.telegram_user_id,
    buildAnimationBriefPrompt(subtype),
  );
  await updateLead(lead.id, { service_subtype: subtype, status: "awaiting_brief" });
}

/** A free-text reply while `status` is `awaiting_brief` or
 * `awaiting_budget` — the ONLY two steps where a prospect is expected to
 * type a real sentence rather than tap a button (Pasha's own feedback,
 * 21 Agustus 2026: every other automated reply must come from either the
 * front-door trigger phrase or a specific button tap, never from
 * free-form text — brief/budget capture is the sole, necessary
 * exception). The webhook route only ever calls this function when
 * `status` is one of these two values — a prospect who types free text
 * at any other step (e.g. `menu`/`animation_menu`, waiting on a button
 * tap) is left unanswered by the route itself, so there is no fallback
 * branch here for that case anymore. */
export async function handleFreeTextMessage(lead: BusinessLead, text: string): Promise<void> {
  if (lead.status === "awaiting_brief") {
    const { detectedBudget } = interpretLeadMessage(text);
    if (detectedBudget) {
      await completeLead(lead, { projectDescription: text, expectedBudget: detectedBudget });
      return;
    }
    // brief §3: budget not found in the brief -> ONE short follow-up
    // question, not a longer flow.
    await updateLead(lead.id, { project_description: text, status: "awaiting_budget" });
    await sendBusinessMessage(lead.business_connection_id, lead.telegram_user_id, buildBudgetFollowUpMessage());
    return;
  }

  // lead.status === "awaiting_budget" — whatever they wrote IS the
  // budget answer, verbatim. This is the one and only follow-up
  // question this bot ever asks, so there's no third attempt/re-prompt
  // loop here even if this reply also doesn't look like a number (brief:
  // keep it to one extra message, never a bertele-tele back-and-forth).
  await completeLead(lead, { projectDescription: lead.project_description, expectedBudget: text });
}

/** brief §9 — both intake paths (budget detected in the brief itself,
 * or captured via the one-off follow-up) converge here: persist the
 * final fields, flip bot_status to WAITING_FOR_HUMAN (the bot must ask
 * nothing further after this), send the completion message, and notify
 * Pasha. notifyNewLead is never-throwing (see notify.ts) — a failed
 * admin notification must never roll back the lead already being
 * marked complete, nor stop the prospect from getting their own
 * completion message (sent first, independently). */
async function completeLead(
  lead: BusinessLead,
  fields: { projectDescription: string | null; expectedBudget: string },
): Promise<void> {
  await updateLead(lead.id, {
    project_description: fields.projectDescription,
    expected_budget: fields.expectedBudget,
    status: "completed",
    bot_status: "WAITING_FOR_HUMAN",
  });
  await sendBusinessMessage(lead.business_connection_id, lead.telegram_user_id, buildLeadCompleteMessage());

  await notifyNewLead({
    ...lead,
    project_description: fields.projectDescription,
    expected_budget: fields.expectedBudget,
  });
}
