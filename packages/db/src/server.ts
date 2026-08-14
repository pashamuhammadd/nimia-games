import { createServerClient as createSupabaseServerClient } from "@supabase/ssr";
import type { Database } from "./types";

// Matches what Next.js's `cookies()` (next/headers) actually returns in
// Server Components / Server Actions / Route Handlers:
//   const cookieStore = await cookies();
//   const supabase = createServerClient(cookieStore);
//
// IMPORTANT (fixed in Tahap 4): next/headers's cookie store only exposes
// get/getAll/set/delete — there is no `setAll`. @supabase/ssr's
// createServerClient wants a `{ getAll, setAll }` cookies adapter, so this
// factory bridges the two by looping `set()` per cookie inside setAll,
// exactly like the pattern documented at supabase.com/docs/guides/auth/server-side/nextjs.
// (An earlier draft of this file called `cookieStore.setAll(cookies)`
// directly, which doesn't exist on Next's cookie store — it would have
// silently no-op'd inside the try/catch below, so signed-in sessions would
// never actually persist a cookie. Caught before npm install/build.)
type CookieStore = {
  getAll: () => { name: string; value: string }[];
  set: (name: string, value: string, options?: Record<string, unknown>) => void;
};

// Cross-subdomain SSO (14 Agustus 2026, dashboard split — see project
// memory's studio_multi_app_split_plan). A cookie set with no explicit
// Domain is host-only: scoped to exactly the host that set it. Now that
// the client session can be created on either nimiastudio.com (public
// homepage's isAuthenticated check) or app.nimiastudio.com
// (login/dashboard), both need to read the SAME cookie — so whichever one
// sets it must set it with Domain=".nimiastudio.com" instead.
//
// Gated behind an env var, not hardcoded, for two reasons: (1) this
// package is shared by apps/studio, apps/app, AND apps/admin — admin is
// still on admin.nimiagames.com, a completely different domain, and a
// browser silently REJECTS a Set-Cookie whose Domain attribute doesn't
// match the current host, which would break admin login outright if this
// were ever hardcoded to ".nimiastudio.com" here. (2) local dev runs on
// localhost, where a Domain of ".nimiastudio.com" is also invalid and
// would break local sign-in. Only set NEXT_PUBLIC_COOKIE_DOMAIN in
// apps/studio's and apps/app's PRODUCTION Vercel env vars — leave it unset
// everywhere else (including local .env.local), so the default (today's
// host-only behavior) is what you get unless you explicitly opt in.
const COOKIE_DOMAIN = process.env.NEXT_PUBLIC_COOKIE_DOMAIN || undefined;

function withCookieDomain(options?: Record<string, unknown>) {
  return COOKIE_DOMAIN ? { ...options, domain: COOKIE_DOMAIN } : options;
}

/**
 * Supabase client for Server Components, Server Actions, and Route
 * Handlers. The caller supplies Next.js's cookie store (from
 * `next/headers`'s `cookies()`) so this package stays decoupled from a
 * specific Next.js version's cookies API:
 *
 *   import { cookies } from "next/headers";
 *   import { createServerClient } from "@nimia/db";
 *
 *   const supabase = createServerClient(await cookies());
 */
export function createServerClient(cookieStore: CookieStore) {
  return createSupabaseServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (
          cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[],
        ) => {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, withCookieDomain(options)),
            );
          } catch {
            // set() throws when called from a Server Component — Next.js
            // doesn't allow writing cookies there. Safe to ignore as long
            // as middleware.ts also refreshes the session on every request
            // (it does — see apps/studio/middleware.ts and
            // apps/app/middleware.ts, which apply the same
            // NEXT_PUBLIC_COOKIE_DOMAIN logic themselves since middleware
            // talks to @supabase/ssr directly, not through this file).
          }
        },
      },
    },
  );
}
