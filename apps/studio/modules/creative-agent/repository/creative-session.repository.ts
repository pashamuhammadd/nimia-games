import { createServiceRoleClient } from "@nimia/db";
import type { AiTurnResult } from "../provider/types";
import type { ChatMessage, CreativeAgentSession, StructuredProjectData, UploadedAsset } from "../types";
import { EMPTY_STRUCTURED_DATA } from "../types";

// ------------------------------------------------------------------
// Data-access layer for creative_agent_sessions
// (packages/db/migrations/0041_creative_agent_sessions.sql). Unlike
// modules/partners' repository (which takes the CALLER's already-
// authenticated client so RLS applies), every method here creates its own
// createServiceRoleClient() — this table has zero RLS policies by design
// (see the migration's header comment), and the ONE caller of this
// repository, app/api/creative-agent/route.ts, is itself the trusted
// authorization boundary: it only ever passes a sessionToken that came out
// of its own httpOnly cookie. Never call this repository from anywhere
// that accepts a sessionToken from an untrusted source without also
// verifying it against that same cookie first.
// ------------------------------------------------------------------

interface SessionRow {
  id: string;
  session_token: string;
  client_id: string | null;
  status: "active" | "confirmed" | "abandoned";
  messages: ChatMessage[];
  structured_data: StructuredProjectData;
  uploaded_assets: UploadedAsset[];
  turn_count: number;
  created_at: string;
  updated_at: string;
  confirmed_at: string | null;
  order_id: string | null;
}

function toSession(row: SessionRow): CreativeAgentSession {
  return {
    id: row.id,
    sessionToken: row.session_token,
    clientId: row.client_id,
    status: row.status,
    messages: row.messages ?? [],
    structuredData: { ...EMPTY_STRUCTURED_DATA, ...(row.structured_data ?? {}) },
    uploadedAssets: row.uploaded_assets ?? [],
    turnCount: row.turn_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    confirmedAt: row.confirmed_at,
    orderId: row.order_id,
  };
}

/** Field-by-field merge: only overwrite a field when the AI actually
 * returned a non-null, non-undefined value THIS turn. An omitted or
 * explicitly-null field means "unchanged," never "clear it" — protects
 * previously-extracted info from being wiped out by one incomplete
 * response (see modules/creative-agent's plan notes / migration comment). */
function mergeStructuredData(
  previous: StructuredProjectData,
  update: Partial<StructuredProjectData>,
): StructuredProjectData {
  const merged: StructuredProjectData = { ...previous };
  // `merged as Record<string, unknown>` directly fails to compile
  // ("neither type sufficiently overlaps") since StructuredProjectData has
  // no index signature — go through `unknown` first, exactly as TS's own
  // error message suggests, since this loop's key/value pairing is
  // correct by construction (both come from the same `keyof` walk) even
  // though the compiler can't prove it generically.
  for (const key of Object.keys(update) as (keyof StructuredProjectData)[]) {
    const value = update[key];
    if (value !== null && value !== undefined) {
      (merged as unknown as Record<string, unknown>)[key] = value;
    }
  }
  return merged;
}

export interface CreativeSessionRepository {
  getOrCreateSession(sessionToken: string): Promise<CreativeAgentSession>;
  appendTurn(
    sessionToken: string,
    params: { userMessage: string; aiResult: Extract<AiTurnResult, { ok: true }> },
  ): Promise<CreativeAgentSession>;
  confirmSession(sessionToken: string): Promise<CreativeAgentSession>;
  /** P5 (13 Agustus 2026) — appends newly-uploaded files to
   * uploaded_assets AND drops a synthetic user-visible message into
   * `messages` (e.g. "📎 Attached: mascot.png") so both the thread UI and
   * the next AI turn's own history naturally show it, without spending a
   * Gemini call just to acknowledge an upload. No turn_count increment —
   * this isn't a conversational turn. */
  attachAssets(sessionToken: string, files: UploadedAsset[]): Promise<CreativeAgentSession>;
  /** P7 (13 Agustus 2026) — called once by submitCreativeAgentOrderAction
   * right after the real `orders` row is created, so a second click
   * (double-submit, back button) is a no-op read instead of a second
   * order. */
  linkOrder(sessionToken: string, orderId: string): Promise<CreativeAgentSession>;
}

