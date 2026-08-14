import { z } from "zod";

// Validates the "Withdraw Reward" form (app/dashboard/partners/withdraw) —
// format/presence only, same split as referral.schema.ts's
// referralCodeInputSchema: the client form and the server action that
// actually calls request_partner_withdrawal() (packages/db/migrations/0033_partner_reward_withdrawals.sql)
// share this one rule instead of two hand-rolled checks drifting apart.
// The RPC itself re-validates address length/emptiness server-side too —
// this schema is a UX nicety (fail fast, friendly message), not the real
// authority.
export const walletNetworkSchema = z.enum(["ethereum", "bsc", "tron", "solana", "cardano", "ton"]);

export const withdrawalRequestSchema = z.object({
  walletNetwork: walletNetworkSchema,
  walletAddress: z
    .string()
    .trim()
    .min(6, "Enter a valid wallet address.")
    .max(200, "That address looks too long — double check you copied it correctly."),
});

export type WithdrawalRequestValues = z.infer<typeof withdrawalRequestSchema>;
