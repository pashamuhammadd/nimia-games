import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@nimia/db";
import { getDiscordOAuthUrl } from "@nimia/discord";
import {
  DISCORD_OAUTH_STATE_COOKIE,
  DISCORD_OAUTH_STATE_MAX_AGE_SECONDS,
  getDiscordRedirectUri,
} from "../../../lib/discordRedirect";

// GET /api/discord/connect — the Profile page's "Connect Discord" button
// links straight here rather than building the Discord authorize URL
// client-side, so DISCORD_CLIENT_SECRET-adjacent config (well, just
// DISCORD_CLIENT_ID here, but same principle) and the CSRF state cookie
// stay entirely server-side. Route Handler, not a Server Action, because
// this needs to be a plain link (`<a href="/api/discord/connect">`) the
// browser navigates to directly — Discord's own consent screen is the
// next page the user sees, there's no client-side JS step in between.
export async function GET(request: NextRequest) {
  const supabase = createServerClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    // Same redirectedFrom pattern as /order's Submit button (see
    // app/actions.ts#signInAction) — once signed in, the visitor lands
    // right back here and the flow continues from the top, now
    // authenticated.
    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set("redirectedFrom", "/api/discord/connect");
    return NextResponse.redirect(redirectUrl);
  }

  const state = crypto.randomUUID();
  const redirectUri = getDiscordRedirectUri(request.url);
  const response = NextResponse.redirect(getDiscordOAuthUrl(state, redirectUri));

  // No explicit `secure` flag — same convention as
  // app/r/[code]/route.ts's referral cookie, so this still works over
  // plain http:// in local dev; Vercel production traffic is https
  // regardless, so nothing is lost there. `httpOnly` IS set (unlike the
  // referral cookie) since this one's only job is a CSRF check the
  // callback route itself compares — no client-side JS should ever read
  // or write it.
  response.cookies.set(DISCORD_OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: DISCORD_OAUTH_STATE_MAX_AGE_SECONDS,
    path: "/api/discord",
  });

  return response;
}
