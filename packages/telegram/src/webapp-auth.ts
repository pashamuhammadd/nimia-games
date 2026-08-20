import crypto from "node:crypto";
import { getTelegramClientBotConfig } from "./config";

// Verifies a Telegram Mini App's `initData` string server-side, per
// Telegram's own documented algorithm
// (https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app).
// This is the Telegram analogue of packages/discord/src/interactions.ts's
// verifyDiscordInteractionRequest — same purpose (never trust anything in
// an inbound payload until its signature is checked against a secret
// only this backend and the platform know), different mechanism (HMAC
// over a shared secret derived from the bot token, not Ed25519 over a
// published public key, because Telegram's Mini App model has no
// separate "public key" concept the way Discord's Interactions endpoint
// does).
//
// CRITICAL (docs/TELEGRAM.md §7, §16): the Mini App frontend also has
// `Telegram.WebApp.initDataUnsafe` — a client-side-parsed convenience
// object with the SAME fields as below, but never verified. NEVER use
// initDataUnsafe for any authorization decision anywhere in this
// codebase; every route that needs to know who a Mini App request is
// from must call verifyTelegramInitData on the RAW initData string
// instead. See apps/miniapp/app/api/telegram/session/route.ts and
// .../link/route.ts, the only two callers today.

export interface VerifiedTelegramUser {
  /** The Telegram user's numeric id, as a string — see
   * clients.telegram_user_id's own migration comment (0054) for why this
   * stays a string end-to-end rather than becoming a JS number anywhere
   * in this codebase. Parsed here via JSON.parse (Telegram itself sends
   * the `user` field as a JSON-encoded string inside initData), which
   * DOES parse the id as a JS number internally before this function
   * immediately re-stringifies it — Telegram user ids are currently well
   * within JS's 2^53 safe-integer range, so this round-trip is lossless
   * today, but is worth re-checking if Telegram ever changes their id
   * format. */
  id: string;
  firstName: string;
  lastName: string | null;
  username: string | null;
  photoUrl: string | null;
  languageCode: string | null;
  /** Present when the Mini App was opened via a `startapp=<payload>` deep
   * link (docs/TELEGRAM.md §10) — null for a plain open. This value is
   * part of the SIGNED initData (not just initDataUnsafe), so it's safe
   * to route on without a separate trust decision. */
  startParam: string | null;
  authDate: number;
}

// How old a `auth_date` can be before this function refuses to verify it
// — replay protection. Telegram re-signs a fresh initData every time the
// Mini App is opened/reopened, so under normal use this is always
// seconds old; 24h is a generous ceiling that still bounds how long a
// captured initData string could be replayed if one ever leaked (e.g.
// via a referrer header or clipboard), without being so tight that a
// clock-skewed device gets spuriously rejected.
const DEFAULT_MAX_AGE_SECONDS = 24 * 60 * 60;

/** Verifies `rawInitData` (the EXACT string from
 * `Telegram.WebApp.initData`, never the pre-parsed `initDataUnsafe`)
 * against the client-facing bot's token. Returns the verified user, or
 * `null` if the signature doesn't match or `auth_date` has expired —
 * deliberately returns null rather than throwing, since both callers
 * (session/route.ts, link/route.ts) treat "not verifiable" as an
 * ordinary 401 response, not a server error. */
export function verifyTelegramInitData(
  rawInitData: string,
  options?: { maxAgeSeconds?: number },
): VerifiedTelegramUser | null {
  if (!rawInitData) return null;

  const params = new URLSearchParams(rawInitData);
  const hash = params.get("hash");
  if (!hash) return null;
  params.delete("hash");

  // Telegram's algorithm: sort every remaining key alphabetically, join
  // as `key=value` lines with `\n` — this exact string (not the raw
  // query string) is what gets HMAC'd below.
  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");

  const { botToken } = getTelegramClientBotConfig();
  // secret_key = HMAC_SHA256(key="WebAppData", data=botToken), THEN
  // hash = HMAC_SHA256(key=secret_key, data=dataCheckString) — two HMAC
  // passes, per Telegram's own spec; easy to get the key/data order
  // backwards, hence spelling out both steps explicitly here.
  const secretKey = crypto.createHmac("sha256", "WebAppData").update(botToken).digest();
  const expectedHash = crypto.createHmac("sha256", secretKey).update(dataCheckString).digest("hex");

  const expectedBuffer = Buffer.from(expectedHash, "utf8");
  const providedBuffer = Buffer.from(hash, "utf8");
  if (
    expectedBuffer.length !== providedBuffer.length ||
    !crypto.timingSafeEqual(expectedBuffer, providedBuffer)
  ) {
    return null;
  }

  const authDate = Number(params.get("auth_date"));
  const maxAge = options?.maxAgeSeconds ?? DEFAULT_MAX_AGE_SECONDS;
  if (!authDate || Date.now() / 1000 - authDate > maxAge) {
    return null;
  }

  const userRaw = params.get("user");
  if (!userRaw) return null;

  let user: {
    id: number | string;
    first_name: string;
    last_name?: string;
    username?: string;
    photo_url?: string;
    language_code?: string;
  };
  try {
    user = JSON.parse(userRaw);
  } catch {
    return null;
  }

  return {
    id: String(user.id),
    firstName: user.first_name,
    lastName: user.last_name ?? null,
    username: user.username ?? null,
    photoUrl: user.photo_url ?? null,
    languageCode: user.language_code ?? null,
    startParam: params.get("start_param"),
    authDate,
  };
}
