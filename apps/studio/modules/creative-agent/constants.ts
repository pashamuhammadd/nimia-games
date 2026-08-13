// Mirrors apps/studio/app/lib/referralCookie.ts's pattern: cookie name +
// lifetime as named constants, not magic strings scattered across the
// route handler and repository.
export const CREATIVE_AGENT_SESSION_COOKIE = "creative_agent_session";
export const CREATIVE_AGENT_SESSION_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days
