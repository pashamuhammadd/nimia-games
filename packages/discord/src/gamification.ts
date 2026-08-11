import { sendChannelMessage, editChannelMessage, type DiscordEmbed } from "./rest";
import { getDiscordChannelId } from "./config";

// Partner Program gamification phase (11 Agustus 2026) — see
// docs/DISCORD.md's "Partner Discord Channel" section for the 4 channels
// this covers (#partner-joined / #recent-rewards / #partner-leaderboard /
// #partner-success) and the original brief's sections 9-16 for the exact
// wording/tone these were modeled on. Same never-throwing, fire-and-log
// posture as notify.ts and tickets.ts — every export below is safe to
// `await` with no try/catch of the caller's own. Deliberately a SEPARATE
// module from notify.ts (order/payment/negotiation lifecycle) rather than
// folded in: these are Partner Program events, fired from a completely
// different trigger point (verifyPaymentAction / signUpAction, not the
// order actions notify.ts's functions are called from) — same reasoning
// as why tickets.ts is its own module instead of living in notify.ts too.
//
// IMPORTANT — money/PII posture: per user decision (11 Agustus 2026), NONE
// of the functions below ever take or show a dollar amount, a client's
// name, an order id, or anything else from docs/DISCORD.md's "never send
// to public Discord" list (section 21) — only a partner's own display
// name/Discord handle, their level, and their successful-paid-referral
// count. Callers (apps/studio's signUpAction, apps/admin's
// verifyPaymentAction) are responsible for only ever passing safe fields
// in — this module has no database access of its own to check that itself
// (same "zero dependencies" design as the rest of this package).

const COLOR_PARTNER = 0xf1c40f; // gold — Partner Program's own branding color elsewhere on the site

async function safePost(
  channel: Parameters<typeof getDiscordChannelId>[0],
  embed: DiscordEmbed,
  context: string,
): Promise<void> {
  try {
    const channelId = getDiscordChannelId(channel);
    await sendChannelMessage(channelId, { embeds: [embed] });
  } catch (error) {
    console.error(`[discord] Failed to send ${context} notification`, error);
  }
}

/** Resolves how to publicly refer to a partner: an `<@id>` mention (which
 * Discord renders as their live server display name/nickname, and pings
 * them) when they've connected Discord, otherwise their site full name —
 * per user decision (11 Agustus 2026) on how to handle partners who
 * haven't connected Discord yet. "A Nimia Partner" is the last-resort
 * fallback only if both are somehow missing, which shouldn't happen in
 * practice (every partner has a full_name from signup) but keeps this
 * function total. */
export function resolvePublicPartnerName(params: {
  discordUserId?: string | null;
  fullName?: string | null;
}): string {
  if (params.discordUserId) return `<@${params.discordUserId}>`;
  return params.fullName?.trim() || "A Nimia Partner";
}

// ------------------------------------------------------------------
// #partner-joined
// ------------------------------------------------------------------

/** Fired once from signUpAction (apps/studio), right after
 * supabase.auth.signUp() succeeds — but ONLY when the signup showed
 * explicit partner intent (arrived via the /partners marketing page, or
 * entered a referral code), per user decision (11 Agustus 2026). Every
 * account technically becomes a Partner on signup (self-serve, migration
 * 0016) — posting this for literally every registration would flood the
 * channel with people who only ever wanted to order a service and never
 * intend to refer anyone. `level` is only passed when the caller can
 * state it with certainty — signUpAction can only ever be sure for the
 * /partners-page floor (always Gold, migration 0030); a referral-code-only
 * signup might coincidentally also be one of the first 100 Founding
 * Partners, but signUpAction has no cheap way to know that before the
 * response is sent (would need a second authenticated query against a
 * not-yet-confirmed session, which this integration deliberately doesn't
 * add — see this package's own "zero new infrastructure" posture).
 * Omitting the level field in that edge case is a harmless cosmetic gap,
 * never a wrong claim — the partner's REAL level in the database is
 * always correct regardless of what this one welcome message says. */
export async function notifyPartnerJoined(params: {
  fullName: string;
  level?: string;
}): Promise<void> {
  await safePost(
    "partner-joined",
    {
      title: "🎉 NEW PARTNER",
      description: `Welcome **${params.fullName}** to the Nimia Partner Program!`,
      color: COLOR_PARTNER,
      fields: params.level ? [{ name: "Partner Level", value: params.level, inline: true }] : [],
      timestamp: new Date().toISOString(),
    },
    "partner joined",
  );
}

// ------------------------------------------------------------------
// #recent-rewards
// ------------------------------------------------------------------

/** Fired from verifyPaymentAction (apps/admin) — the PAYMENT CONFIRMED
 * moment, same trigger point as handle_order_paid_partner_reward() (0016)
 * that actually creates the partner_rewards row. This is purely a mirror
 * of that DB-side event for public social proof (brief section 25: only
 * PAYMENT CONFIRMED qualifies — registration/order-creation/pending
 * payment never reach this function at all, since verifyPaymentAction
 * itself only ever runs on that one status transition). No dollar amount
 * — see this file's header comment. */
