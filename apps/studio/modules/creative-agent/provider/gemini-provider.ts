import type { AiProvider, AiTurnResult } from "./types";
import type { UploadedAsset } from "../types";
import { aiTurnResponseSchema } from "../schema/structured-data.schema";
import { CREATIVE_AGENT_SYSTEM_PROMPT } from "../service/system-prompt";
import { buildCatalogPriceHints } from "../lib/catalog-price-hints";

// Google Gemini implementation of AiProvider — MVP default (free tier,
// confirmed with the user 13 Agustus 2026). Plain `fetch`, no
// `@google/generative-ai` SDK dependency, matching this codebase's
// existing convention (see apps/admin/lib/ai-agent/provider.ts's own
// comment on why it calls Anthropic directly instead of pulling in an
// SDK). Never throws — every failure path returns `{ ok: false, reason }`
// so a missing key or a transient API hiccup degrades to a friendly
// message in the UI instead of a 500.

// Model default history (both found live, 13 Agustus 2026, via real 404s
// from a freshly-created Google AI Studio key — not guesses):
//   1. gemini-2.0-flash (original default) — fully retired by Google.
//   2. gemini-2.5-flash — NOT retired, but returns the same 404 ("no
//      longer available to NEW users") for any API key/project with no
//      prior history calling 2.x models. Per Google's own AI Developers
//      Forum response, this is deliberate capacity management, not a bug:
//      2.x models stay working for accounts that already used them, but
//      are gated for brand-new keys — which is exactly what a fresh
//      CREATIVE_AGENT_API_KEY is. Google's own guidance for new projects:
//      use 3.5 Flash or 3.1 Flash-Lite instead.
// gemini-3.5-flash is confirmed free-tier (ai.google.dev/gemini-api/docs/
// pricing) and not preview-tagged, so it's the default here. If this ever
// 404s again — Google's model lineup churns fast — check
// https://ai.google.dev/gemini-api/docs/models for the current one, and
// set CREATIVE_AGENT_MODEL in .env.local rather than editing this file.
const DEFAULT_MODEL = "gemini-3.5-flash";

// Gemini's structured-output schema is a constrained subset of OpenAPI 3.0
// (type/properties/items/nullable — no $ref, no oneOf), BUT `type` values
// use Gemini's own uppercase Type enum (STRING/OBJECT/ARRAY/BOOLEAN/...),
// not OpenAPI's lowercase strings — using lowercase here is a real request-
// breaking mistake, not just a style nit. This mirrors StructuredProjectData
// (../types/session.ts) field-for-field; keep the two in sync by hand if a
// field is ever added or removed.
const nullableString = { type: "STRING", nullable: true } as const;
const nullableStringArray = {
  type: "ARRAY",
  items: { type: "STRING" },
  nullable: true,
} as const;

const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    reply: { type: "STRING" },
    understanding: {
      type: "OBJECT",
      properties: {
        service: nullableString,
        projectType: nullableString,
        objective: nullableString,
        concept: nullableString,
        duration: nullableString,
        characters: nullableStringArray,
        style: nullableString,
        references: nullableStringArray,
        platform: nullableString,
        deliverables: nullableStringArray,
        sound: nullableString,
        deadline: nullableString,
        budget: nullableString,
        complexity: nullableString,
        estimatedPriceRange: nullableString,
        briefSummary: nullableString,
      },
    },
    missingInfo: { type: "ARRAY", items: { type: "STRING" } },
    readyToConfirm: { type: "BOOLEAN" },
    quickReplies: { type: "ARRAY", items: { type: "STRING" } },
  },
  required: ["reply", "understanding", "missingInfo", "readyToConfirm"],
};

const MAX_ATTEMPTS = 2;

function isConfigured(): boolean {
  return Boolean(process.env.CREATIVE_AGENT_API_KEY);
}

export function geminiProviderStatusMessage(): string {
  if (isConfigured()) return "Nimia Creative Agent is live (Gemini).";
  return "CREATIVE_AGENT_API_KEY is not set — Nimia Creative Agent cannot reach an AI model yet. Get a free key " +
    "from Google AI Studio (aistudio.google.com/apikey) and set CREATIVE_AGENT_API_KEY (and optionally " +
    "CREATIVE_AGENT_MODEL) in .env.local.";
}

/** One request/parse/validate attempt. Never throws — every failure path
 * returns `{ ok: false, reason, retryable }`. Split out from `understand()`
 * so it can be called more than once (see MAX_ATTEMPTS below): a real
 * failure seen live 13 Agustus 2026 was Gemini getting stuck in a
 * degenerate repetition loop inside one JSON string value ("2D
 * Animation2D Animation2D Animation..." dozens of times), which burns the
 * whole output-token budget before the JSON can close and can't be
 * schema-validated — a known LLM decoding pathology, not something a
 * prompt tweak reliably prevents. A fresh attempt (new sampling run) is
 * the standard mitigation; retrying costs one extra free-tier call only
 * on the rare turn that needs it. */
