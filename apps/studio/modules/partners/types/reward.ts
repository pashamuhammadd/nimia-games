// Nimia Partner Program — reward summary + withdrawal types.
//
// Withdraw/payout used to be explicitly OUT of scope (brief's original
// "BELUM DIBUAT" section) — RewardSummary drove a read-only Rewards
// section UI. Extended 11 Agustus 2026 (user decision) with a real
// withdrawal flow: a partner claims their whole Available Reward balance
// to a wallet address, a founder manually sends it and marks the request
// completed. See packages/db/migrations/0033_partner_reward_withdrawals.sql
// for the schema this maps onto.

/** The reward buckets shown in the Rewards section. */
export type RewardBucket = "pending" | "available" | "withdrawing" | "lifetime";

/** Lifecycle of a single withdrawal request — mirrors partner_withdrawal_requests.status. */
export type WithdrawalRequestStatus = "pending" | "completed" | "rejected";

/** Crypto network a partner can receive their withdrawal on — same set apps/studio's buyer-facing PaymentPanel already accepts (public.crypto_network). */
export type WalletNetwork = "ethereum" | "bsc" | "tron" | "solana" | "cardano" | "ton";

export interface RewardSummary {
  pendingUsd: number;
  availableUsd: number;
  /** Locked into an open (pending) withdrawal request — already claimed, not yet sent. */
  withdrawingUsd: number;
  lifetimeUsd: number;
}

export const REWARD_BUCKET_LABEL: Record<RewardBucket, string> = {
  pending: "Pending Reward",
  available: "Available Reward",
  withdrawing: "Withdrawal In Review",
  lifetime: "Lifetime Reward",
};

/**
 * A partner's currently open (status = 'pending') withdrawal request, if
 * any — null when there isn't one, in which case the Rewards card shows a
 * live "Withdraw" button instead.
 */
export interface OpenWithdrawalRequest {
  id: string;
  amountUsd: number;
}
