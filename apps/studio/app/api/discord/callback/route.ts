import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@nimia/db";
import { addGuildMember, assignGuildRole, exchangeDiscordCode, getDiscordRoleId, getDiscordUser } from "@nimia/discord";
import { DISCORD_OAUTH_STATE_COOKIE, getDiscordRedirectUri } from "../../../lib/discordRedirect";

const PROFILE_URL = "/dashboard/profile";

function redirectToProfile(request: NextRequest, status: "connected" | "error", reason?: string) {
  const url = new URL(PROFILE_URL, request.url);
  url.searchParams.set("discord", status);
  if (reason) url.searchParams.set("reason", reason);
  const response = NextResponse.redirect(url);
  // Always clear the state cookie once the flow ends (success OR
  // failure) — it's single-use, leaving it around past this point is
  // pointless and just makes a stale cookie a little longer-lived.
  response.cookies.delete(DISCORD_OAUTH_STATE_COOKIE);
  return response;
}

// GET /api/discord/callback — Discord redirects here after the client
// approves (or denies) the consent screen /api/discord/connect sent them
// to. Reads Profile page's ?discord=connected|error via the redirect
// below; RegisterForm/review-section's Terms links are a different,
// unrelated flow — nothing here touches those.
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  // Client hit "Cancel" on Discord's consent screen — not an application
  // error, just send them back with nothing changed.
  if (searchParams.get("error")) {
    return redirectToProfile(request, "error", "denied");
  }

  const code = searchParams.get("code");
  const returnedState = searchParams.get("state");
  const cookieStore = await cookies();
  const expectedState = cookieStore.get(DISCORD_OAUTH_STATE_COOKIE)?.value;

  // CSRF check — see discordRedirect.ts's own comment on why this cookie
  // exists. A missing/mismatched state means this request didn't
  // originate from /api/discord/connect's own redirect (or the cookie
  // expired — 10 minutes, see DISCORD_OAUTH_STATE_MAX_AGE_SECONDS), so
  // refuse rather than trust the `code` at all.
  if (!code || !returnedState || !expectedState || returnedState !== expectedState) {
    return redirectToProfile(request, "error", "invalid_state");
  }

  const supabase = createServerClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    // Session expired mid-flow (rare — the consent screen round trip is
    // usually seconds, not long enough for a session to lapse) — send
    // back to login rather than crash on the RPC call below, which needs
    // an authenticated auth.uid().
    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set("redirectedFrom", "/dashboard/profile");
    return NextResponse.redirect(redirectUrl);
  }

  try {
    const redirectUri = getDiscordRedirectUri(request.url);
    const token = await exchangeDiscordCode(code, redirectUri);
    const discordUser = await getDiscordUser(token.access_token);

    const { error: rpcError } = await supabase.rpc("connect_discord_account", {
      p_discord_user_id: discordUser.id,
      p_discord_username: discordUser.username,
      p_discord_avatar_url: discordUser.avatarUrl,
    });
    if (rpcError) {
      throw new Error(rpcError.message);
    }

    // Best-effort, same non-throwing convention as lib/email.tsx for side
    // effects that shouldn't fail the primary action if they break — the
    // account link itself (the RPC call above) is already safely saved by
    // this point. addGuildMember (added 10 Agustus 2026) actually puts the
    // client INTO the server using this OAuth token's new "guilds.join"
    // scope (oauth.ts) — it has to run BEFORE assignGuildRole, since a
    // role-assign against someone who isn't a guild member yet 404s.
    // roleIds here only takes effect on the user's very first join, so
    // assignGuildRole still runs unconditionally right after to cover
    // reconnects/already-members, same as before this fix.
    try {
      await addGuildMember(discordUser.id, token.access_token, [getDiscordRoleId("client")]);
    } catch (joinError) {
      console.error("[discord/callback] Add guild member failed:", joinError);
    }

    try {
      await assignGuildRole(discordUser.id, getDiscordRoleId("client"));
    } catch (roleError) {
      console.error("[discord/callback] Role assign failed:", roleError);
    }

    return redirectToProfile(request, "connected");
  } catch (error) {
    console.error("[discord/callback] Connect failed:", error);
    return redirectToProfile(request, "error", "exchange_failed");
  }
}
