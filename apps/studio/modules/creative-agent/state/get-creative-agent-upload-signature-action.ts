"use server";

import { cookies } from "next/headers";
import { cloudinary } from "../../../lib/cloudinary";
import { creativeSessionRepository } from "../repository/creative-session.repository";
import { CREATIVE_AGENT_SESSION_COOKIE } from "../constants";

export type CreativeAgentUploadSignatureResult =
  | {
      success: true;
      signature: string;
      timestamp: number;
      apiKey: string;
      cloudName: string;
      folder: string;
    }
  | { success: false; error: string };

// Creative Agent's own version of modules/order/state/get-upload-
// signature-action.ts (13 Agustus 2026, P5 — asset upload). Same signed-
// upload posture (browser POSTs file bytes straight to Cloudinary, the
// API secret never leaves this server, see that file's own comment for
// why) — the one real difference is WHO this is scoped to. The order
// wizard's version requires `supabase.auth.getUser()` because an order
// only ever exists for a signed-in client. Creative Agent chats happen
// anonymously, before any login (brief §3/§6), so there is no user to
// scope by — the httpOnly `creative_agent_session` cookie IS the identity
// here, exactly like every other read/write in this module (see
// packages/db/migrations/0041's header comment on why that cookie is the
// authorization boundary, not RLS).
export async function getCreativeAgentUploadSignatureAction(): Promise<CreativeAgentUploadSignatureResult> {
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    return {
      success: false,
      error: "File uploads aren't available right now. You can still describe it in words, or attach it later.",
    };
  }

  const sessionToken = (await cookies()).get(CREATIVE_AGENT_SESSION_COOKIE)?.value;
  if (!sessionToken) {
    return { success: false, error: "Start the conversation first, then you can attach files." };
  }

  // Defense in depth, not the primary gate (the folder below is already
  // scoped by token, so a cookie with no matching row costs nothing real —
  // just an orphaned Cloudinary folder) — but getOrCreateSession() also
  // means a visitor who deletes/edits their cookie by hand still gets a
  // real, tracked session instead of uploading into a folder nothing will
  // ever read.
  await creativeSessionRepository.getOrCreateSession(sessionToken);

  const timestamp = Math.round(Date.now() / 1000);
  // Scoped per-session, not per-order — same reasoning as the order
  // wizard's per-user folder (see get-upload-signature-action.ts): at
  // upload time there is no order yet, and for Creative Agent there may
  // never be one (P7's Submit Order is optional, later, and requires a
  // login this chat never required). An abandoned chat just leaves its
  // files under this session's folder — acceptable, same as the order
  // wizard's own documented orphaned-file tradeoff.
  const folder = `creative-agent/${sessionToken}`;
  const paramsToSign = { folder, timestamp };
  const signature = cloudinary.utils.api_sign_request(paramsToSign, process.env.CLOUDINARY_API_SECRET);

  return {
    success: true,
    signature,
    timestamp,
    apiKey: process.env.CLOUDINARY_API_KEY,
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    folder,
  };
}
