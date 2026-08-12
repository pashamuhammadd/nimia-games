import { getDiscordBotConfig } from "./config";

const DISCORD_API_BASE = "https://discord.com/api/v10";

/** Low-level helper every bot-token REST call below goes through — not
 * exported (this package's public surface is the specific actions below,
 * e.g. assignGuildRole, not a generic "call any Discord endpoint"
 * escape hatch). Centralizes the one thing every bot call needs: the
 * `Bot <token>` auth header, which is a completely different credential
 * from the OAuth access tokens in oauth.ts (bot token = this app acting
 * as itself; OAuth token = this app acting on behalf of whichever user
 * just authorized it). */
async function discordBotFetch(path: string, init?: RequestInit): Promise<Response> {
  const { botToken } = getDiscordBotConfig();
  const response = await fetch(`${DISCORD_API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bot ${botToken}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  return response;
}

/** Grants `roleId` to `discordUserId` in the configured guild
 * (DISCORD_GUILD_ID). Requires the bot's own role to sit ABOVE `roleId`
 * in the server's role list (Discord permission model, not something
 * this code can work around) — see this package's README for the "drag
 * the bot's role above Client/Partner" step. PUT is idempotent — calling
 * this on someone who already has the role is a harmless no-op (204), so
 * callers don't need to check current roles first. */
export async function assignGuildRole(discordUserId: string, roleId: string): Promise<void> {
  const { guildId } = getDiscordBotConfig();
  const response = await discordBotFetch(
    `/guilds/${guildId}/members/${discordUserId}/roles/${roleId}`,
    { method: "PUT" },
  );

  if (!response.ok && response.status !== 204) {
    throw new Error(
      `Discord role assign failed (${response.status}): ${await response.text()} — ` +
        `check the bot's role is positioned above the target role in Server Settings → Roles.`,
    );
  }
}

/** Removes `roleId` from `discordUserId` — used by disconnectDiscordAction
 * (apps/studio) so unlinking a Discord account also drops the role it was
 * granted, rather than leaving a stale Client/Partner role on someone who
 * disconnected. Same idempotency note as assignGuildRole above. */
export async function removeGuildRole(discordUserId: string, roleId: string): Promise<void> {
  const { guildId } = getDiscordBotConfig();
  const response = await discordBotFetch(
    `/guilds/${guildId}/members/${discordUserId}/roles/${roleId}`,
    { method: "DELETE" },
  );

  if (!response.ok && response.status !== 204) {
    throw new Error(`Discord role remove failed (${response.status}): ${await response.text()}`);
  }
}

/** Adds `discordUserId` to the configured guild (DISCORD_GUILD_ID) using
 * Discord's "Add Guild Member" endpoint — this is the ONLY Discord REST
 * call in this whole package that needs BOTH credentials at once: the bot
 * token (via discordBotFetch, same as every other call here) AND a valid
 * OAuth access token for that specific user with the `guilds.join` scope
 * (passed in the body, not a header — Discord's API shape for this one
 * endpoint). Added 10 Agustus 2026 after production testing showed the
 * account-linking flow (oauth.ts, migration 0025) only ever linked a
 * Discord account in the database — it never actually put a
 * not-yet-a-member client INTO the Nimia Studio server, so assignGuildRole
 * and addThreadMember (support tickets) were silently no-op'ing (Discord
 * returns 404 Unknown Member for both when the target isn't a guild
 * member yet). `roleIds`, if given, is ONLY applied by Discord on the
 * user's very first join — passing it on a call for someone who's already
 * a member is harmless but does nothing, so callers should keep calling
 * assignGuildRole afterward too rather than relying on this alone.
 * Requires the bot to have the "Create Invite" (CREATE_INSTANT_INVITE)
 * permission in the server — see this package's README. Treats both 201
 * (newly added) and 204 (already a member) as success, same idempotent
 * shape as assignGuildRole above. */
