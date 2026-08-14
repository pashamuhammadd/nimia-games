// Shared between app/r/[code]/route.ts (writes this cookie) and
// app/register/page.tsx (reads it to pre-fill RegisterForm). Kept as a
// small app-level helper rather than inside modules/partners — it's a
// Next.js cookie-naming/lifetime detail specific to THIS app's routing,
// not a Partner Program business rule (the module doesn't know or care
// that referral capture happens to be implemented via a cookie).
export const REFERRAL_COOKIE_NAME = "nimia_referral_code";

// 30 days — long enough to cover someone clicking a referral link and
// deciding to sign up later, short enough that a very old, unrelated visit
// isn't misattributed as "how they found us" indefinitely.
export const REFERRAL_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
