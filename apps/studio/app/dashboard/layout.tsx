import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerClient } from "@nimia/db";
import { signOutAction } from "../actions";
import { DashboardShell } from "../components/dashboard/DashboardShell";

// SEO fix, 10 Agustus 2026 — this noindex directive used to live in the
// ROOT layout (app/layout.tsx) and applied sitewide by accident, which
// noindexed every public marketing page along with it. Moved down here so
// it only covers the internal client portal it was always meant for — see
// app/layout.tsx's matching comment for the full story. Metadata set in a
// nested layout like this fully overrides the parent's `robots` field for
// every route under /dashboard/*, so this is the only place that needs it.
export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default async function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const supabase = createServerClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Defense in depth — middleware.ts already redirects unauthenticated
  // requests away from /dashboard/*, but a Server Component should never
  // assume that ran (e.g. if matcher config ever drifts).
  if (!user) {
    redirect("/login");
  }

  // Just for the topbar's avatar (name/initial + email) — every other page
  // under /dashboard/* still does its own, more specific data fetching.
  // avatar_url (3 Agustus 2026) is read here too so Topbar can show a real
  // photo the moment one exists — see components/dashboard/Avatar.tsx.
  const { data: profile } = await supabase
    .from("users")
    .select("full_name, avatar_url")
    .eq("id", user.id)
    .single();

  return (
    <DashboardShell
      userName={profile?.full_name ?? ""}
      userEmail={user.email ?? ""}
      userAvatarUrl={profile?.avatar_url ?? null}
      signOutAction={signOutAction}
    >
      {children}
    </DashboardShell>
  );
}
