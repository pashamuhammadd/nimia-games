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

/** The "New Lead" admin notification's own buttons (brief §13) — sent
 * with sendBusinessBotOwnMessage (rest.ts), so these taps arrive as a
 * REGULAR callback_query, never a business one; the webhook route
 * verifies the tapper is the connection owner before acting on
 * lead:pause/lead:resume regardless (brief §20: "hanya Pasha/admin yang
 * dapat melakukan human takeover"). `openChatUrl` is built by the
 * caller (leads.ts's openLeadChatUrl) since it depends on whether the
 * lead has a public @username or only a numeric id. Shows Pause OR
 * Resume, never both, based on the lead's CURRENT bot_status at the
 * moment the notification is sent — if it changes later the button
 * label can go stale until the next notification, which is an
 * acceptable trade-off for not having to edit a already-sent message on
 * every status change. */
export function buildLeadActionsKeyboard(
  leadId: string,
  openChatUrl: string,
  botStatus: "BOT_ACTIVE" | "HUMAN_ACTIVE" | "WAITING_FOR_HUMAN" | "COMPLETED",
): TelegramInlineKeyboard {
  const toggleButton: TelegramInlineButton =
    botStatus === "BOT_ACTIVE"
      ? { text: "⏸ Pause Bot", callback_data: `lead:pause:${leadId}` }
      : { text: "🤖 Resume Bot", callback_data: `lead:resume:${leadId}` };
  return inlineKeyboard([[{ text: "👤 Open Chat", url: openChatUrl }], [toggleButton]]);
}
