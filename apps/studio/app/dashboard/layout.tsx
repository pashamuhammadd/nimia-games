import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerClient } from "@nimia/db";
import { Button } from "@nimia/ui";
import { signOutAction } from "../actions";
import { DashboardNav } from "../components/DashboardNav";

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

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-60 shrink-0 border-r border-[var(--nimia-border)] bg-[var(--nimia-surface)] md:flex md:flex-col">
        <Link href="/dashboard" className="flex items-center px-6 py-5">
          {/* eslint-disable-next-line @next/next/no-img-element -- fixed local
              brand asset, see the same note in PublicNavbar.tsx */}
          <img src="/nimia-studio-lockup.svg" alt="Nimia Games Studio" className="h-7 w-auto" />
        </Link>
        <nav className="flex flex-1 flex-col gap-1 px-3">
          <DashboardNav variant="sidebar" />
        </nav>
        <div className="border-t border-[var(--nimia-border)] p-3">
          <form action={signOutAction}>
            <Button type="submit" variant="ghost" size="sm" className="w-full justify-start">
              Log out
            </Button>
          </form>
        </div>
      </aside>

      <div className="flex min-h-screen flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-[var(--nimia-border)] bg-[var(--nimia-surface)] px-4 py-3 md:hidden">
          <Link href="/dashboard" className="flex items-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/nimia-studio-lockup.svg" alt="Nimia Games Studio" className="h-7 w-auto" />
          </Link>
          <form action={signOutAction}>
            <Button type="submit" variant="ghost" size="sm">
              Log out
            </Button>
          </form>
        </header>

        <nav className="flex gap-1 overflow-x-auto border-b border-[var(--nimia-border)] bg-[var(--nimia-surface)] px-3 py-2 md:hidden">
          <DashboardNav variant="mobile" />
        </nav>

        <main className="flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
