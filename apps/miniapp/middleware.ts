import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Session refresh only — no route-based redirect logic like apps/app's
// own middleware.ts, because this app has no separate /login page to
// redirect to: every protected page renders <TelegramLinkGate /> inline
// when getCurrentUser() finds no session (see app/lib/currentUser.ts),
// rather than bouncing to a route. What this file IS still responsible
// for is the same thing apps/app/middleware.ts's own top comment
// explains: Server Components can't write cookies at all, so without
// this, a session's access token would never get refreshed and would
// eventually just expire mid-session. Talks to @supabase/ssr directly
// (not through @nimia/db's server.ts) for the same reason apps/app's
// middleware does — middleware's cookie shape (NextRequest/NextResponse)
// doesn't match next/headers' cookies() shape that file expects.
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (
          cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[],
        ) => {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  // IMPORTANT: do not add logic between createServerClient and this call
  // — getUser() is what actually triggers the token refresh via setAll
  // above (same load-bearing ordering apps/app's middleware documents).
  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: [
    // Same static-asset exclusion as apps/app's middleware, PLUS
    // /api/telegram/* — the webhook route has no user session at all
    // (Telegram calls it directly), and the session/link routes create
    // the session THEMSELVES inside the route handler; running this
    // refresh pass first would just be wasted work on every request,
    // never useful, for all three.
    "/((?!_next/static|_next/image|favicon.ico|api/telegram|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
