import { NextResponse, type NextRequest } from "next/server";
import crypto from "node:crypto";
import { createServiceRoleClient } from "@nimia/db";
import { runAgentPipeline } from "../../../../lib/ai-agent/orchestrator";
import { listDiscoverySources } from "../../../../lib/ai-agent/discovery/registry";
import { DEFAULT_MIN_OPPORTUNITY_SCORE, DEFAULT_REQUESTED_TARGET } from "../../../../lib/ai-agent/constants";

// AI Prospect Hunter auto-run (added 19 Aug 2026, product request #1: "AI
// Prospect agent bisa auto cari calon klien setiap 3 jam sekali"). This
// route is the ONLY thing an external scheduler calls — everything else
// (discovery, scoring, saving, the partner Discord/Telegram broadcast) is
// the exact same runAgentPipeline the "Find Prospects" dashboard button
// already calls (app/(protected)/ai-prospect-hunter/actions.ts's
// startAgentRunAction) — this route exists ONLY to supply the two things a
// human clicking that button normally supplies: a trigger, and a Supabase
// client. There is no separate "cron pipeline" to keep in sync with the
// dashboard one.
//
// WHY NOT VERCEL'S NATIVE `vercel.json` CRON (spec-adjacent decision, 19
// Aug 2026): Vercel Cron Jobs on the Hobby plan (confirmed with the user —
// still on Hobby, not Pro) can run AT MOST ONCE PER DAY — every schedule
// finer than that (including "every 3 hours") silently gets collapsed to
// a single daily run, or the deploy is rejected, depending on how it's
// configured. Since "every 3 hours" is the explicit spec, this route is
// instead triggered by an EXTERNAL scheduler — Upstash QStash's free tier
// (github.com/upstash/qstash, no code dependency needed here — QStash just
// makes an HTTP POST on schedule, exactly like any other webhook caller) —
// which works identically regardless of Vercel plan tier and needs zero
// `vercel.json` changes. Setup (one-time, in the Upstash console, not in
// this codebase):
//   1. Create a QStash schedule: destination URL
//      `https://admin.nimiagames.com/api/cron/prospect-hunter`
//      (adjust to this app's real deployed domain), cron expression
//      `0 */3 * * *` (every 3 hours), HTTP method POST.
//   2. Under that schedule's Headers, add:
//      `Authorization: Bearer <CRON_SECRET>` — the SAME value as this
//      app's own CRON_SECRET env var (see apps/admin/.env.example).
//      Deliberately NOT using QStash's own request-signing (Upstash-
//      Signature header + their SDK's `Receiver.verify`) to keep this
//      route framework-agnostic — a single shared-secret Bearer token is
//      enough for a low-frequency internal cron trigger, and swapping
//      schedulers later (or moving to native Vercel Cron on a future Pro
//      plan — see the GET handler below) never requires touching this
//      verification logic.
// If/when this project ever upgrades to Vercel Pro, replace the QStash
// schedule with a native `vercel.json`:
//   { "crons": [{ "path": "/api/cron/prospect-hunter", "schedule": "0 */3 * * *" }] }
// Vercel Cron sends `Authorization: Bearer $CRON_SECRET` automatically
// (its own documented convention, matching the same env var name) via
// GET — which is exactly why this route accepts BOTH GET and POST below,
// so that migration is a `vercel.json` add + QStash schedule delete, no
// code change.
export const dynamic = "force-dynamic";

function isAuthorized(request: NextRequest): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false; // Never authorize when the secret isn't even configured.

  const header = request.headers.get("authorization") ?? "";
  const provided = header.startsWith("Bearer ") ? header.slice("Bearer ".length) : "";
  if (!provided) return false;

  const expectedBuffer = Buffer.from(expected, "utf8");
  const providedBuffer = Buffer.from(provided, "utf8");
  if (expectedBuffer.length !== providedBuffer.length) return false;
  return crypto.timingSafeEqual(expectedBuffer, providedBuffer);
}

async function runProspectHunterCron(): Promise<NextResponse> {
  const supabase = createServiceRoleClient();

  // Every registered discovery source id — runAgentPipeline itself already
  // filters this down to whichever are actually configured + non-demo
  // (see orchestrator.ts's own nonDemoConfigured logic), exactly the same
  // way the dashboard's "select all sources" option behaves. Passing all
  // of them here (rather than duplicating that isConfigured() filtering in
  // this route) means a future new discovery source is picked up by the
  // cron automatically the moment it's registered (registry.ts), no edit
  // needed here.
  const sourceIds = listDiscoverySources().map((source) => source.id);

  try {
    const summary = await runAgentPipeline(supabase, {
      categorySlugs: [], // empty = default tier-interleaved sweep, see constants.ts's defaultSweepCategorySlugs()
      requestedTarget: DEFAULT_REQUESTED_TARGET,
      minOpportunityScore: DEFAULT_MIN_OPPORTUNITY_SCORE,
      sourceIds,
      createdBy: null, // No admin user triggered this — see ai_agent_runs.created_by, nullable for exactly this case.
    });

    return NextResponse.json({ ok: summary.status !== "failed", summary });
  } catch (error) {
    console.error("[cron/prospect-hunter] run failed", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Prospect Hunter cron run failed." },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  return runProspectHunterCron();
}

// Accepted alongside POST specifically so a future native Vercel Cron
// (which sends GET, see this file's top comment) works without any code
// change — QStash's default method is POST, which is why POST is the one
// actually wired up in the Upstash console today.
export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  return runProspectHunterCron();
}
