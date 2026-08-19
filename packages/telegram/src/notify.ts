import { sendTelegramMessage, sendTelegramPhoto, buildInlineKeyboard, type TelegramLinkButton } from "./rest";
import { getTelegramChannelId } from "./config";

// AI Prospect Hunter partner broadcast (added 19 Agustus 2026) — the
// Telegram twin of packages/discord/src/notify.ts's #prospect-hunter
// section; see that file's own top comment for the full feature story
// (product request, permanent-dedup guarantee, "never a 'mark as
// contacted' button" decision). `ProspectFoundInput` here is intentionally
// the EXACT SAME SHAPE as @nimia/discord's — apps/admin/lib/ai-agent/
// orchestrator.ts builds one input object and passes it to both packages'
// notifyProspectFound, never adapting shape per-platform. Kept as a
// separate type (not re-exported from @nimia/discord) so this package
// still has zero dependency on that one, matching its own "no discord.js"
// zero-dependency posture in README.md.
//
// Every export below is deliberately NEVER-THROWING, same posture as
// @nimia/discord's notify.ts — by the time this is called the project is
// already saved to `ai_projects`; Telegram being down or misconfigured
// must never roll that back or surface as an error to whatever cron route
// triggered the run.

export type ProspectFoundInput = {
  name: string;
  symbol: string | null;
  /** The project's own logo, straight from its CoinGecko profile — never
   * a guessed/generated image. Added 20 Agustus 2026 per product request
   * ("bisa gak pesannya diimprove, misalnya ada gambarnya yaitu logo
   * projeknya"). When present, the message is sent as a photo (Telegram's
   * `sendPhoto`, rest.ts) with this caption instead of a plain text
   * message — see notifyProspectFound's own comment for the fallback if
   * that fails. Null just means a plain text message, same as before this
   * field existed. */
  logoUrl: string | null;
  category: string | null;
  opportunityScore: number;
  opportunityLevel: string;
  commercialPotential: string;
  recommendedServices: string[];
  reasoning: string;
  marketCapUsd: number | null;
  links: {
    website: string | null;
    twitter: string | null;
    telegram: string | null;
    discord: string | null;
    coingeckoUrl: string | null;
  };
};

/** Escapes the 3 characters Telegram's HTML parse mode treats specially
 * (https://core.telegram.org/bots/api#html-style) — required because
 * `reasoning`, `name`, `category`, etc. below are project-supplied text
 * (ultimately from CoinGecko, not this codebase's own copy) that could
 * contain any of these and would otherwise either break the message or
 * get silently swallowed by Telegram's parser. rest.ts's
 * sendTelegramMessage does NOT do this itself (see that function's own
 * comment) — every caller that builds `text` is responsible for escaping
 * whatever isn't a literal tag this file wrote itself. */
function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function formatMarketCap(marketCapUsd: number | null): string {
  if (marketCapUsd == null) return "Unknown";
  return `$${Math.round(marketCapUsd).toLocaleString()}`;
}

/** Telegram caps a photo message's `caption` at 1024 characters (vs. 4096
 * for a plain text message — see rest.ts's sendTelegramPhoto comment).
 * Builds the caption out of WHOLE lines only, stopping before any line
 * that would push past `maxLength` — never cuts a line in half, which
 * matters here specifically because every line with a tag on it
 * (`<b>...</b>`) opens AND closes on the same line, so dropping a whole
 * line can never leave a dangling unclosed tag for Telegram's HTML parser
 * to choke on. A few trailing fields (e.g. "Suggested Services") silently
 * missing from an unusually long caption is an acceptable trade-off — the
 * full text is still available in Telegram's fallback path (see
 * notifyProspectFound below) if sendPhoto fails for any reason. */
function buildCaption(lines: string[], maxLength: number): string {
  let result = "";
  for (const line of lines) {
    const candidate = result ? `${result}\n${line}` : line;
    if (candidate.length > maxLength) break;
    result = candidate;
  }
  return result;
}

function buildProspectLinkButtons(links: ProspectFoundInput["links"]): TelegramLinkButton[] {
  const candidates: (TelegramLinkButton | null)[] = [
    links.website ? { label: "🌐 Website", url: links.website } : null,
    links.twitter ? { label: "🐦 Twitter / X", url: links.twitter } : null,
    links.telegram ? { label: "✈️ Telegram", url: links.telegram } : null,
    links.discord ? { label: "💬 Discord", url: links.discord } : null,
    links.coingeckoUrl ? { label: "📊 View on CoinGecko", url: links.coingeckoUrl } : null,
  ];
  return candidates.filter((b): b is TelegramLinkButton => b !== null);
}

/** Posts one new-prospect message to the configured "prospect-hunter"
 * Telegram channel (Nimia Partner Program broadcast channel — see this
 * package's README for setup), with one inline-keyboard link button per
 * official channel the project's own CoinGecko profile reported. When
 * `input.logoUrl` is present, sends it as a PHOTO message (Telegram's
 * `sendPhoto`) with the text as caption instead of a plain text message —
 * added 20 Agustus 2026 per product request for a more visual broadcast.
 * If that photo send fails for ANY reason (bad/unreachable logo URL,
 * Telegram couldn't fetch it, etc.), falls back to the plain text message
 * with the FULL untruncated text — a broken image link should never cost
 * the whole notification, it should just degrade to what this function
 * already did before `logoUrl` existed. Never throws — a missing
 * TELEGRAM_CHANNEL_PROSPECT_HUNTER_ID or a Telegram API failure on BOTH
 * attempts is logged and swallowed, exactly like @nimia/discord's
 * notifyProspectFound; the project is still saved and visible in the admin
 * dashboard either way, and the Discord-side post (if that succeeded) is
 * never rolled back by a Telegram failure or vice versa — callers
 * (orchestrator.ts) fire both independently via Promise.allSettled, never
 * making one depend on the other. */
export async function notifyProspectFound(input: ProspectFoundInput): Promise<void> {
  const buttons = buildProspectLinkButtons(input.links);
  const title = `🎯 <b>New Prospect — ${escapeHtml(input.name)}${input.symbol ? ` ($${escapeHtml(input.symbol)})` : ""}</b>`;
  const lines = [
    title,
    "",
    escapeHtml(input.reasoning),
    "",
    ...(input.category ? [`<b>Category:</b> ${escapeHtml(input.category)}`] : []),
    `<b>Opportunity Score:</b> ${input.opportunityScore}/100 (${escapeHtml(input.opportunityLevel)})`,
    `<b>Commercial Potential:</b> ${escapeHtml(input.commercialPotential)}`,
    `<b>Market Cap:</b> ${formatMarketCap(input.marketCapUsd)}`,
    ...(input.recommendedServices.length > 0
      ? [`<b>Suggested Services:</b> ${escapeHtml(input.recommendedServices.join(", "))}`]
      : []),
  ];
  const fullText = lines.join("\n");
  const replyMarkup = buttons.length > 0 ? buildInlineKeyboard(buttons) : undefined;

  try {
    const chatId = getTelegramChannelId("prospect-hunter");

    if (input.logoUrl) {
      try {
        await sendTelegramPhoto(chatId, input.logoUrl, buildCaption(lines, 1024), replyMarkup);
        return;
      } catch (photoError) {
        console.error("[telegram] sendPhoto failed, falling back to plain text", photoError);
        // Fall through to the plain-text send below — a bad logo URL
        // should never cost the whole notification.
      }
    }

    await sendTelegramMessage(chatId, fullText, replyMarkup);
  } catch (error) {
    console.error("[telegram] Failed to send prospect found notification", error);
  }
}
