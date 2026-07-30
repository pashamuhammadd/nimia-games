import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerClient } from "@nimia/db";
import { signOutAction } from "../actions";
import { DashboardShell } from "../components/dashboard/DashboardShell";

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
  const { data: profile } = await supabase
    .from("users")
    .select("full_name")
    .eq("id", user.id)
    .single();

  return (
    <DashboardShell
      userName={profile?.full_name ?? ""}
      userEmail={user.email ?? ""}
      signOutAction={signOutAction}
    >
      {children}
    </DashboardShell>
  );
}
