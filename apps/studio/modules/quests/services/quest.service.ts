import type { SupabaseClient } from "@supabase/supabase-js";
import { questRepository } from "../repository/quest.repository";
import type { QuestProgress } from "../types/quest";

export interface QuestOverview {
  quests: QuestProgress[];
  completedCount: number;
}

// Takes the caller's already-authenticated Supabase client + their own
// clients.id — same convention as getVoucherOverview/getPartnerOverview.
export async function getQuestOverview(
  supabase: SupabaseClient,
  clientId: string,
): Promise<QuestOverview> {
  const quests = await questRepository.findProgressByClientId(supabase, clientId);
  const completedCount = quests.filter((quest) => quest.isCompleted).length;
  return { quests, completedCount };
}
