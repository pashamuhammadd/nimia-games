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

/** First contact — lead.status is still the fresh-row default 'menu'.
 * Sent for the prospect's very first message REGARDLESS of its content
 * (brief §2 doesn't ask the bot to interpret the opening line, just to
 * greet and show the menu) and also resent (harmless, idempotent) if a
 * prospect types free text again before tapping a menu button. */
export async function sendWelcome(lead: BusinessLead): Promise<void> {
  await sendBusinessMessage(
    lead.business_connection_id,
    lead.telegram_user_id,
    buildWelcomeMessage(),
    buildBusinessMainMenuKeyboard(),
  );
  if (lead.status !== "menu") {
    await updateLead(lead.id, { status: "menu" });
  }
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
 * `awaiting_budget` — the only two steps where the prospect is expected
 * to type a real sentence rather than tap a button. Anything else
 * (e.g. free text while `status` is still `menu`/`animation_menu`, a
 * prospect typing instead of tapping) falls through to re-showing the
 * relevant menu, never silently ignored. */
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

  if (lead.status === "awaiting_budget") {
    // Whatever they wrote IS the budget answer, verbatim — this is the
    // one and only follow-up question this bot ever asks, so there's no
    // third attempt/re-prompt loop here even if this reply also doesn't
    // look like a number (brief: keep it to one extra message, never a
    // bertele-tele back-and-forth).
    await completeLead(lead, { projectDescription: lead.project_description, expectedBudget: text });
    return;
  }

  // status is 'menu' or 'animation_menu' — the prospect typed instead of
  // tapping a button. Re-show the relevant menu rather than staying
  // silent (silence would look broken, not premium).
  if (lead.status === "animation_menu") {
    await sendBusinessMessage(
      lead.business_connection_id,
      lead.telegram_user_id,
      buildAnimationMenuMessage(),
      buildAnimationSubmenuKeyboard(),
    );
    return;
  }
  await sendWelcome(lead);
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
