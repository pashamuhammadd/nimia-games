import type { ChatMessage, StructuredProjectData, UploadedAsset } from "../types";

/** What a provider call returns on success — already validated against
 * ../schema/structured-data.schema.ts by the caller before this shape is
 * trusted anywhere else. `understanding` is a PARTIAL update, not the full
 * cumulative object — creative-session.repository.ts's appendTurn merges
 * it field-by-field into the session's existing structured_data. */
export type AiTurnResult =
  | {
      ok: true;
      reply: string;
      understanding: Partial<StructuredProjectData>;
      missingInfo: string[];
      readyToConfirm: boolean;
      quickReplies?: string[];
    }
  | {
      ok: false;
      /** Human-readable, safe to show the visitor as-is (e.g. "Nimia
       * Creative Agent isn't configured yet" or "That took too long,
       * please try again") — never a raw provider error/stack trace. */
      reason: string;
    };

/** One method, deliberately: understand() is the entire surface a provider
 * needs to implement. Adding a second provider (OpenAI, Anthropic, a local
 * model) later means one new file in this directory plus one branch in
 * ./index.ts's getAiProvider() — nothing in modules/creative-agent/service
 * or /components changes. Mirrors the shape (env-var-gated, never throws)
 * of apps/admin/lib/ai-agent/provider.ts's callAiProvider, extended from a
 * single prose-polish call into a full structured conversational turn. */
export interface AiProvider {
  understand(params: {
    history: ChatMessage[];
    structuredData: StructuredProjectData;
    /** Files already attached this session (P5, 13 Agustus 2026) — passed
     * as context only, same reasoning as structuredData: so the AI never
     * asks for something the visitor already handed over. Never written to
     * by the AI's own response. */
    uploadedAssets: UploadedAsset[];
    /** The message the visitor just sent — kept separate from `history`
     * (which is everything BEFORE it) so a provider implementation can
     * decide for itself how to frame "the latest thing to respond to" vs
     * "prior context" in its own prompt format. */
    latestMessage: string;
  }): Promise<AiTurnResult>;
}
