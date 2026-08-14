import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Session refresh + route protection, following @supabase/ssr's documented
// middleware pattern. This talks to @supabase/ssr directly (NOT through
// @nimia/db's server.ts) because that package's cookie adapter is shaped
// for next/headers' `cookies()` (Server Components/Actions), while
// middleware gets its cookies from NextRequest/NextResponse instead — two
// different shapes, so keeping this standalone avoids fighting the types.
//
// Copied unchanged from apps/studio/middleware.ts (14 Agustus 2026,
// dashboard split — see [[studio_multi_app_split_plan]]): PROTECTED_PREFIX
// + AUTH_PAGES already covers exactly what this app needs — /dashboard/*
// gated, /login + /register redirect away once signed in, everything else
// (/order, /r/[code], /api/discord/*, /api/orders/*) passes through and
// does its own per-route auth check, same as it always did in studio.
const PROTECTED_PREFIX = "/dashboard";
const AUTH_PAGES = ["/login", "/register"];

// Cross-subdomain SSO (14 Agustus 2026, dashboard split): apps/studio
// (nimiastudio.com) sets this app's session cookie during
// signInAction/signUpAction, so this app's cookies must be readable from
// there too — and vice versa, for the homepage's `isAuthenticated` check.
// A cookie set with no explicit Domain is host-only (scoped to exactly the
// host that set it), so without this, a session created here would NOT be
// visible on nimiastudio.com and the marketing navbar would always show
// "signed out". Set NEXT_PUBLIC_COOKIE_DOMAIN=".nimiastudio.com" in this
// app's AND apps/studio's Vercel env vars (production only) to enable —
// left unset in local dev on purpose, since a domain of ".nimiastudio.com"
// is invalid for a localhost cookie and would silently break local sign-in
// entirely. NEVER set this in apps/admin (different domain entirely).
const COOKIE_DOMAIN = process.env.NEXT_PUBLIC_COOKIE_DOMAIN || undefined;

function withCookieDomain(options?: Record<string, unknown>) {
  return COOKIE_DOMAIN ? { ...options, domain: COOKIE_DOMAIN } : options;
}

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
            response.cookies.set(name, value, withCookieDomain(options)),
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
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
