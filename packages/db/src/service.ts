import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";

/**
 * Service-role Supabase client — bypasses Row Level Security entirely using
 * SUPABASE_SERVICE_ROLE_KEY (already in every app's .env.example, unused
 * until now). This is deliberately the exception, not a shortcut: almost
 * every server-side read/write in this codebase should go through
 * createServerClient (an actual signed-in user's session, so RLS still
 * applies) or a SECURITY DEFINER RPC (e.g. connect_discord_account,
 * set_support_ticket_discord_thread_id) that does its own auth.uid() check.
 *
 * The one class of caller that genuinely has neither — no cookies, no
 * Supabase session, nothing @supabase/ssr's createServerClient can key
 * off — is a request that originates OUTSIDE the website entirely, sent by
 * a third party's own servers. Added 12 Agustus 2026 for exactly one such
 * caller: apps/studio/app/api/discord/interactions/route.ts, which Discord
 * itself calls directly when someone clicks the in-Discord "Open a Ticket"
 * button (docs/DISCORD.md's "In-Discord ticket button" section) — there is
 * no logged-in website user in that request at all, only a Discord user id
 * the route has to look up a client by.
 *
 * Every query built on top of this client MUST do its own authorization
 * check by hand (e.g. "does a clients row with this discord_user_id exist,
 * and is THIS the client_id we insert the ticket under") since RLS can no
 * longer do it — this client sees every row in every table, full stop.
 */
export function createServiceRoleClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
