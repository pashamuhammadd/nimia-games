import { cookies } from "next/headers";
import { createServerClient } from "@nimia/db";

/** Every protected page in this app (Home, Orders, Partner, Account —
 * everything except Services, which is public-catalog-shaped and will
 * likely drop this guard once it's real in Phase 2) calls this the same
 * way apps/app's own pages call supabase.auth.getUser() directly — this
 * is just a one-line wrapper so the "cookies() -> createServerClient ->
 * getUser()" boilerplate isn't repeated in every page.tsx. Once a real
 * Supabase session cookie exists (established by
 * /api/telegram/session or /api/telegram/link — see those routes' own
 * comments), this app behaves EXACTLY like any other app in the
 * monorepo: normal RLS-backed reads, no Telegram-specific logic needed
 * past this point. */
export async function getCurrentUser() {
  const supabase = createServerClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}
