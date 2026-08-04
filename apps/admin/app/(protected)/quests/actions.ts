"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createServerClient } from "@nimia/db";

export type QuestActionResult = { success: true } | { success: false; error: string };

// quest_definitions_admin_write (packages/db/migrations/0022_quests.sql)
// gates every write here on public.is_admin() — same convention as every
// other actions.ts in this app.

export async function setQuestActiveAction(questId: string, isActive: boolean): Promise<QuestActionResult> {
  const supabase = createServerClient(await cookies());
  const { error } = await supabase.from("quest_definitions").update({ is_active: isActive }).eq("id", questId);
  if (error) return { success: false, error: error.message };
  revalidatePath("/quests");
  return { success: true };
}

export async function updateQuestRewardAction(
  questId: string,
  rewardDiscountPercent: number,
): Promise<QuestActionResult> {
  if (!Number.isFinite(rewardDiscountPercent) || rewardDiscountPercent <= 0 || rewardDiscountPercent > 100) {
    return { success: false, error: "Reward must be between 1 and 100." };
  }
  const supabase = createServerClient(await cookies());
  const { error } = await supabase
    .from("quest_definitions")
    .update({ reward_discount_percent: rewardDiscountPercent })
    .eq("id", questId);
  if (error) return { success: false, error: error.message };
  revalidatePath("/quests");
  return { success: true };
}