export async function notifyReferralReward(params: {
  fullName: string;
  discordUserId?: string | null;
  paidClientsCount: number;
  levelLabel: string;
  levelEmoji: string;
}): Promise<void> {
  const who = resolvePublicPartnerName(params);
  await safePost(
    "recent-rewards",
    {
      title: "💰 REFERRAL REWARD EARNED",
      description: `🎉 ${who} just earned a new referral reward!`,
      color: COLOR_PARTNER,
      fields: [
        { name: "Successful Paid Referrals", value: String(params.paidClientsCount), inline: true },
        { name: "Partner Level", value: `${params.levelEmoji} ${params.levelLabel}`, inline: true },
      ],
      timestamp: new Date().toISOString(),
    },
    "referral reward earned",
  );
}

// ------------------------------------------------------------------
// #partner-success
// ------------------------------------------------------------------

/** Fired from verifyPaymentAction (apps/admin), only when a partner's
 * resolved level (resolvePartnerLevelDisplay, same helper the admin
 * Partners directory already uses) actually changed between before and
 * after this payment confirmation — per user decision (11 Agustus 2026),
 * level-ups are the milestone definition, not arbitrary round numbers.
 * `nextLevelLabel`/`paidClientsToNext` are both omitted once a partner is
 * already at the top tier (Platinum has no next level to climb toward). */
export async function notifyPartnerLevelChanged(params: {
  fullName: string;
  discordUserId?: string | null;
  newLevelLabel: string;
  newLevelEmoji: string;
  paidClientsCount: number;
  nextLevelLabel?: string | null;
  paidClientsToNext?: number | null;
}): Promise<void> {
  const who = resolvePublicPartnerName(params);
  const nextLine =
    params.nextLevelLabel && params.paidClientsToNext != null
      ? `Next milestone: ${params.paidClientsToNext} Successful Paid Referrals → ${params.nextLevelLabel}`
      : "They've reached the top tier — Platinum! 💎";

  await safePost(
    "partner-success",
    {
      title: "🚀 PARTNER MILESTONE",
      description: `${who} just reached:\n**${params.newLevelEmoji} ${params.newLevelLabel}** — ${params.paidClientsCount} Successful Paid Referrals\n\n${nextLine}\nKeep going! 🔥`,
      color: COLOR_PARTNER,
      timestamp: new Date().toISOString(),
    },
    "partner level changed",
  );
}

// ------------------------------------------------------------------
// #partner-leaderboard
// ------------------------------------------------------------------

export interface LeaderboardRow {
  /** Already resolved by the caller via resolvePublicPartnerName above —
   * this module has no database access to resolve it itself. */
  displayName: string;
  paidClientsCount: number;
  levelLabel: string;
  levelEmoji: string;
}

const RANK_EMOJI = ["🥇", "🥈", "🥉"];

function buildLeaderboardEmbed(rows: LeaderboardRow[]): DiscordEmbed {
  const lines = rows.map((row, index) => {
    const rank = RANK_EMOJI[index] ?? `${index + 1}.`;
    return `${rank} ${row.displayName}\n${row.paidClientsCount} Paid Clients · ${row.levelEmoji} ${row.levelLabel}`;
  });

  return {
    title: "🏆 NIMIA PARTNER LEADERBOARD",
    description:
      lines.length > 0
        ? lines.join("\n\n")
        : "No successful paid referrals yet — be the first Nimia Partner on this board!",
    color: COLOR_PARTNER,
    timestamp: new Date().toISOString(),
  };
}

/** Posts or edits the ONE pinned leaderboard message in
 * #partner-leaderboard (brief section 24 — edit in place, never spam a
 * new message per update). `existingMessageId` comes from
 * discord_leaderboard_state (migration 0035) — apps/admin reads it before
 * calling this, and persists whatever id this returns back to that same
 * row afterward. Falls back to posting a fresh message if editing fails
 * (e.g. the old message was deleted manually in Discord, or this is the
 * very first run and there's no id yet) rather than leaving the
 * leaderboard stuck — never throws either way, same posture as everything
 * else in this package. Returns `existingMessageId` unchanged (which may
 * be null) only if BOTH the edit and the fallback post failed, so the
 * caller doesn't overwrite a previously-good id with null on a transient
 * failure. */
export async function postOrUpdateLeaderboard(
  channelId: string,
  existingMessageId: string | null,
  rows: LeaderboardRow[],
): Promise<{ messageId: string | null }> {
  const embed = buildLeaderboardEmbed(rows);

  if (existingMessageId) {
    try {
      await editChannelMessage(channelId, existingMessageId, { embeds: [embed] });
      return { messageId: existingMessageId };
    } catch (error) {
      console.error(
        "[discord] Failed to edit the leaderboard message, will try posting a new one instead",
        error,
      );
    }
  }

  try {
    const newMessageId = await sendChannelMessage(channelId, { embeds: [embed] });
    return { messageId: newMessageId };
  } catch (error) {
    console.error("[discord] Failed to post the leaderboard message", error);
    return { messageId: existingMessageId };
  }
}
