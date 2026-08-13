import { randomUUID } from "node:crypto";
import { getAiProvider } from "../provider";
import { creativeSessionRepository } from "../repository/creative-session.repository";
import type { ChatMessage, CreativeAgentSessionStatus, StructuredProjectData, UploadedAsset } from "../types";

// Safety caps (13 Agustus 2026) — protect the Gemini free-tier quota from a
// single runaway or abusive session. Deliberately simple (no per-IP
// infra, no queueing) per the product brief's "jangan overbuild" guidance;
// revisit if abuse actually shows up in practice.
const MAX_TURNS = 40;
const MAX_MESSAGE_LENGTH = 2000;

export type CreativeAgentTurnDto =
  | {
      ok: true;
      /** The session this turn actually landed in — almost always the same
       * token the caller passed in, EXCEPT when that session was already
       * closed (see the "already confirmed" check in handleMessage below),
       * in which case this is a freshly-minted one. app/api/creative-agent/
       * route.ts reads this to decide whether to re-issue the session
       * cookie; it's deliberately stripped back out before the JSON
       * response reaches the browser (the cookie itself is httpOnly on
       * purpose — echoing the raw token in a readable response body would
       * quietly undo that). */
      sessionToken: string;
      reply: string;
      understanding: StructuredProjectData;
      missingInfo: string[];
      readyToConfirm: boolean;
      quickReplies?: string[];
    }
  | { ok: false; reason: string };

export type CreativeAgentConfirmDto =
  | { ok: true; understanding: StructuredProjectData }
  | { ok: false; reason: string };

export type CreativeAgentAttachAssetsDto =
  | { ok: true; uploadedAssets: UploadedAsset[] }
  | { ok: false; reason: string };

/** Full session snapshot for rehydrating the client after a page reload —
 * most importantly, the full-page navigation P7's login redirect causes
 * (13 Agustus 2026). Mirrors modules/order/state/use-order-wizard.ts's own
 * localStorage-based restore, but reads from the DB via the session cookie
 * instead: this module never needed localStorage since the cookie + DB row
 * already survive a navigation on their own. */
export type CreativeAgentRestoreDto =
  | {
      ok: true;
      status: CreativeAgentSessionStatus;
      messages: ChatMessage[];
      structuredData: StructuredProjectData;
      uploadedAssets: UploadedAsset[];
      orderId: string | null;
    }
  | { ok: false; reason: string };

export const creativeAgentService = {
  async handleMessage(sessionToken: string, rawMessage: string): Promise<CreativeAgentTurnDto> {
    const message = rawMessage.trim();
    if (!message) {
      return { ok: false, reason: "Type a little about what you have in mind first." };
    }
    if (message.length > MAX_MESSAGE_LENGTH) {
      return { ok: false, reason: `That's a lot to take in at once — could you shorten it to under ${MAX_MESSAGE_LENGTH} characters?` };
    }

    let session = await creativeSessionRepository.getOrCreateSession(sessionToken);

    // Session-continuation bug fix (13 Agustus 2026) — the session cookie
    // lives for 30 days and is reused verbatim by the homepage hero
    // (CreativeAgentSection.tsx) for every new message, with no awareness
    // of whether the session it points to is still "open." Without this
    // check, typing a brand-new, unrelated idea right after submitting an
    // order (or after abandoning a confirmed-but-unsubmitted brief) would
    // silently continue the OLD conversation's history/structuredData —
    // the AI would then reply about the previous project instead of
    // starting fresh. A session is only ever safe to keep appending to
    // while it's 'active'; 'confirmed' (already turned into an order, or
    // waiting to be) and 'abandoned' both mean "this thread is done," so
    // any further message mints a brand-new session instead of reopening
    // it. The caller's original sessionToken is left untouched in the DB
    // (still resolvable for its own history) — we just stop writing to it.
    let effectiveToken = sessionToken;
    if (session.status !== "active") {
      effectiveToken = randomUUID();
      session = await creativeSessionRepository.getOrCreateSession(effectiveToken);
    }

    if (session.turnCount >= MAX_TURNS) {
      return {
        ok: false,
        reason:
          "We've covered a lot of ground in this chat! Let's continue this with the Nimia team directly — start a project from here whenever you're ready.",
      };
    }

    const provider = getAiProvider();
    const result = await provider.understand({
      history: session.messages,
      structuredData: session.structuredData,
      uploadedAssets: session.uploadedAssets,
      latestMessage: message,
    });

    if (!result.ok) {
      return { ok: false, reason: result.reason };
    }

    const updatedSession = await creativeSessionRepository.appendTurn(effectiveToken, {
      userMessage: message,
      aiResult: result,
    });

    return {
      ok: true,
      sessionToken: effectiveToken,
      reply: result.reply,
      understanding: updatedSession.structuredData,
      missingInfo: result.missingInfo,
      readyToConfirm: result.readyToConfirm,
      quickReplies: result.quickReplies,
    };
  },

  async handleConfirm(sessionToken: string): Promise<CreativeAgentConfirmDto> {
    try {
      const session = await creativeSessionRepository.confirmSession(sessionToken);
      return { ok: true, understanding: session.structuredData };
    } catch (error) {
      console.error("[creative-agent] Failed to confirm session", error);
      return { ok: false, reason: "Something went wrong saving your project. Please try again." };
    }
  },

  async handleAttachAssets(sessionToken: string, files: UploadedAsset[]): Promise<CreativeAgentAttachAssetsDto> {
    if (files.length === 0) {
      return { ok: false, reason: "No files to attach." };
    }
    try {
      const session = await creativeSessionRepository.attachAssets(sessionToken, files);
      return { ok: true, uploadedAssets: session.uploadedAssets };
    } catch (error) {
      console.error("[creative-agent] Failed to attach assets", error);
      return { ok: false, reason: "Couldn't save your attachment. Please try again." };
    }
  },

  async handleRestore(sessionToken: string): Promise<CreativeAgentRestoreDto> {
    try {
      const session = await creativeSessionRepository.getOrCreateSession(sessionToken);
      return {
        ok: true,
        status: session.status,
        messages: session.messages,
        structuredData: session.structuredData,
        uploadedAssets: session.uploadedAssets,
        orderId: session.orderId,
      };
    } catch (error) {
      console.error("[creative-agent] Failed to restore session", error);
      return { ok: false, reason: "Couldn't load your conversation. Please try again." };
    }
  },
};
