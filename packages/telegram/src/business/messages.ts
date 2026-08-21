import type { AnimationSubtypeId, BusinessServiceId } from "./keyboards";

// Copywriting for the Business Sales Assistant — every string a
// prospect ever sees lives here, never inline in the webhook route or
// conversation state machine, so the "always English, professional but
// friendly, short paragraphs, disclaimer on every message" rules (brief
// §1, §2, §15) have exactly one place to get right and one place to
// review/edit copy without touching logic.

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** The mandatory italic disclaimer (brief §15) — appended to the bottom
 * of EVERY automated message, no exceptions. Two variants: the default
 * ("Pasha will personally reply here shortly") used for every message
 * up through qualification, and "waiting" (brief §9's exact copy) used
 * ONLY on the lead-completion message once bot_status flips to
 * WAITING_FOR_HUMAN. Centralizing this as a required second argument
 * (not an optional one defaulting to the common case) is deliberate —
 * every call site in conversation.ts has to make an active choice, so
 * "forgot to add the disclaimer" and "sent the wrong variant" are both
 * caught at the type level rather than relying on every caller
 * remembering. */
export function withDisclaimer(text: string, variant: "default" | "waiting" = "default"): string {
  const disclaimer =
    variant === "waiting"
      ? "🤖 <i>Automated assistant · Your conversation is now waiting for Pasha.</i>"
      : "🤖 <i>Automated assistant · Pasha will personally reply here shortly.</i>";
  return `${text}\n\n${disclaimer}`;
}

/** First-contact welcome (brief §2). `firstName` is best-effort cosmetic
 * only — never used for any authorization decision (this whole bot has
 * none to make; unlike the Mini App's initData, there's nothing to
 * verify here since the message itself already proves who's texting via
 * `from.id`, which is what conversation.ts actually keys off). */
export function buildWelcomeMessage(): string {
  return withDisclaimer(
    "👋 <b>Thanks for reaching out to Nimia Studio!</b>\n" +
      "I'd be happy to learn more about your project. Please choose what you're interested in below.\n\n" +
      "What would you like to build?",
  );
}

const SERVICE_HEADINGS: Record<BusinessServiceId, string> = {
  animation: "🎨 Animation",
  game_development: "🎮 Game Development",
  web_development: "🌐 Web Development",
  ai_bot: "🤖 AI / Bot Development",
  custom_project: "🛠 Custom Project",
  tell_me_more: "💬 Tell Me More",
};

/** brief §3's animation submenu prompt. */
export function buildAnimationMenuMessage(): string {
  return withDisclaimer(`${SERVICE_HEADINGS.animation}\nWhat type of animation are you looking for?`);
}

const ANIMATION_BRIEF_PROMPTS: Record<AnimationSubtypeId, string> = {
  meme: (
    "🎭 <b>Meme Animation</b>\n" +
    "Tell me about the meme animation you'd like us to create, and please include your expected budget.\n\n" +
    "Feel free to share the concept, duration, characters, references, style, or any other requirements."
  ),
  gif: (
    "🎞️ <b>GIF</b>\n" +
    "Tell me about the GIF you'd like us to create, and please include your expected budget.\n\n" +
    "Feel free to share the concept, duration, style, references, or any requirements."
  ),
  other: (
    "✨ <b>Other Animation</b>\n" +
    "Tell me what kind of animation you'd like us to create, and please include your expected budget.\n\n" +
    "Feel free to describe your idea, style, duration, references, or anything else you have in mind."
  ),
};

/** brief §3's per-subtype brief+budget prompt, shown after an Animation
 * submenu choice. */
export function buildAnimationBriefPrompt(subtype: AnimationSubtypeId): string {
  return withDisclaimer(ANIMATION_BRIEF_PROMPTS[subtype]);
}

/** brief §4–§8's brief+budget prompt for every NON-animation service —
 * one prompt per service, each with the exact wording the brief itself
 * specifies (platform/gameplay/art style for Game Dev, purpose/features
 * for Web Dev, workflow/integrations for AI/Bot, "don't worry if it
 * doesn't fit" reassurance for Custom Project, open-ended for Tell Me
 * More). `game_development` and the rest never go through a submenu
 * (brief §4: "Jangan tampilkan submenu. Langsung...") — the main-menu
 * tap goes straight here. */
const SERVICE_BRIEF_PROMPTS: Record<Exclude<BusinessServiceId, "animation">, string> = {
  game_development: (
    "🎮 <b>Game Development</b>\n" +
    "Tell me about the game you'd like us to build, and please include your expected budget.\n\n" +
    "You can describe the concept, platform, gameplay, art style, features, multiplayer requirements, Web3 integration, or anything else you have in mind."
  ),
  web_development: (
    "🌐 <b>Web Development</b>\n" +
    "Tell me about the website or web application you'd like us to build, and please include your expected budget.\n\n" +
    "Feel free to share the purpose, features, design references, integrations, or other requirements."
  ),
  ai_bot: (
    "🤖 <b>AI / Bot Development</b>\n" +
    "Tell me what you'd like the AI, bot, or automation system to do, and please include your expected budget.\n\n" +
    "You can describe the workflow, platform, integrations, and features you need."
  ),
  custom_project: (
    "🛠 <b>Custom Project</b>\n" +
    "Tell me what you'd like Nimia Studio to build, and please include your expected budget.\n\n" +
    "Don't worry if your idea doesn't fit into one of our services. Just explain what you need, and we'll figure out the best approach."
  ),
  tell_me_more: (
    "💬 <b>Tell Me More</b>\n" +
    "Tell me about your project and what you're looking for, and please include your expected budget.\n\n" +
    "Feel free to explain your idea, requirements, or anything you'd like Nimia Studio to help with."
  ),
};

export function buildServiceBriefPrompt(service: Exclude<BusinessServiceId, "animation">): string {
  return withDisclaimer(SERVICE_BRIEF_PROMPTS[service]);
}

/** brief §3's budget-only follow-up — sent ONLY when a project
 * description arrived with no detectable budget (lead-parser.ts's
 * detectBudgetInText returned null). Deliberately the ONE follow-up
 * question this bot ever asks (brief: "jangan langsung membuat flow
 * panjang... kirim satu pesan singkat") — if this message's own reply
 * also has no detectable budget, conversation.ts stores whatever the
 * prospect wrote verbatim rather than asking a third time. */
export function buildBudgetFollowUpMessage(): string {
  return withDisclaimer("💰 <b>One more thing</b>\nWhat budget range are you expecting for this project?");
}

/** brief §9 — sent the moment a lead has both project_description and
 * expected_budget captured. Uses the "waiting" disclaimer variant
 * (brief §9: bot_status flips to WAITING_FOR_HUMAN here, and this is
 * the one message that says so explicitly). */
export function buildLeadCompleteMessage(): string {
  return withDisclaimer(
    "✅ <b>Thanks!</b>\n" +
      "I've received your project details and passed them along to Pasha.\n\n" +
      "Pasha will personally review your project and continue the conversation here shortly.",
    "waiting",
  );
}

/** brief §13's "New Lead" admin notification body — sent to Pasha via
 * sendBusinessBotOwnMessage (rest.ts), never via business_connection_id.
 * Every prospect-supplied field is HTML-escaped (project_description
 * and expected_budget are free text from a stranger on the internet —
 * same rule notify.ts already applies to CoinGecko-sourced text). */
export function buildNewLeadNotification(input: {
  displayName: string;
  username: string | null;
  serviceLabel: string;
  projectDescription: string | null;
  expectedBudget: string | null;
}): string {
  const clientLine = input.username
    ? `👤 <b>Client:</b> ${escapeHtml(input.displayName)}\n📱 <b>Telegram:</b> @${escapeHtml(input.username)}`
    : `👤 <b>Client:</b> ${escapeHtml(input.displayName)}`;
  return (
    "🚨 <b>New Nimia Studio Lead</b>\n\n" +
    `${clientLine}\n` +
    `🎯 <b>Service:</b> ${escapeHtml(input.serviceLabel)}\n` +
    `📝 <b>Project:</b>\n${escapeHtml(input.projectDescription ?? "—")}\n\n` +
    `💰 <b>Expected Budget:</b> ${escapeHtml(input.expectedBudget ?? "Not specified")}\n` +
    "🟡 <b>Status:</b> Waiting for Pasha"
  );
}

export function buildServiceHeading(service: BusinessServiceId): string {
  return SERVICE_HEADINGS[service];
}
