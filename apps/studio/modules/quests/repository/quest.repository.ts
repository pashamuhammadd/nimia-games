import type { SupabaseClient } from "@supabase/supabase-js";
import type { QuestProgress } from "../types/quest";

// ------------------------------------------------------------------
// Data-access layer for the client-facing Quests page (4 Agustus 2026,
// migration packages/db/migrations/0022_quests.sql). get_client_quest_progress
// is a SECURITY DEFINER RPC that checks is_owner_client(p_client_id)
// internally (same shape as get_partner_metrics, 0016) — this repository
// never bypasses that, it just calls the RPC with the caller's own
// client_id and shapes the result for the UI.
// ------------------------------------------------------------------

export interface QuestRepository {
  findProgressByClientId(supabase: SupabaseClient, clientId: string): Promise<QuestProgress[]>;
}

export const questRepository: QuestRepository = {
  async findProgressByClientId(supabase, clientId) {
    const { data, error } = await supabase.rpc("get_client_quest_progress", {
      p_client_id: clientId,
    });
    if (error) {
      throw new Error(`get_client_quest_progress RPC failed: ${error.message}`);
    }

    return (data ?? []).map(
      (row: {
        quest_id: string;
        quest_key: string;
        title: string;
        description: string;
        goal_type: QuestProgress["goalType"];
        goal_value: number | string;
        reward_discount_percent: number | string;
        current_progress: number | string;
        is_completed: boolean;
        completed_at: string | null;
        reward_voucher_code: string | null;
      }): QuestProgress => ({
        questId: row.quest_id,
        questKey: row.quest_key,
        title: row.title,
        description: row.description,
        goalType: row.goal_type,
        goalValue: Number(row.goal_value),
        rewardDiscountPercent: Number(row.reward_discount_percent),
        currentProgress: Number(row.current_progress),
        isCompleted: row.is_completed,
        completedAt: row.completed_at,
        rewardVoucherCode: row.reward_voucher_code,
      }),
    );
  },
};
