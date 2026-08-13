// Optional external AI provider hook — used ONLY to polish prose (a
// project's outreach draft tone), never to decide an opportunity_score,
// a prospect_status, or to invent evidence/facts about a project. That
// split is deliberate: the spec requires the score to remain explainable
// and evidence to never be invented — both guarantees come from
// tools/scoreProject.ts's plain deterministic logic, which works
// identically with or without this provider configured. This file is the
// ONE place that calls out to a paid LLM API, so it's the one place that
// needs to fail gracefully (spec section 20: "if a provider is not
// configured, the application must fail gracefully and explain what
// configuration is missing").
//
// Supports Anthropic's Messages API directly via fetch (no SDK
// dependency, keeping this package's footprint small) — AI_PROVIDER is
// reserved for a future OpenAI-compatible branch if ever needed, but only
// "anthropic" is implemented in V2. Unchanged from the retired "AI Client
// Hunter" — this file's job (polish prose, never decide facts) didn't
// change with the CoinGecko-only rewrite.

export type AiProviderResult = { text: string } | { configured: false; reason: string } | { configured: true; error: string };

function isConfigured(): boolean {
  return Boolean(process.env.AI_PROVIDER_API_KEY);
}

export function isAiProviderConfigured(): boolean {
  return isConfigured();
}

export function aiProviderStatusMessage(): string {
  if (isConfigured()) {
    const provider = process.env.AI_PROVIDER || "anthropic";
    const model = process.env.AI_MODEL || "(default)";
    return `AI-assisted write-ups enabled (${provider}, ${model}).`;
  }
  return "AI_PROVIDER_API_KEY is not set — outreach drafts and reasoning prose use the built-in deterministic " +
    "engine only (no LLM call is made). Set AI_PROVIDER_API_KEY and AI_MODEL in .env.local to enable AI-assisted " +
    "prose.";
}

/** Calls the configured provider with a strict "do not invent facts"
 * system prompt. Returns `{ text }` on success, or a `configured` flag
 * explaining why nothing was called/returned — NEVER throws, so a
 * missing key or a transient API failure always falls back to the
 * deterministic templates in tools/scoreProject.ts / outreach.ts rather
 * than breaking a pipeline run. */
export async function callAiProvider(params: {
  system: string;
  prompt: string;
  maxTokens?: number;
}): Promise<AiProviderResult> {
  if (!isConfigured()) {
    return { configured: false, reason: aiProviderStatusMessage() };
  }

  const provider = process.env.AI_PROVIDER || "anthropic";
  if (provider !== "anthropic") {
    return { configured: true, error: `AI_PROVIDER="${provider}" is not implemented in V2 (only "anthropic" is supported).` };
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": process.env.AI_PROVIDER_API_KEY!,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: process.env.AI_MODEL || "claude-3-5-haiku-latest",
        max_tokens: params.maxTokens ?? 400,
        system: params.system,
        messages: [{ role: "user", content: params.prompt }],
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      return { configured: true, error: `AI provider returned ${response.status}: ${body.slice(0, 200)}` };
    }

    const json = (await response.json()) as { content?: { type: string; text?: string }[] };
    const text = json.content?.find((block) => block.type === "text")?.text?.trim();
    if (!text) {
      return { configured: true, error: "AI provider returned no text content." };
    }
    return { text };
  } catch (error) {
    return { configured: true, error: error instanceof Error ? error.message : "AI provider request failed." };
  }
}
