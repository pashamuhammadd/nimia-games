import { sendBusinessBotOwnMessage, buildNewLeadNotification, buildLeadActionsKeyboard, buildServiceHeading } from "@nimia/telegram";
import { getBusinessConnectionOwner, openLeadChatUrl, type BusinessLead } from "./leads";

// Notification Layer (brief §16/§17) — the ONE place "tell Pasha about
// a qualified lead" happens (brief §13). Deliberately never-throwing,
// same posture as @nimia/telegram's notify.ts (Prospect Hunter) and
// @nimia/discord's notify* functions: this always runs AFTER the lead
// is already persisted as `completed`/`WAITING_FOR_HUMAN` and the
// prospect already got their own completion message — a failed Telegram
// call here (Pasha blocked the bot, a transient API error, etc.) must
// never undo either of those or bubble up as an error to the webhook
// route, which would make Telegram retry-redeliver an update that
// already succeeded from the prospect's point of view.

export async function notifyNewLead(lead: BusinessLead): Promise<void> {
  try {
    const owner = await getBusinessConnectionOwner(lead.business_connection_id);
    if (!owner) {
      console.error("[business-bot] notifyNewLead: could not resolve connection owner, skipping notification");
      return;
    }

    const displayName = [lead.first_name, lead.last_name].filter(Boolean).join(" ") || "Unknown";
    const serviceLabel = isKnownService(lead.service) ? buildServiceHeading(lead.service) : lead.service ?? "Unspecified";

    const text = buildNewLeadNotification({
      displayName,
      username: lead.telegram_username,
      serviceLabel,
      projectDescription: lead.project_description,
      expectedBudget: lead.expected_budget,
    });

    await sendBusinessBotOwnMessage(
      owner.telegramUserId,
      text,
      buildLeadActionsKeyboard(lead.id, openLeadChatUrl(lead), lead.bot_status),
    );
  } catch (error) {
    console.error("[business-bot] notifyNewLead failed", error);
  }
}

function isKnownService(
  service: string | null,
): service is "animation" | "game_development" | "web_development" | "ai_bot" | "custom_project" | "tell_me_more" {
  return (
    service === "animation" ||
    service === "game_development" ||
    service === "web_development" ||
    service === "ai_bot" ||
    service === "custom_project" ||
    service === "tell_me_more"
  );
}
