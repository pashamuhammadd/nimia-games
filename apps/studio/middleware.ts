import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Session refresh + route protection, following @supabase/ssr's documented
// middleware pattern. This talks to @supabase/ssr directly (NOT through
// @nimia/db's server.ts) because that package's cookie adapter is shaped
// for next/headers' `cookies()` (Server Components/Actions), while
// middleware gets its cookies from NextRequest/NextResponse instead — two
// different shapes, so keeping this standalone avoids fighting the types.
const PROTECTED_PREFIX = "/dashboard";
const AUTH_PAGES = ["/login", "/register"];

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
  const isProtected = path.startsWith(PROTECTED_PREFIX);
  const isAuthPage = AUTH_PAGES.some((p) => path.startsWith(p));

  if (isProtected && !user) {
    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set("redirectedFrom", path);
    return NextResponse.redirect(redirectUrl);
  }

  if (isAuthPage && user) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    // Run on everything except static assets/images/favicon, so the
    // session cookie stays fresh across the whole app.
    //
    // api/video excluded too (30 Juli 2026, portfolio video-security
    // brief): that route proxies Cloudinary video bytes and gets hit with
    // many range requests per clip (seeking, preload="metadata" probes,
    // chunked playback). Without this exclusion, every one of those
    // requests would also run a full Supabase getUser()/cookie-refresh
    // round trip here for no reason — nothing under /api/video needs auth
    // — adding latency to exactly the thing this brief was trying to keep
    // fast.
    "/((?!_next/static|_next/image|favicon.ico|api/video|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
