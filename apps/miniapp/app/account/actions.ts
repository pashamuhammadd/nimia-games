"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createServerClient } from "@nimia/db";

/** Account tab's "Disconnect Telegram" button, calls the same
 * disconnect_telegram_account() RPC (migration 0054) apps/app's own
 * Profile page pattern uses for Discord. Runs under the caller's own
 * RLS-backed session (createServerClient), never service-role, the RPC
 * itself only ever touches `where user_id = auth.uid()`, see its own
 * comment in the migration. */
export async function disconnectTelegramAction() {
  const supabase = createServerClient(await cookies());
  await supabase.rpc("disconnect_telegram_account");
  redirect("/account");
}

export async function logoutAction() {
  const supabase = createServerClient(await cookies());
  await supabase.auth.signOut();
  redirect("/");
}

export type UpdateProfileResult = { success: true } | { success: false; error: string };

export interface ProfileFields {
  fullName: string;
  companyName: string;
  whatsapp: string;
  country: string;
}

/** Real profile editing (new, 20 Agustus 2026, per Pasha's "bisa edit
 * profil juga" request - apps/app/app/dashboard/profile previously said
 * editing "will be available in a future phase" and had no update path
 * at all; this is the first real one, mirrored on both apps - see
 * apps/app/app/dashboard/profile/actions.ts's own copy).
 *
 * Two separate .update() calls, not a single RPC, because the fields
 * span two tables (`users.full_name`, `clients.company_name/whatsapp/
 * country`) that already have their own RLS update policies
 * ("users_update_self_or_admin" / "clients_update_self_or_admin",
 * packages/db/migrations/0006_rls_policies.sql) scoped to the row owner
 * - a plain RLS-backed update is enough here, no SECURITY DEFINER
 * function needed (unlike connect_telegram_account, which touches a
 * column no ordinary update policy exposes).
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

  revalidatePath("/account");
  return { success: true };
}
