import type { ReferralStatus } from "../types/referral";

// Orders that are somewhere in a payment-pending sub-status — see
// packages/db/migrations/0001_enums_and_users.sql's original order_status
// enum plus 0012's negotiation/crypto-payment additions
// ('negotiating' | 'awaiting_payment' | 'payment_submitted' were added
// there; 'quotation_sent' is the older pre-0012 equivalent, still
// produced by some historical rows).
const PAYMENT_PENDING_ORDER_STATUSES = [
  "quotation_sent",
  "negotiating",
  "awaiting_payment",
  "payment_submitted",
];

/**
 * Maps a referred person's raw order status (+ whether a reward already
 * exists for them) onto the brief's 4-state Referral Activity model
 * (Registered / Waiting First Order / Waiting Payment / Reward Released).
 * The DB only stores order_status directly — this mapping is an
 * interpretation made when wiring up real data (30 Juli 2026, migration
 * 0016), since the brief didn't specify the exact order_status ->
 * referral-status mapping:
 *
 *   - No order at all yet                        -> "registered"
 *   - Has an order, reward already exists for them -> "reward_released"
 *     (checked FIRST — a completed order later revisited for a new order
 *     shouldn't regress the status)
 *   - Order sitting in a payment-pending sub-status
 *     (quotation_sent/negotiating/awaiting_payment/payment_submitted)
 *     -> "waiting_payment"
 *   - Any other order status (pending_review, rejected, converted without
 *     a reward yet, paid-but-reward-trigger-hasn't-run-yet edge case,
 *     etc.) -> "waiting_first_order"
 *
 * `rewardUsd` doubles as the "has a reward" signal (repository sums
 * partner_rewards for this referral) rather than a separate boolean —
 * simpler than threading an extra flag through the RPC just for this.
 */
export function deriveReferralStatus(orderStatus: string | null, rewardUsd: number): ReferralStatus {
  if (rewardUsd > 0) return "reward_released";
  if (!orderStatus) return "registered";
  if (PAYMENT_PENDING_ORDER_STATUSES.includes(orderStatus)) return "waiting_payment";
  return "waiting_first_order";
}