export const creativeSessionRepository: CreativeSessionRepository = {
  async getOrCreateSession(sessionToken) {
    const supabase = createServiceRoleClient();

    const { data: existing, error: findError } = await supabase
      .from("creative_agent_sessions")
      .select("*")
      .eq("session_token", sessionToken)
      .maybeSingle();

    if (findError) {
      throw new Error(`Failed to look up creative agent session: ${findError.message}`);
    }
    if (existing) return toSession(existing as SessionRow);

    const { data: created, error: insertError } = await supabase
      .from("creative_agent_sessions")
      .insert({ session_token: sessionToken })
      .select("*")
      .single();

    if (insertError || !created) {
      throw new Error(`Failed to create creative agent session: ${insertError?.message ?? "no row returned"}`);
    }
    return toSession(created as SessionRow);
  },

  async appendTurn(sessionToken, { userMessage, aiResult }) {
    const supabase = createServiceRoleClient();
    const current = await this.getOrCreateSession(sessionToken);

    const now = new Date().toISOString();
    const nextMessages: ChatMessage[] = [
      ...current.messages,
      { role: "user", content: userMessage, at: now },
      { role: "assistant", content: aiResult.reply, at: now },
    ];

    const nextStructuredData = mergeStructuredData(current.structuredData, {
      ...aiResult.understanding,
      missingInformation: aiResult.missingInfo,
    });

    const { data: updated, error } = await supabase
      .from("creative_agent_sessions")
      .update({
        messages: nextMessages,
        structured_data: nextStructuredData,
        turn_count: current.turnCount + 1,
      })
      .eq("session_token", sessionToken)
      .select("*")
      .single();

    if (error || !updated) {
      throw new Error(`Failed to save creative agent turn: ${error?.message ?? "no row returned"}`);
    }
    return toSession(updated as SessionRow);
  },

  async confirmSession(sessionToken) {
    const supabase = createServiceRoleClient();
    const { data: updated, error } = await supabase
      .from("creative_agent_sessions")
      .update({ status: "confirmed", confirmed_at: new Date().toISOString() })
      .eq("session_token", sessionToken)
      .select("*")
      .single();

    if (error || !updated) {
      throw new Error(`Failed to confirm creative agent session: ${error?.message ?? "no row returned"}`);
    }
    return toSession(updated as SessionRow);
  },

  async attachAssets(sessionToken, files) {
    const supabase = createServiceRoleClient();
    const current = await this.getOrCreateSession(sessionToken);

    const nextUploadedAssets = [...current.uploadedAssets, ...files];
    const now = new Date().toISOString();
    const nextMessages: ChatMessage[] = [
      ...current.messages,
      { role: "user", content: `📎 Attached: ${files.map((file) => file.name).join(", ")}`, at: now },
    ];

    const { data: updated, error } = await supabase
      .from("creative_agent_sessions")
      .update({ uploaded_assets: nextUploadedAssets, messages: nextMessages })
      .eq("session_token", sessionToken)
      .select("*")
      .single();

    if (error || !updated) {
      throw new Error(`Failed to save uploaded assets: ${error?.message ?? "no row returned"}`);
    }
    return toSession(updated as SessionRow);
  },

  async linkOrder(sessionToken, orderId) {
    const supabase = createServiceRoleClient();
    const { data: updated, error } = await supabase
      .from("creative_agent_sessions")
      .update({ order_id: orderId })
      .eq("session_token", sessionToken)
      .select("*")
      .single();

    if (error || !updated) {
      throw new Error(`Failed to link creative agent session to order: ${error?.message ?? "no row returned"}`);
    }
    return toSession(updated as SessionRow);
  },
};