export async function addGuildMember(
  discordUserId: string,
  accessToken: string,
  roleIds?: string[],
): Promise<void> {
  const { guildId } = getDiscordBotConfig();
  const response = await discordBotFetch(`/guilds/${guildId}/members/${discordUserId}`, {
    method: "PUT",
    body: JSON.stringify({
      access_token: accessToken,
      ...(roleIds && roleIds.length > 0 ? { roles: roleIds } : {}),
    }),
  });

  if (!response.ok && response.status !== 201 && response.status !== 204) {
    throw new Error(
      `Discord add guild member failed (${response.status}): ${await response.text()} — ` +
        `check the bot has the "Create Invite" permission in Server Settings → Roles.`,
    );
  }
}

/** Discord's embed object, trimmed to the fields this integration actually
 * uses (Discord's real schema has many more — author/footer/thumbnail/
 * etc. — deliberately not modeled here since nothing in notify.ts needs
 * them yet; add fields here if/when a notification needs one). */
export type DiscordEmbed = {
  title?: string;
  description?: string;
  color?: number;
  fields?: { name: string; value: string; inline?: boolean }[];
  timestamp?: string;
};

/** Posts a message to `channelId` as the bot (added 9 Agustus 2026,
 * notifications phase — see docs/DISCORD.md's "Bot responsibilities").
 * Every caller in this package goes through notify.ts's safeSend, which
 * never lets a failure here escape to whatever website action triggered
 * it — this low-level function itself still throws on a non-2xx response
 * so that wrapper has something to catch. Requires the bot to have Send
 * Messages (+ Embed Links, for the `embeds` field) in the target channel
 * — see this package's README for the full permission list granted at
 * invite time.
 *
 * `channelId` also accepts a THREAD id — Discord threads are just
 * channels under the hood, so posting a follow-up update into an order's
 * thread (see createThreadFromMessage below) is the exact same call as
 * posting to a top-level channel. Returns the created message's own id
 * (added in the auto-thread pass, 9 Agustus 2026) so a caller can turn
 * THAT message into a thread — see createThreadFromMessage — or, since the
 * gamification phase (11 Agustus 2026), edit it later via
 * editChannelMessage below (e.g. the leaderboard's one pinned message).
 * `components` (added 12 Agustus 2026, in-Discord ticket button — see
 * docs/DISCORD.md's "In-Discord ticket button" section) accepts Discord's
 * raw message-component tree (action rows / buttons) — not modeled as its
 * own type here since only interactions.ts's buildCreateTicketButtonMessage
 * builds one today; add a real type if a second caller ever needs one. */
