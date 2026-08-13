import { z } from "zod";

// Runtime shape of what the AI provider returns for one turn. This is the
// ONE place that validates untrusted model output before the service layer
// trusts it enough to merge into structured_data or show it in the UI —
// same "don't trust it blindly" posture as modules/partners/schemas'
// partnerSchema, just applied to LLM JSON instead of a DB row.
//
// Every structured-data field is optional AND nullable: Gemini is
// instructed (see service/system-prompt.ts) to omit a field entirely when
// it doesn't know it, but `.nullable()` is kept too in case it returns an
// explicit `null` instead of omitting the key — both must parse.

// Defense-in-depth against the repetition-loop pathology (13 Agustus 2026 —
// see gemini-provider.ts's attemptOnce() comment): the real fix is the
// system prompt no longer asking the model to restate/merge old context
// into each field, but a field is still meant to be one short phrase, so a
// hard cap + truncation here means even a misbehaving response degrades to
// "a bit long" instead of a multi-KB garbage string reaching the UI/DB.
// Truncating (not failing) matches the same "don't fail the whole turn over
// a cosmetic overshoot" reasoning as quickReplies' slice below.
const shortString = z
  .string()
  .nullable()
  .optional()
  .transform((value) => (value && value.length > 200 ? `${value.slice(0, 200)}…` : value));

const stringArray = z
  .array(z.string().transform((value) => (value.length > 200 ? `${value.slice(0, 200)}…` : value)))
  .nullable()
  .optional();

// briefSummary (P9, 13 Agustus 2026) is meant to be a real paragraph, not
// a short phrase — a much higher cap than shortString's 200 chars, but
// still a hard, non-negotiable ceiling for the exact same reason: it's the
// one defense that survives even if the "regenerate fresh, never append"
// system prompt rule (system-prompt.ts) somehow gets ignored and the
// model starts growing this field turn over turn again.
const longString = z
  .string()
  .nullable()
  .optional()
  .transform((value) => (value && value.length > 1500 ? `${value.slice(0, 1500)}…` : value));

export const structuredDataFieldsSchema = z.object({
  service: shortString,
  projectType: shortString,
  objective: shortString,
  concept: shortString,
  duration: shortString,
  characters: stringArray,
  style: shortString,
  references: stringArray,
  platform: shortString,
  deliverables: stringArray,
  sound: shortString,
  deadline: shortString,
  budget: shortString,
  complexity: shortString,
  estimatedPriceRange: shortString,
  briefSummary: longString,
});

export const aiTurnResponseSchema = z.object({
  reply: z.string().min(1),
  understanding: structuredDataFieldsSchema.default({}),
  missingInfo: z.array(z.string()).default([]),
  readyToConfirm: z.boolean().default(false),
  // Capped by slicing rather than `.max(6)` (13 Agustus 2026, after a real
  // turn failed validation entirely because the model returned a few too
  // many quick replies) — a minor overshoot on a cosmetic list shouldn't
  // fail the whole turn and fall back to "didn't quite catch that" when
  // `reply`/`understanding` were perfectly fine.
  quickReplies: z
    .array(z.string())
    .optional()
    .transform((options) => options?.slice(0, 6)),
});

export type AiTurnResponse = z.infer<typeof aiTurnResponseSchema>;
