// One-off script — registers the Business Sales Assistant's webhook URL
// with Telegram. Run this ONCE (or again after rotating the webhook
// secret) — not something that runs on every deploy.
//
// Deliberately takes the bot token + secret as command-line arguments
// rather than reading apps/miniapp/.env.local, so it works standalone
// with zero setup (just plain Node, no dotenv, no workspace packages
// needed) — Node 18+ has `fetch` built in. Hits the exact same Telegram
// endpoint, with the exact same allowed_updates list, as
// @nimia/telegram's setBusinessWebhook (packages/telegram/src/business/rest.ts) —
// this script just doesn't require installing/building the monorepo
// first to run once.
//
// IMPORTANT: run this AFTER apps/miniapp is deployed and the webhook URL
// below is actually reachable from the public internet — Telegram will
// reject registering a URL it can't call.
//
// Usage (PowerShell, from the repo root):
//   node scripts\register-telegram-business-webhook.mjs <BOT_TOKEN> <WEBHOOK_SECRET>
//
// <BOT_TOKEN>      = TELEGRAM_BUSINESS_BOT_TOKEN (from @BotFather)
// <WEBHOOK_SECRET> = TELEGRAM_BUSINESS_WEBHOOK_SECRET (the random string
//                    you generated and put in apps/miniapp/.env.local /
//                    Vercel — must match exactly, this is what the
//                    webhook route checks every incoming request against)

const [, , botToken, webhookSecret] = process.argv;

// Change this if apps/miniapp isn't deployed at this domain yet (e.g.
// still on a Vercel preview URL) — must be the PUBLIC https URL that
// resolves to apps/miniapp/app/api/telegram/business/webhook/route.ts.
const WEBHOOK_URL = "https://miniapp.nimiastudio.com/api/telegram/business/webhook";

if (!botToken || !webhookSecret) {
  console.error("Usage: node scripts/register-telegram-business-webhook.mjs <BOT_TOKEN> <WEBHOOK_SECRET>");
  process.exit(1);
}

const response = await fetch(`https://api.telegram.org/bot${botToken}/setWebhook`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    url: WEBHOOK_URL,
    secret_token: webhookSecret,
    allowed_updates: ["business_connection", "business_message", "edited_business_message", "callback_query"],
  }),
});

const data = await response.json();
console.log(JSON.stringify(data, null, 2));

if (!data.ok) {
  console.error("\n❌ setWebhook failed — see the error above (common cause: the URL isn't publicly reachable yet, or the token is wrong).");
  process.exit(1);
}

console.log(`\n✅ Webhook registered: ${WEBHOOK_URL}`);
console.log("Next: connect the bot to Pasha's own Telegram Business account (Settings → Telegram Business → Chatbots / Chat Automation → Secretary Mode), then send it a test message.");