export async function sendChannelMessage(
  channelId: string,
  payload: { content?: string; embeds?: DiscordEmbed[]; components?: unknown[] },
): Promise<string> {
  const response = await discordBotFetch(`/channels/${channelId}/messages`, {
    method: "POST",
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Discord channel message failed (${response.status}): ${await response.text()}`);
  }

  const data = (await response.json()) as { id: string };
  return data.id;
}

/** Edits a previously-sent message in place — added 11 Agustus 2026,
 * gamification phase, specifically for #partner-leaderboard's "one pinned
 * message, edited on every update" requirement (docs/DISCORD.md's
 * "Leaderboard update strategy": "Bot melakukan EDIT terhadap pesan
 * tersebut ... Jangan membuat ratusan pesan leaderboard"). Throws on a
 * non-2xx response same as every other low-level call here — including
 * when `messageId` no longer exists (e.g. someone deleted it manually in
 * Discord, 404) — see gamification.ts's postOrUpdateLeaderboard for how
 * the caller falls back to posting a fresh message when this throws,
 * rather than leaving the leaderboard silently stuck. */
export async function editChannelMessage(
  channelId: string,
  messageId: string,
  payload: { content?: string; embeds?: DiscordEmbed[] },
): Promise<void> {
  const response = await discordBotFetch(`/channels/${channelId}/messages/${messageId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Discord message edit failed (${response.status}): ${await response.text()}`);
  }
}

/** Creates a standalone PRIVATE thread in `channelId` — not hung off any
 * existing message, unlike createThreadFromMessage below (added 9 Agustus
 * 2026, support-ticket pass — see docs/DISCORD.md's "Client support": "A
 * 'Support' button on the website → the bot creates a Private Ticket,
 * visible only to Founder + Admin + the Client who created it"). A
 * PRIVATE thread (type 12) is invisible to everyone except the bot,
 * server members with Manage Threads (Founder/Admin, if that permission
 * is granted on the target channel — see this package's README), and
 * whoever is explicitly added via addThreadMember below — this is what
 * makes it a "ticket" instead of just another public thread anyone in
 * #create-ticket could read. `invitable: false` stops non-mod thread
 * members from adding anyone else, so a client can never accidentally
 * pull a stranger into their own ticket. Requires the bot to have Create
 * Private Threads in the target channel. */
export async function createPrivateThread(channelId: string, name: string): Promise<string> {
  const response = await discordBotFetch(`/channels/${channelId}/threads`, {
    method: "POST",
    body: JSON.stringify({ name, type: 12, invitable: false, auto_archive_duration: 10080 }),
  });

  if (!response.ok) {
    throw new Error(`Discord private thread creation failed (${response.status}): ${await response.text()}`);
  }

  const data = (await response.json()) as { id: string };
  return data.id;
}

/** Adds `discordUserId` as an explicit member of `threadId` — used right
 * after createPrivateThread above so the client who opened the ticket can
 * actually see and reply in it (a private thread is otherwise invisible
 * to them, even though it's about their own ticket). Only possible when
 * the client has connected Discord (migration 0025) — callers should
 * treat "no discord_user_id on file" as "skip this call, the ticket still
 * exists, staff will just need to reach the client another way", never as
 * a reason to fail ticket creation itself. */
export async function addThreadMember(threadId: string, discordUserId: string): Promise<void> {
  const response = await discordBotFetch(`/channels/${threadId}/thread-members/${discordUserId}`, {
    method: "PUT",
  });

  if (!response.ok && response.status !== 204) {
    throw new Error(`Discord add thread member failed (${response.status}): ${await response.text()}`);
  }
}

/** Archives AND locks `threadId` — used when staff closes a ticket from
 * the admin dashboard (added 9 Agustus 2026, support-ticket pass). Locked
 * (not just archived) so the client can't keep posting into a ticket
 * that's been marked resolved on the website — matches the same
 * website-is-the-source-of-truth posture as every other write in this
 * package: closing must happen here, not by someone manually archiving
 * the thread in Discord (which this integration would have no way to
 * notice — see docs/DISCORD.md's "why no persistent bot process is
 * needed", the flip side being it also never listens for anything). */
export async function archiveThread(threadId: string): Promise<void> {
  const response = await discordBotFetch(`/channels/${threadId}`, {
    method: "PATCH",
    body: JSON.stringify({ archived: true, locked: true }),
  });

  if (!response.ok) {
    throw new Error(`Discord thread archive failed (${response.status}): ${await response.text()}`);
  }
}

/** Turns an existing message into a Discord Thread — used once per order,
 * right after notifyNewOrder posts the "New Order" embed to #new-orders,
 * so the thread hangs off that message in Discord's UI rather than
 * floating as a disconnected standalone thread (added 9 Agustus 2026,
 * auto-thread pass — see docs/DISCORD.md's "Order thread system": "Every
 * new order from the website automatically creates a Discord Thread").
 * The returned id is itself a channel id — every later status update for
 * this order posts into it via sendChannelMessage, same as any other
 * channel. `name` is Discord-truncated at 100 chars if longer.
 * `auto_archive_duration: 10080` (7 days, the longest option available
 * without server boosts) just controls when Discord hides an inactive
 * thread from the sidebar — posting into an archived thread silently
 * un-archives it, nothing is ever lost or locked. Requires the bot to
 * have Create Public Threads in the target channel (see this package's
 * README for the full permission list). */
export async function createThreadFromMessage(
  channelId: string,
  messageId: string,
  name: string,
): Promise<string> {
  const response = await discordBotFetch(`/channels/${channelId}/messages/${messageId}/threads`, {
    method: "POST",
    body: JSON.stringify({ name, auto_archive_duration: 10080 }),
  });

  if (!response.ok) {
    throw new Error(`Discord thread creation failed (${response.status}): ${await response.text()}`);
  }

  const data = (await response.json()) as { id: string };
  return data.id;
}
