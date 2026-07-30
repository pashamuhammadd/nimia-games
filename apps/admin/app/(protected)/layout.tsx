import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerClient } from "@nimia/db";
import { signOutAction } from "../actions";
import { AdminShell } from "../components/dashboard/AdminShell";

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

  const { data: profile } = await supabase
    .from("users")
    .select("full_name, role")
    .eq("id", user.id)
    .single();

  // Second defense-in-depth layer, this time for ROLE rather than just
  // session presence — signInAction already checks this at sign-in time,
  // but an account demoted from admin to client after signing in should be
  // bounced out on its very next request, not just its next login.
  if (!profile || profile.role !== "admin") {
    await supabase.auth.signOut();
    redirect("/login?error=not_admin");
  }

  return (
    <AdminShell
      userName={profile.full_name ?? ""}
      userEmail={user.email ?? ""}
      signOutAction={signOutAction}
    >
      {children}
    </AdminShell>
  );
}
