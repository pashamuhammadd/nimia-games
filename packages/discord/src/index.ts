// @nimia/discord — thin wrapper around Discord's REST API (OAuth2 account
// linking + bot-token calls). Deliberately built on plain `fetch`, no
// discord.js or any other SDK — per docs/DISCORD.md, this integration
// never needs a persistent Gateway (websocket) connection, only one-shot
// REST calls triggered by things that already happened on the website, so
// a heavier dependency would buy nothing here. See README.md for the full
// list of env vars each export needs and how to obtain each Discord-side
// ID/secret.

export { getDiscordOAuthUrl, exchangeDiscordCode, getDiscordUser, type DiscordUser, type DiscordOAuthToken } from "./oauth";
export {
  assignGuildRole,
  removeGuildRole,
  addGuildMember,
  sendChannelMessage,
  editChannelMessage,
  createThreadFromMessage,
  createPrivateThread,
  addThreadMember,
  archiveThread,
  type DiscordEmbed,
} from "./rest";
export { getDiscordRoleId, getDiscordChannelId } from "./config";
export {
  notifyNewOrder,
  notifyNegotiationUpdate,
  notifyPaymentSubmitted,
  notifyPaymentVerified,
  notifyPaymentFlagged,
  notifySystemLog,
  type NegotiationEventKind,
} from "./notify";
export { createSupportTicket, closeSupportTicketThread } from "./tickets";
export {
  notifyPartnerJoined,
  notifyReferralReward,
  notifyPartnerLevelChanged,
  postOrUpdateLeaderboard,
  resolvePublicPartnerName,
  type LeaderboardRow,
} from "./gamification";
// In-Discord ticket button (added 12 Agustus 2026) — see interactions.ts's
// own top comment and docs/DISCORD.md's "In-Discord ticket button" section.
export {
  verifyDiscordInteractionRequest,
  postCreateTicketButtonMessage,
  buildTicketModal,
  modalResponse,
  readTicketModalValues,
  deferredEphemeralResponse,
  editInteractionResponse,
  pongResponse,
  InteractionType,
  CREATE_TICKET_BUTTON_CUSTOM_ID,
  TICKET_MODAL_CUSTOM_ID,
} from "./interactions";
