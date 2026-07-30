// Referral code generator — brief requirements:
//   - 8 characters, permanent, unique, uppercase.
//   - Allowed characters only (ambiguous-looking ones excluded so a code is
//     easy to read aloud/retype): no O, 0, I, 1, or L.
//
// NOTE on the brief's literal text: it lists the allowed charset as
// "ABCDEFGHJKLMNPQRSTUVWXYZ" (which still contains "L") right above an
// explicit "JANGAN gunakan karakter: ... L" exclusion list. Those two lines
// contradict each other. This implementation follows the explicit
// exclusion list (treated as the stronger, unambiguous instruction) and
// drops L too — the worked example in the brief ("NM8K2P4Q") is consistent
// with either reading, so there's no evidence pointing the other way.
export const REFERRAL_CODE_LENGTH = 8;
export const REFERRAL_CODE_CHARSET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

/**
 * Generates ONE candidate code. Uniqueness against existing codes is a
 * repository-layer concern (see repository/partner.repository.ts) — this
 * function only guarantees shape/charset, not uniqueness, since that
 * requires a lookup a pure util shouldn't own.
 */
export function generateReferralCode(length: number = REFERRAL_CODE_LENGTH): string {
  const charset = REFERRAL_CODE_CHARSET;
  const bytes = new Uint8Array(length);

  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    crypto.getRandomValues(bytes);
  } else {
    // Non-crypto fallback (should not be hit in Node 19+/modern browsers,
    // which both expose global `crypto`) — good enough for a UI-layer mock,
    // never used for anything security-sensitive.
    for (let i = 0; i < length; i += 1) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }

  let code = "";
  for (let i = 0; i < length; i += 1) {
    code += charset[bytes[i] % charset.length];
  }
  return code;
}

/** True if `value` looks like a well-formed referral code (right length + charset), independent of whether it actually exists. */
export function isValidReferralCodeFormat(value: string): boolean {
  const pattern = new RegExp(`^[${REFERRAL_CODE_CHARSET}]{${REFERRAL_CODE_LENGTH}}$`);
  return pattern.test(value.trim().toUpperCase());
}

/** Normalizes user input (register form / referral link segment) before validation or lookup. */
export function normalizeReferralCode(value: string): string {
  return value.trim().toUpperCase();
}
