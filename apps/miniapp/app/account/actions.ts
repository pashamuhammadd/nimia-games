"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerClient } from "@nimia/db";

/** Account tab's "Disconnect Telegram" button — calls the same
 * disconnect_telegram_account() RPC (migration 0054) apps/app's own
 * Profile page pattern uses for Discord. Runs under the caller's own
 * RLS-backed session (createServerClient), never service-role — the RPC
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
