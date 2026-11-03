// URLs used by the redesigned homepage (Tahap 1). Every CTA points at a
// route that exists today; nothing here invents a new order flow.

export const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.nimiastudio.com";

export const CLIENT_LOGIN_URL = `${APP_URL}/login`;
export const CLIENT_DASHBOARD_URL = `${APP_URL}/dashboard`;

/**
 * Telegram is an optional help channel, never the order path. The studio's
 * Telegram username has not been decided yet (docs/nimia-studio-redesign,
 * 01-KEPUTUSAN C2), so the link only renders when the env var is set to a
 * real t.me URL. Pasha's personal Telegram Business account is deliberately
 * NOT used as a fallback.
 */
export function resolveTelegramHelpUrl(raw: string | undefined | null): string | null {
  if (!raw) return null;
  const value = raw.trim();
  try {
    const url = new URL(value);
    const isTelegramHost = url.hostname === "t.me" || url.hostname === "telegram.me";
    if (url.protocol !== "https:" || !isTelegramHost || url.pathname.length <= 1) {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
}
