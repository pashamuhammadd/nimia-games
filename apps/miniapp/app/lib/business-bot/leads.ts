import { createServiceRoleClient } from "@nimia/db";
import { getBusinessConnection } from "@nimia/telegram";

// Leads Layer (brief §16/§17's `leads/` module) + the thin slice of a
// Database Layer this feature needs — deliberately living in the APP,
// not in packages/telegram, matching this monorepo's own established
// split: packages/telegram/packages/discord are pure platform REST
// wrappers with zero @nimia/db dependency; every DB-touching call in
// this codebase happens at the app layer (see
// apps/miniapp/app/api/telegram/session/route.ts, or
// apps/app/app/api/discord/interactions/route.ts, both of which call
// createServiceRoleClient directly rather than through their platform
// package). Every function here uses the SERVICE-ROLE client — the
// webhook that calls these has no signed-in Supabase session at all
// (Telegram calls this route directly, see packages/db/src/service.ts's
// own comment for the general rule this follows).

export type BotStatus = "BOT_ACTIVE" | "HUMAN_ACTIVE" | "WAITING_FOR_HUMAN" | "COMPLETED";

export interface BusinessLead {
  id: string;
  telegram_user_id: string;
  telegram_username: string | null;
  first_name: string | null;
  last_name: string | null;
  business_connection_id: string;
  service: string | null;
  service_subtype: string | null;
  project_description: string | null;
  expected_budget: string | null;
  status: string;
  bot_status: BotStatus;
  source: string;
  last_message: string | null;
  human_takeover_at: string | null;
  created_at: string;
  updated_at: string;
}

interface ConnectionOwner {
  telegramUserId: string;
  isEnabled: boolean;
  canReply: boolean;
}

/** Syncs `telegram_business_connections` (migration 0055) from a
 * `business_connection` webhook update — called every time one arrives
 * (Pasha connecting, disconnecting, or editing this bot's rights). Never
 * deletes a row on disconnect (is_enabled=false is enough of a record;
 * a lead whose business_connection_id points at a disabled connection
 * is still perfectly readable history for Pasha). */
export async function upsertBusinessConnection(input: {
  connectionId: string;
  telegramUserId: string;
  isEnabled: boolean;
  canReply: boolean;
}): Promise<void> {
  const db = createServiceRoleClient();
  await db.from("telegram_business_connections").upsert(
    {
      connection_id: input.connectionId,
      telegram_user_id: input.telegramUserId,
      is_enabled: input.isEnabled,
      can_reply: input.canReply,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "connection_id" },
  );
}

/** Resolves who owns a Business Connection — checked on EVERY inbound
 * business_message to tell "the prospect wrote this" apart from "Pasha
 * wrote this himself" (docs/TELEGRAM_BUSINESS_BOT.md §5). Reads the
 * cached row first; if this connection_id was never seen before (the
 * `business_connection` update that should have preceded it was missed
 * — see rest.ts's getBusinessConnection for why that can happen), falls
 * back to asking Telegram directly and caches the result so every
 * subsequent message on this connection is a plain DB read again. */
export async function getBusinessConnectionOwner(connectionId: string): Promise<ConnectionOwner | null> {
  const db = createServiceRoleClient();
  const { data } = await db
    .from("telegram_business_connections")
    .select("telegram_user_id, is_enabled, can_reply")
    .eq("connection_id", connectionId)
    .maybeSingle();

  if (data) {
    return { telegramUserId: data.telegram_user_id, isEnabled: data.is_enabled, canReply: data.can_reply };
  }

  try {
    const live = await getBusinessConnection(connectionId);
    const owner: ConnectionOwner = {
      telegramUserId: String(live.user.id),
      isEnabled: live.is_enabled,
      canReply: Boolean(live.rights?.can_reply),
    };
    await upsertBusinessConnection({
      connectionId,
      telegramUserId: owner.telegramUserId,
      isEnabled: owner.isEnabled,
      canReply: owner.canReply,
    });
    return owner;
  } catch (error) {
    console.error("[business-bot] getBusinessConnection fallback failed", error);
    return null;
  }
}

/** Finds the existing lead for this Telegram user, or creates a fresh
 * one with default status='menu'/bot_status='BOT_ACTIVE' (migration
 * 0055's column defaults). Deliberately upserts ONLY identity/contact
 * columns (telegram_username/first_name/last_name/
 * business_connection_id) — never touches status/bot_status/service/etc
 * on conflict, so a returning prospect's in-progress conversation is
 * never silently reset just because they sent another message. */
