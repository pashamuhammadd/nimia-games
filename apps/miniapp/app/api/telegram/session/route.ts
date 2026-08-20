import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient, createServiceRoleClient } from "@nimia/db";
import { verifyTelegramInitData } from "@nimia/telegram";

// POST /api/telegram/session — called by TelegramLinkGate.tsx on every
// cold open with `Telegram.WebApp.initData`. Establishes (or confirms) a
// real Supabase session for the Telegram user launching the Mini App,
// WITHOUT ever asking for a password again if this Telegram account is
// already linked (connect_telegram_account, migration 0054) — see
// docs/TELEGRAM.md §7 for the full design rationale.
//
// Two outcomes:
//   - Not linked yet -> { linked: false }. TelegramLinkGate then shows a
//     normal login form, which posts to /api/telegram/link instead (a
//     REAL password login — see that route's own comment for why this
//     route deliberately does NOT invent a passwordless signup path).
//   - Already linked -> mints a real Supabase session via Supabase's own
//     admin "generate a magic link, then redeem it server-side"
//     mechanism (auth.admin.generateLink + auth.verifyOtp), using the
//     initData-VERIFIED Telegram identity (never client-supplied) to
//     look up which Nimia account it's linked to. This is NOT a custom
//     auth scheme — the session this produces is a completely ordinary
//     Supabase Auth session (normal RLS applies exactly like any other
//     Nimia app from this point on), it's just established without the
//     user re-typing a password on every Mini App open, which is the
//     entire point of "Continue with Telegram" being convenient at all.
//
// KNOWN GAP (flagged honestly rather than silently assumed correct —
// this line could not be exercised against a real Supabase project from
// this sandbox): the exact `verifyOtp` parameter shape
// (`type: "magiclink"` vs `"email"`) has shifted across @supabase/
// supabase-js v2 minor versions in their own docs/examples. Verify this
// against the version actually installed (`npm ls @supabase/supabase-js`)
// the first time this route is tested end-to-end — see this app's
// README "Phase 0 testing checklist".
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const initData: string | undefined = body?.initData;
  if (!initData) {
    return NextResponse.json({ error: "Missing initData" }, { status: 400 });
  }

  const verified = verifyTelegramInitData(initData);
  if (!verified) {
    return NextResponse.json({ error: "Could not verify Telegram identity" }, { status: 401 });
  }

  const admin = createServiceRoleClient();

  // Service-role client, not RLS — there is no website session yet at
  // this point (same shape as apps/app's Discord interactions route
  // looking up a client by discord_user_id before any auth.uid() exists
  // — see packages/db/src/service.ts's own comment on why that's the
  // right call here specifically, not a shortcut).
  const { data: client } = await admin
    .from("clients")
    .select("user_id")
    .eq("telegram_user_id", verified.id)
    .maybeSingle();

  if (!client) {
    return NextResponse.json({ linked: false, firstName: verified.firstName });
  }

  const { data: authUser } = await admin.auth.admin.getUserById(client.user_id);
  const email = authUser.user?.email;
  if (!email) {
    // Shouldn't happen (every Nimia account has an email — password auth
    // requires one) but fail closed to the login form rather than throw
    // if it somehow does.
    return NextResponse.json({ linked: false, firstName: verified.firstName });
  }

  const { data: link, error: linkError } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
  });
  if (linkError || !link?.properties?.hashed_token) {
    console.error("[telegram/session] Failed to generate magic link", linkError);
    return NextResponse.json({ error: "Could not start session" }, { status: 500 });
  }

  // Redeeming the token via the COOKIE-AWARE client (anon key, not
  // service-role) is what actually sets the sb-* session cookies on this
  // response — the same createServerClient(@nimia/db) every other app in
  // this monorepo already uses, so every page/route after this one just
  // works with the normal RLS-backed pattern (see app/lib/currentUser.ts)
  // — no Telegram-specific handling needed anywhere else in this app.
  const supabase = createServerClient(await cookies());
  const { error: verifyError } = await supabase.auth.verifyOtp({
    type: "magiclink",
    token_hash: link.properties.hashed_token,
  });
  if (verifyError) {
    console.error("[telegram/session] Failed to redeem session token", verifyError);
    return NextResponse.json({ error: "Could not start session" }, { status: 500 });
  }

  return NextResponse.json({ linked: true });
}
