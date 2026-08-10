"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createServerClient } from "@nimia/db";
import { getDiscordRoleId, removeGuildRole } from "@nimia/discord";

export type DisconnectDiscordResult = { success: true } | { success: false; error: string };

// Profile page's "Disconnect" button. Reads discord_user_id BEFORE calling
// disconnect_discord_account() (0025_discord_account_linking.sql) on
// purpose — that RPC nulls the column out, so the Discord ID has to be
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
  // app/api/discord/callback/route.ts — the account is already unlinked
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
