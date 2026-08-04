export type QuestGoalType = "orders_count" | "total_spend_usd" | "referral_count";

export interface QuestProgress {
  questId: string;
  questKey: string;
  title: string;
  description: string;
  goalType: QuestGoalType;
  goalValue: number;
  rewardDiscountPercent: number;
  currentProgress: number;
  isCompleted: boolean;
  completedAt: string | null;
  rewardVoucherCode: string | null;
}
