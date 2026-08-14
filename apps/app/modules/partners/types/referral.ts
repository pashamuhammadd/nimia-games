// Nimia Partner Program — referral (invitee) types.

/**
 * Lifecycle of a single invited person, from the moment they register with
 * a partner's code through their reward being released. Matches the
 * "REFERRAL ACTIVITY" table states from the brief exactly — no extra
 * states invented, since the reward calculation logic that would drive
 * transitions between these isn't being built yet.
 */
export type ReferralStatus =
  | "registered"
  | "waiting_first_order"
  | "waiting_payment"
  | "reward_released";

export const REFERRAL_STATUS_LABEL: Record<ReferralStatus, string> = {
  registered: "Registered",
  waiting_first_order: "Waiting First Order",
  waiting_payment: "Waiting Payment",
  reward_released: "Reward Released",
};

/**
 * One row in a partner's Referral Activity table. `referredName` is
 * intentionally the only identifying field surfaced here (no email/contact
 * info) — the partner is shown who they invited, not given a way to
 * re-contact them outside Nimia Studio.
 */
export interface Referral {
  id: string;
  partnerId: string;
  referredName: string;
  status: ReferralStatus;
  /** Reward tied to this specific referral, in USD. 0 until at least a first order exists. */
  rewardUsd: number;
  createdAt: string;
}
