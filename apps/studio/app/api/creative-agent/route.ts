import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { creativeAgentService } from "@/modules/creative-agent/service/creative-agent.service";
import {
  CREATIVE_AGENT_SESSION_COOKIE,
  CREATIVE_AGENT_SESSION_COOKIE_MAX_AGE_SECONDS,
} from "@/modules/creative-agent/constants";

// POST /api/creative-agent — the ONE entry point into
// modules/creative-agent (homepage redesign, 13 Agustus 2026). Talks to an
// anonymous visitor with no Supabase session at all, so identity here is a
// self-issued, unguessable httpOnly cookie rather than auth.uid() — see
// packages/db/migrations/0041_creative_agent_sessions.sql's header comment
// for why the service-role client + this cookie IS the authorization
// model for this table.
//
// Request shapes:
//   { type: "message", text: string }        — one turn of the conversation.
//   { type: "confirm" }                       — the client clicked "Yes,
//                                                create my brief" on the
//                                                Understanding Preview
//                                                card. Deterministic, no
//                                                AI call.
//   { type: "attach_asset", files: [...] }    — P5 (13 Agustus 2026): files
//                                                already uploaded straight
//                                                to Cloudinary from the
//                                                browser; this just records
//                                                the resulting URLs. No AI
//                                                call, keeps cost at zero.
//   { type: "restore" }                       — P7 (13 Agustus 2026):
//                                                rehydrate an existing
//                                                session's full state,
//                                                mainly so the UI survives
//                                                the full-page /login
//                                                redirect Submit Order can
//                                                trigger (mirrors modules/
//                                                order's own localStorage-
//                                                based restore, just backed
//                                                by the DB instead since
//                                                this session already lives
//                                                there).
type Body =
  | { type: "message"; text: string }
  | { type: "confirm" }
  | { type: "attach_asset"; files: { name: string; url: string }[] }
  | { type: "restore" };

export async function POST(request: NextRequest) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, reason: "Malformed request." }, { status: 400 });
  }

  const existingToken = request.cookies.get(CREATIVE_AGENT_SESSION_COOKIE)?.value;

  // "restore" is the one request type allowed to see a cookie-less
  // visitor — every ordinary homepage load calls this on mount (see
  // CreativeAgentSection's restore effect) to rehydrate an in-progress
  // chat after a full-page navigation. A brand-new visitor with no cookie
  // yet has nothing to restore; answer immediately WITHOUT creating a
  // session row or setting a cookie, otherwise every single page view
  // would silently manufacture an empty, permanent DB row for no reason.
  if (body.type === "restore" && !existingToken) {
    return NextResponse.json({ ok: false, reason: "No session yet." });
  }

  // node:crypto's randomUUID, not the global Web Crypto `crypto` — this
  // Route Handler runs on the Node.js runtime (no `export const runtime =
  // "edge"` here), and the global `crypto` object isn't reliably available
  // on every Node version this app might run on, so import it explicitly.
  const sessionToken = existingToken ?? randomUUID();

  // Only ever set once, EXCEPT the "message" branch below can force an
  // overwrite of its own — see the session-continuation fix (13 Agustus
  // 2026) in creative-agent.service.ts's handleMessage. Default mirrors
  // the original behavior: a brand-new visitor gets their freshly-minted
  // token set; a returning visitor's existing cookie is left untouched.
  let cookieTokenToSet: string | null = existingToken ? null : sessionToken;

  let result: unknown;
  if (body.type === "message") {
    if (typeof body.text !== "string") {
      return NextResponse.json({ ok: false, reason: "Malformed request." }, { status: 400 });
    }
    const turnResult = await creativeAgentService.handleMessage(sessionToken, body.text);
    if (turnResult.ok) {
      // handleMessage mints a brand-new session token whenever the
      // caller's session was no longer 'active' (already confirmed/
      // submitted, or abandoned) — see its own comment. When that
      // happens we MUST overwrite the cookie, even for a returning
      // visitor who already had one, otherwise every message after the
      // first would keep being sent with the old, now-stale token and
      // this fix would silently undo itself after one turn.
      if (turnResult.sessionToken !== sessionToken) {
        cookieTokenToSet = turnResult.sessionToken;
      }
      // Strip the raw token back out before it reaches the browser as
      // readable JSON — the cookie carrying it is httpOnly on purpose,
      // and echoing the same value in the response body would quietly
      // defeat that (see CreativeAgentTurnDto's doc comment).
      const { sessionToken: _sessionToken, ...rest } = turnResult;
      result = rest;
    } else {
      result = turnResult;
    }
  } else if (body.type === "confirm") {
    result = await creativeAgentService.handleConfirm(sessionToken);
  } else if (body.type === "attach_asset") {
    if (!Array.isArray(body.files) || body.files.some((file) => typeof file?.name !== "string" || typeof file?.url !== "string")) {
      return NextResponse.json({ ok: false, reason: "Malformed request." }, { status: 400 });
    }
    result = await creativeAgentService.handleAttachAssets(sessionToken, body.files);
  } else if (body.type === "restore") {
    result = await creativeAgentService.handleRestore(sessionToken);
  } else {
    return NextResponse.json({ ok: false, reason: "Malformed request." }, { status: 400 });
  }

  const response = NextResponse.json(result);

  if (cookieTokenToSet) {
    response.cookies.set(CREATIVE_AGENT_SESSION_COOKIE, cookieTokenToSet, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: CREATIVE_AGENT_SESSION_COOKIE_MAX_AGE_SECONDS,
    });
  }

  return response;
}
