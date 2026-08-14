import { z } from "zod";
import { REFERRAL_CODE_CHARSET, REFERRAL_CODE_LENGTH } from "../utils/generate-referral-code";

// Shared charset/length regex — built from the same constants
// generate-referral-code.ts uses, so the "what does a valid code look
// like" rule only ever lives in one place.
const REFERRAL_CODE_PATTERN = new RegExp(`^[${REFERRAL_CODE_CHARSET}]{${REFERRAL_CODE_LENGTH}}$`);

/**
 * Validates the OPTIONAL referral code field on the Register form. Format
 * only — whether the code actually belongs to a real partner is a lookup
 * the (not-yet-built) backend does; this schema exists so the client-side
 * "Apply" button and the eventual server action share one rule instead of
 * two hand-rolled regexes drifting apart.
 */
export const referralCodeInputSchema = z
  .string()
  .trim()
  .toUpperCase()
  .refine((value) => value === "" || REFERRAL_CODE_PATTERN.test(value), {
    message: `Referral code must be ${REFERRAL_CODE_LENGTH} characters (letters/numbers, no O, 0, I, 1, L).`,
  });

export type ReferralCodeInputValue = z.infer<typeof referralCodeInputSchema>;

/** Applying a referral code as part of registration — the code plus who's applying it (by email, pre-account-creation). */
export const applyReferralSchema = z.object({
  referralCode: referralCodeInputSchema,
  email: z.string().trim().email().optional(),
});
export type ApplyReferralValues = z.infer<typeof applyReferralSchema>;
