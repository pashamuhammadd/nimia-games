import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@nimia/db";
import { verifyTelegramInitData } from "@nimia/telegram";

// POST /api/telegram/link — the FIRST-TIME linking flow
// (TelegramLinkGate.tsx's login form). Deliberately a REAL password
// login (supabase.auth.signInWithPassword), not a custom mechanism —
// reusing Supabase's own password verification (rate limiting, hashing,
// etc. all handled by Supabase itself) is safer than reinventing any
// part of it here. See docs/TELEGRAM.md §7 for why v1 only LINKS to an
// existing Nimia account rather than offering a Telegram-only signup
// path (same posture as Discord's own account linking,
// packages/discord/src/oauth.ts — Discord was never a way to CREATE a
// Nimia account either, only to link an existing one).
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const initData: string | undefined = body?.initData;
  const email: string | undefined = body?.email;
  const password: string | undefined = body?.password;

  if (!initData || !email || !password) {
    return NextResponse.json({ error: "Missing initData, email, or password" }, { status: 400 });
  }

  const verified = verifyTelegramInitData(initData);
  if (!verified) {
    return NextResponse.json({ error: "Could not verify Telegram identity" }, { status: 401 });
  }

  const supabase = createServerClient(await cookies());

  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
  if (signInError) {
    return NextResponse.json({ error: "Incorrect email or password." }, { status: 401 });
  }

  // connect_telegram_account (migration 0054) runs SECURITY DEFINER but
  // only ever touches `where user_id = auth.uid()` — auth.uid() here is
  // whichever account signInWithPassword just authenticated, so this can
  // never link a Telegram account to someone else's Nimia account no
  // matter what the client claims.
  const { error: rpcError } = await supabase.rpc("connect_telegram_account", {
    p_telegram_user_id: verified.id,
    p_telegram_username: verified.username,
    p_telegram_photo_url: verified.photoUrl,
  });
  if (rpcError) {
    console.error("[telegram/link] connect_telegram_account failed", rpcError);
    return NextResponse.json(
      { error: "Signed in, but couldn't link your Telegram account. Please try again." },
      { status: 500 },
    );
  }

  return NextResponse.json({ linked: true });
}