export async function getOrCreateLead(input: {
  telegramUserId: string;
  telegramUsername: string | null;
  firstName: string | null;
  lastName: string | null;
  businessConnectionId: string;
}): Promise<BusinessLead> {
  const db = createServiceRoleClient();
  const { data, error } = await db
    .from("telegram_business_leads")
    .upsert(
      {
        telegram_user_id: input.telegramUserId,
        telegram_username: input.telegramUsername,
        first_name: input.firstName,
        last_name: input.lastName,
        business_connection_id: input.businessConnectionId,
      },
      { onConflict: "telegram_user_id", ignoreDuplicates: false },
    )
    .select()
    .single();

  if (error || !data) {
    throw new Error(`[business-bot] getOrCreateLead upsert failed: ${error?.message ?? "no row returned"}`);
  }
  return data as BusinessLead;
}

export async function findLeadById(id: string): Promise<BusinessLead | null> {
  const db = createServiceRoleClient();
  const { data } = await db.from("telegram_business_leads").select().eq("id", id).maybeSingle();
  return (data as BusinessLead | null) ?? null;
}

/** Lookup-only (never creates) — used for the human-takeover path
 * (webhook route), where a message authored by the connection OWNER
 * (Pasha) arrives for some chat.id. Deliberately does not fall back to
 * getOrCreateLead: if Pasha is messaging a Telegram contact that never
 * went through this bot's qualification flow at all (a pre-existing
 * personal chat, unrelated to Nimia Studio), there is no lead to
 * pause/take over and this codebase should not invent one just because
 * a business_message happened to arrive for it. */
export async function findLeadByTelegramUserId(telegramUserId: string): Promise<BusinessLead | null> {
  const db = createServiceRoleClient();
  const { data } = await db
    .from("telegram_business_leads")
    .select()
    .eq("telegram_user_id", telegramUserId)
    .maybeSingle();
  return (data as BusinessLead | null) ?? null;
}

/** Generic patch — every conversation-state transition in conversation.ts
 * goes through this one function so `updated_at` is never forgotten on
 * some call sites and not others. */
export async function updateLead(
  id: string,
  patch: Partial<
    Pick<
      BusinessLead,
      | "service"
      | "service_subtype"
      | "project_description"
      | "expected_budget"
      | "status"
      | "bot_status"
      | "last_message"
      | "human_takeover_at"
    >
  >,
): Promise<void> {
  const db = createServiceRoleClient();
  await db
    .from("telegram_business_leads")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id);
}

/** Idempotency guard (brief §20) — inserts `updateId` into
 * `telegram_business_processed_updates` (migration 0055) FIRST, before
 * any reply is sent. Returns `true` if this update was already
 * processed (a Postgres unique-violation, code 23505, on the insert),
 * meaning the webhook route should return 200 immediately without doing
 * anything else — Telegram redelivering the same update must never
 * produce a second reply. */
export async function wasUpdateAlreadyProcessed(updateId: number): Promise<boolean> {
  const db = createServiceRoleClient();
  const { error } = await db.from("telegram_business_processed_updates").insert({ update_id: updateId });
  if (!error) return false;
  if (error.code === "23505") return true;
  // An unexpected DB error (not a duplicate) — fail OPEN (treat as "not
  // yet processed") rather than silently dropping a legitimate update;
  // worst case is one possible duplicate reply during a genuine DB
  // outage, which is a far smaller risk than a prospect's very first
  // message getting silently swallowed.
  console.error("[business-bot] wasUpdateAlreadyProcessed insert failed", error);
  return false;
}

/** Builds the "Open Chat" button target for the admin notification
 * (brief §13) — prefers a `t.me/<username>` link when the prospect has
 * a public username (opens reliably in any Telegram client build);
 * falls back to the `tg://user?id=` deep link when they don't (works in
 * Telegram's own apps, not as a universal web fallback — an acceptable
 * trade-off since Pasha is always opening this from his own phone/desktop
 * Telegram, never a browser). */
export function openLeadChatUrl(lead: Pick<BusinessLead, "telegram_username" | "telegram_user_id">): string {
  return lead.telegram_username ? `https://t.me/${lead.telegram_username}` : `tg://user?id=${lead.telegram_user_id}`;
}
