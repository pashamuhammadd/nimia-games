import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerClient } from "@nimia/db";
import { signOutAction } from "../actions";
import { AdminShell } from "../components/dashboard/AdminShell";
import { isAdminTierRole } from "../lib/roles";
import { getNotificationsAction } from "./notifications/actions";

export default async function ProtectedLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const supabase = createServerClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Defense in depth — middleware.ts already redirects unauthenticated
  // requests, but a Server Component should never assume that ran.
  if (!user) {
    redirect("/login");
  }

  const [{ data: profile }, notifications] = await Promise.all([
    supabase.from("users").select("full_name, role").eq("id", user.id).single(),
    getNotificationsAction(),
  ]);

  // Second defense-in-depth layer, this time for ROLE rather than just
  // session presence — signInAction already checks this at sign-in time,
  // but an account demoted after signing in should be bounced out on its
  // very next request, not just its next login. Checks the shared
  // ADMIN_TIER_ROLES set (admin/staff/founder) added in migration 0011 —
  // NOT just 'admin' — so staff and founder accounts can actually get in.
  if (!isAdminTierRole(profile?.role)) {
    await supabase.auth.signOut();
    redirect("/login?error=not_admin");
  }

  return (
    <AdminShell
      userName={profile.full_name ?? ""}
      userEmail={user.email ?? ""}
      role={profile.role}
      signOutAction={signOutAction}
      initialNotifications={notifications.notifications}
      initialUnreadCount={notifications.unreadCount}
    >
      {children}
    </AdminShell>
  );
}
