import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerClient } from "@nimia/db";
import { Button } from "@nimia/ui";
import { signOutAction } from "../actions";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Ringkasan" },
  { href: "/dashboard/orders", label: "Pesanan" },
  { href: "/dashboard/projects", label: "Proyek" },
  { href: "/dashboard/invoices", label: "Invoice" },
  { href: "/dashboard/messages", label: "Pesan" },
  { href: "/dashboard/profile", label: "Profil" },
];

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
        <div className="px-6 py-5">
          <span className="text-lg font-black tracking-tight">Nimia Studio</span>
        </div>
        <nav className="flex flex-1 flex-col gap-1 px-3">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md px-3 py-2 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--nimia-surface-hover)]"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-[var(--nimia-border)] p-3">
          <form action={signOutAction}>
            <Button type="submit" variant="ghost" size="sm" className="w-full justify-start">
              Keluar
            </Button>
          </form>
        </div>
      </aside>

      <div className="flex min-h-screen flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-[var(--nimia-border)] bg-[var(--nimia-surface)] px-4 py-3 md:hidden">
          <span className="text-base font-black">Nimia Studio</span>
          <form action={signOutAction}>
            <Button type="submit" variant="ghost" size="sm">
              Keluar
            </Button>
          </form>
        </header>

        <nav className="flex gap-1 overflow-x-auto border-b border-[var(--nimia-border)] bg-[var(--nimia-surface)] px-3 py-2 md:hidden">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="shrink-0 rounded-md px-3 py-1.5 text-sm font-medium hover:bg-[var(--nimia-surface-hover)]"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <main className="flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
