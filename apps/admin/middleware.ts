import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Session refresh + route protection, same @supabase/ssr middleware pattern
// as apps/studio/middleware.ts. Inverted from studio's logic on purpose:
// studio is mostly public (marketing pages) with only /dashboard/* gated,
// while hub.nimiastudio.com (formerly admin.nimiagames.com — migrated 14
// Agustus 2026, see studio_multi_app_split_plan.md) has NO public surface
// at all — everything
// except /login requires a signed-in session. The deeper "is this account
// actually staff?" check (role === 'admin') happens in
// app/(protected)/layout.tsx instead of here, same division of
// responsibility as studio: middleware only proves "a session exists".
//
// "/api/cron" added 20 Agustus 2026 (AI Prospect Hunter auto-run bug fix):
// app/api/cron/prospect-hunter/route.ts is called directly by Upstash
// QStash over plain HTTP — there is no browser, no Supabase session, no
// cookie at all in that request. Before this fix, this matcher's default
// (redirect anything without a `user` to /login) caught that request too,
// so QStash's POST got silently 307-redirected to /login instead of ever
// reaching the route handler — no error, no Discord/Telegram message, no
// obvious sign anything was wrong until checking Vercel's own request
// logs. This path is NOT actually public in the "anyone can call it and
// see something" sense — the route itself still requires a valid
// `Authorization: Bearer <CRON_SECRET>` header (see that file's own
// isAuthorized check, returns 401 JSON on failure) — it just authenticates
// a different way than every other route here, one middleware can't
// evaluate (it would need the route's own CRON_SECRET check, which lives
// past this point in the request lifecycle). Any future /api/cron/* route
// gets the same treatment automatically via startsWith.
const PUBLIC_PATHS = ["/login", "/api/cron"];

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
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // IMPORTANT: do not add logic between createServerClient and this call —
  // getUser() is what actually triggers the token refresh via setAll above.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isPublic = PUBLIC_PATHS.some((p) => path.startsWith(p));

  if (!isPublic && !user) {
    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set("redirectedFrom", path);
    return NextResponse.redirect(redirectUrl);
  }

  if (path.startsWith("/login") && user) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
