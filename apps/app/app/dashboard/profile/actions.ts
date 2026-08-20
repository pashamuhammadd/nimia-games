"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createServerClient } from "@nimia/db";
import { getDiscordRoleId, removeGuildRole } from "@nimia/discord";

export type DisconnectDiscordResult = { success: true } | { success: false; error: string };

// Profile page's "Disconnect" button. Reads discord_user_id BEFORE calling
// disconnect_discord_account() (0025_discord_account_linking.sql) on
// purpose - that RPC nulls the column out, so the Discord ID has to be
// captured first or there'd be nothing left to pass to removeGuildRole.
export async function disconnectDiscordAction(): Promise<DisconnectDiscordResult> {
  const supabase = createServerClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Your session has expired, please log in again." };
  }

  const { data: client } = await supabase
    .from("clients")
    .select("discord_user_id")
    .eq("user_id", user.id)
    .single();

  const { error } = await supabase.rpc("disconnect_discord_account");
  if (error) {
    return { success: false, error: error.message };
  }

  // Best-effort, same as the role-assign call in
  // app/api/discord/callback/route.ts - the account is already unlinked
  // in the database at this point regardless of whether this succeeds;
  // worst case a stale role sits on their Discord account until an admin
  // clears it manually.
  if (client?.discord_user_id) {
    try {
      await removeGuildRole(client.discord_user_id, getDiscordRoleId("client"));
    } catch (roleError) {
      console.error("[disconnectDiscordAction] Role remove failed:", roleError);
    }
  }

  revalidatePath("/dashboard/profile");
  return { success: true };
}

export type UpdateProfileResult = { success: true } | { success: false; error: string };

export interface ProfileFields {
  fullName: string;
  companyName: string;
  whatsapp: string;
  country: string;
}

/** Real profile editing (new, 20 Agustus 2026 - this page previously said
 * "Profile editing ... will be available in a future phase" and had no
 * update path at all). Mirrored on apps/miniapp's own Account tab (see
 * apps/miniapp/app/account/actions.ts's own copy of this same function -
 * two apps, two copies of the wrapper, since Next.js server actions
 * can't be shared across separate apps in this monorepo, only packages,
 * but both ultimately update the exact same `users`/`clients` rows under
 * the exact same RLS policies, so there's no risk of the two apps
 * disagreeing about what a client's profile actually contains).
 *
 * Two separate .update() calls, not a single RPC - the fields span two
 * tables (`users.full_name`, `clients.company_name/whatsapp/country`)
 * that already have their own RLS update policies
 * ("users_update_self_or_admin" / "clients_update_self_or_admin",
 * packages/db/migrations/0006_rls_policies.sql) scoped to the row owner,
 * so a plain RLS-backed update is enough, no SECURITY DEFINER function
 * needed (unlike, say, connect_discord_account, which touches columns no
 * ordinary update policy exposes).
 *
 * IMPORTANT: those RLS policies check ROW ownership only, not which
 * COLUMNS changed - `users_update_self_or_admin` would just as happily
 * let a raw `.update({ role: "admin" })` through as it does full_name.
 * That's why this function hardcodes the exact column set it sends
 * instead of spreading a FormData/object straight into `.update()` -
 * never widen this to "whatever the client posts". */
export async function updateProfileAction(fields: ProfileFields): Promise<UpdateProfileResult> {
  const fullName = fields.fullName.trim();
  if (!fullName) {
    return { success: false, error: "Full name can't be empty." };
  }

  const supabase = createServerClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Your session has expired, please log in again." };
  }

  const [usersResult, clientsResult] = await Promise.all([
    supabase.from("users").update({ full_name: fullName }).eq("id", user.id),
    supabase
      .from("clients")
      .update({
        company_name: fields.companyName.trim() || null,
        whatsapp: fields.whatsapp.trim() || null,
        country: fields.country.trim() || null,
      })
      .eq("user_id", user.id),
  ]);

  if (usersResult.error) return { success: false, error: usersResult.error.message };
  if (clientsResult.error) return { success: false, error: clientsResult.error.message };

  revalidatePath("/dashboard/profile");
  return { success: true };
}