async function attemptOnce(params: {
  history: { role: "user" | "assistant"; content: string }[];
  structuredData: unknown;
  uploadedAssets: UploadedAsset[];
  latestMessage: string;
  model: string;
  apiKey: string;
}): Promise<{ ok: true; result: Extract<AiTurnResult, { ok: true }> } | { ok: false; reason: string; retryable: boolean }> {
  const { history, structuredData, uploadedAssets, latestMessage, model, apiKey } = params;

  const uploadedAssetsNote =
    uploadedAssets.length > 0
      ? `\n\nFiles the client has already attached this conversation (never ask for these again — you may ` +
        `acknowledge them naturally if relevant): ${uploadedAssets.map((file) => file.name).join(", ")}`
      : "";

  // P9 (13 Agustus 2026) — Nimia's official catalog price list, given as
  // reference-only context for the optional `estimatedPriceRange` field
  // (see system-prompt.ts's rule on this). Built fresh per call from
  // modules/order/data/catalog.ts, the exact same source the Order Wizard
  // itself prices against.
  const catalogPriceHints = buildCatalogPriceHints();
  const catalogNote = catalogPriceHints
    ? `\n\nNimia's official catalog price list, for giving a ROUGH courtesy estimate only (see the ` +
      `estimatedPriceRange rule — never treat these as an exact quote for a freeform conversation):\n${catalogPriceHints}`
    : "";

  const systemInstruction =
    `${CREATIVE_AGENT_SYSTEM_PROMPT}\n\nCurrent cumulative understanding (JSON, may have null fields — treat ` +
    `every non-null field here as already known, do not ask about it again):\n${JSON.stringify(structuredData)}` +
    uploadedAssetsNote +
    catalogNote;

  const contents = [
    ...history.map((message) => ({
      role: message.role === "assistant" ? "model" : "user",
      parts: [{ text: message.content }],
    })),
    { role: "user", parts: [{ text: latestMessage }] },
  ];

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          contents,
          systemInstruction: { parts: [{ text: systemInstruction }] },
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: RESPONSE_SCHEMA,
            temperature: 0.4,
            // Tried `frequencyPenalty: 0.4` here (13 Agustus 2026) to
            // discourage the repeated-phrase decoding loop described
            // above — REMOVED the same day after a real request came back
            // `400 "Penalty is not enabled for this model"`. Penalty
            // support is apparently per-model on Gemini's side and
            // gemini-3.5-flash doesn't have it; the automatic retry below
            // is the mitigation that's actually in effect now. Don't
            // re-add frequencyPenalty/presencePenalty without confirming
            // the specific model supports it first.
            //
            // Bumped 800 -> 1536 (13 Agustus 2026, repetition-loop fix) so
            // a normal reply+understanding never gets cut off mid-JSON,
            // then 1536 -> 2048 (same day, P9) once `briefSummary` — a real
            // paragraph, not a short phrase — became part of every
            // readyToConfirm turn's response.
            maxOutputTokens: 2048,
          },
        }),
      },
    );

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      console.error("[creative-agent] Gemini returned", response.status, body.slice(0, 500));
      return {
        ok: false,
        reason: "Nimia Creative Agent is having trouble thinking right now. Please try again in a moment.",
        // 4xx (bad model name, bad key, bad request) won't fix itself on
        // retry; 5xx/429 might.
        retryable: response.status >= 500 || response.status === 429,
      };
    }

    const json = (await response.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[];
    };
    const rawText = json.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) {
      // finishReason here is the actual diagnostic — e.g. "MAX_TOKENS"
      // means the cap above needs raising further, "SAFETY" means the
      // prompt/response tripped a safety filter, vs. a plain empty
      // response. Logged so a real failure is traceable instead of every
      // empty-response cause looking identical.
      console.error("[creative-agent] Gemini returned no text", json.candidates?.[0]?.finishReason ?? "(no finishReason)");
      return { ok: false, reason: "Nimia Creative Agent didn't quite catch that. Could you rephrase?", retryable: true };
    }

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(rawText);
    } catch {
      console.error("[creative-agent] Gemini returned non-JSON text", rawText.slice(0, 800));
      return { ok: false, reason: "Nimia Creative Agent didn't quite catch that. Could you rephrase?", retryable: true };
    }

    const parsed = aiTurnResponseSchema.safeParse(parsedJson);
    if (!parsed.success) {
      console.error("[creative-agent] Gemini response failed schema validation", parsed.error.flatten());
      return { ok: false, reason: "Nimia Creative Agent didn't quite catch that. Could you rephrase?", retryable: true };
    }

    return {
      ok: true,
      result: {
        ok: true,
        reply: parsed.data.reply,
        understanding: parsed.data.understanding,
        missingInfo: parsed.data.missingInfo,
        readyToConfirm: parsed.data.readyToConfirm,
        quickReplies: parsed.data.quickReplies,
      },
    };
  } catch (error) {
    console.error("[creative-agent] Gemini request failed", error);
    return { ok: false, reason: "Nimia Creative Agent is temporarily unavailable. Please try again in a moment.", retryable: true };
  }
}

export const geminiProvider: AiProvider = {
  async understand({ history, structuredData, uploadedAssets, latestMessage }): Promise<AiTurnResult> {
    if (!isConfigured()) {
      return { ok: false, reason: geminiProviderStatusMessage() };
    }

    const model = process.env.CREATIVE_AGENT_MODEL || DEFAULT_MODEL;
    const apiKey = process.env.CREATIVE_AGENT_API_KEY!;

    let lastFailure: { reason: string } = { reason: "Nimia Creative Agent is temporarily unavailable. Please try again in a moment." };

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      const outcome = await attemptOnce({ history, structuredData, uploadedAssets, latestMessage, model, apiKey });
      if (outcome.ok) return outcome.result;

      lastFailure = outcome;
      if (!outcome.retryable) break;
      if (attempt < MAX_ATTEMPTS) {
        console.error(`[creative-agent] Attempt ${attempt} failed, retrying once`);
      }
    }

    return { ok: false, reason: lastFailure.reason };
  },
};
