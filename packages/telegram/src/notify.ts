import { sendTelegramMessage, buildInlineKeyboard, type TelegramLinkButton } from "./rest";
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
 * official channel the project's own CoinGecko profile reported. Never
 * throws — a missing TELEGRAM_CHANNEL_PROSPECT_HUNTER_ID or a Telegram API
 * failure is logged and swallowed, exactly like @nimia/discord's
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

  try {
    const chatId = getTelegramChannelId("prospect-hunter");
    await sendTelegramMessage(
      chatId,
      lines.join("\n"),
      buttons.length > 0 ? buildInlineKeyboard(buttons) : undefined,
    );
  } catch (error) {
    console.error("[telegram] Failed to send prospect found notification", error);
  }
}
