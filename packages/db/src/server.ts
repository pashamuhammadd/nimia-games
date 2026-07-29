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
              cookieStore.set(name, value, options),
            );
          } catch {
            // set() throws when called from a Server Component — Next.js
            // doesn't allow writing cookies there. Safe to ignore as long
            // as middleware.ts also refreshes the session on every request
            // (it does — see apps/studio/middleware.ts).
          }
        },
      },
    },
  );
}
