// Keyboard builders for the Business Sales Assistant — kept separate
// from packages/telegram/src/keyboards.ts (the Mini App bot's own
// keyboards) the same way every other business/* module is kept
// separate from its Prospect-Hunter/Mini-App counterpart (see
// config.ts's top comment). Pure builders, never call `fetch`
// themselves — same split as rest.ts vs keyboards.ts elsewhere in this
// package.

export interface TelegramInlineButton {
  text: string;
  url?: string;
  callback_data?: string;
}

export type TelegramInlineKeyboard = { inline_keyboard: TelegramInlineButton[][] };

export function inlineKeyboard(rows: TelegramInlineButton[][]): TelegramInlineKeyboard {
  return { inline_keyboard: rows };
}

// Service categories (brief §2) — callback_data values double as the
// canonical service identifiers stored in
// telegram_business_leads.service (migration 0055), so
// app/lib/business-bot/conversation.ts never needs a separate
// label<->id mapping table. Kept under Telegram's 64-byte callback_data
// limit by a wide margin.
export const BUSINESS_SERVICE_OPTIONS = [
  { id: "animation", label: "🎨 Animation" },
  { id: "game_development", label: "🎮 Game Development" },
  { id: "web_development", label: "🌐 Web Development" },
  { id: "ai_bot", label: "🤖 AI / Bot" },
  { id: "custom_project", label: "🛠 Custom Project" },
  { id: "tell_me_more", label: "💬 Tell Me More" },
] as const;

export type BusinessServiceId = (typeof BUSINESS_SERVICE_OPTIONS)[number]["id"];

export const ANIMATION_SUBTYPE_OPTIONS = [
  { id: "meme", label: "🎭 Meme Animation" },
  { id: "gif", label: "🎞️ GIF" },
  { id: "other", label: "✨ Other" },
] as const;

export type AnimationSubtypeId = (typeof ANIMATION_SUBTYPE_OPTIONS)[number]["id"];

/** Main menu (brief §2) — 2-column layout except the last row, which is
 * deliberately a single wide button ("Tell Me More" reads oddly
 * squeezed next to "Custom Project" at typical mobile widths). */
export function buildBusinessMainMenuKeyboard(): TelegramInlineKeyboard {
  return inlineKeyboard([
    [
      { text: BUSINESS_SERVICE_OPTIONS[0].label, callback_data: `svc:${BUSINESS_SERVICE_OPTIONS[0].id}` },
      { text: BUSINESS_SERVICE_OPTIONS[1].label, callback_data: `svc:${BUSINESS_SERVICE_OPTIONS[1].id}` },
    ],
    [
      { text: BUSINESS_SERVICE_OPTIONS[2].label, callback_data: `svc:${BUSINESS_SERVICE_OPTIONS[2].id}` },
      { text: BUSINESS_SERVICE_OPTIONS[3].label, callback_data: `svc:${BUSINESS_SERVICE_OPTIONS[3].id}` },
    ],
    [
      { text: BUSINESS_SERVICE_OPTIONS[4].label, callback_data: `svc:${BUSINESS_SERVICE_OPTIONS[4].id}` },
      { text: BUSINESS_SERVICE_OPTIONS[5].label, callback_data: `svc:${BUSINESS_SERVICE_OPTIONS[5].id}` },
    ],
  ]);
}

/** Animation submenu (brief §3) — 2-column then one wide button, exact
 * layout the brief itself shows. */
export function buildAnimationSubmenuKeyboard(): TelegramInlineKeyboard {
  return inlineKeyboard([
    [
      { text: ANIMATION_SUBTYPE_OPTIONS[0].label, callback_data: `anim:${ANIMATION_SUBTYPE_OPTIONS[0].id}` },
      { text: ANIMATION_SUBTYPE_OPTIONS[1].label, callback_data: `anim:${ANIMATION_SUBTYPE_OPTIONS[1].id}` },
    ],
    [{ text: ANIMATION_SUBTYPE_OPTIONS[2].label, callback_data: `anim:${ANIMATION_SUBTYPE_OPTIONS[2].id}` }],
  ]);
}

/** The "New Lead" admin notification's own button (brief §13) — sent
 * with sendBusinessBotOwnMessage (rest.ts). `openChatUrl` is built by
 * the caller (leads.ts's openLeadChatUrl) since it depends on whether
 * the lead has a public @username or only a numeric id.
 *
 * Deliberately just the one URL button, no callback-driven Pause/Resume
 * toggle (removed 21 Agustus 2026 per Pasha's own feedback: the bot
 * already only ever replies to the exact Business Chat Link trigger
 * phrase or an actual button tap — see trigger.ts and
 * conversation.ts's sendWelcome/handleFreeTextMessage — so a manual
 * "stop the bot" control has nothing left to protect against and just
 * adds a UI element Pasha never needs). Automatic silencing when Pasha
 * personally replies (human takeover) still works — that's handled by
 * service.ts's takeOverConversation, triggered by the webhook route
 * itself, not by any button here. */
export function buildLeadActionsKeyboard(openChatUrl: string): TelegramInlineKeyboard {
  return inlineKeyboard([[{ text: "👤 Open Chat", url: openChatUrl }]]);
}
