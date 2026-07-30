// Nimia Partner Program — reward summary types.
//
// Withdraw/payout is explicitly OUT of scope for this pass (brief's "BELUM
// DIBUAT" section) — these types exist purely to drive the read-only
// Rewards section UI (rewards-card.tsx).

/** The three reward buckets shown in the Rewards section. */
export type RewardBucket = "pending" | "available" | "lifetime";

export interface RewardSummary {
  pendingUsd: number;
  availableUsd: number;
  lifetimeUsd: number;
}

export const REWARD_BUCKET_LABEL: Record<RewardBucket, string> = {
  pending: "Pending Reward",
  available: "Available Reward",
  lifetime: "Lifetime Reward",
};
