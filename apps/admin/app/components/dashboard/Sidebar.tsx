import Link from "next/link";
import { AdminNav } from "../AdminNav";

// Desktop/tablet sidebar — same responsive pattern as
// apps/studio/app/components/dashboard/Sidebar.tsx (full width + labels at
// lg+, icon-only "rail" at md-lg, hidden below md — MobileNavDrawer.tsx
// covers that breakpoint). Rendered as a plain Server Component; active-item
// highlighting lives in AdminNav, the only client piece here.
export function Sidebar({ role }: { role: string }) {
  return (
    <aside className="sticky top-0 hidden h-screen shrink-0 flex-col border-r border-white/[0.07] bg-[#0a0508]/95 md:flex md:w-[84px] lg:w-64">
      <Link
        href="/"
        className="flex h-16 shrink-0 items-center gap-2.5 border-b border-white/[0.07] px-5 lg:px-6"
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- fixed
            local brand asset (repo root logo-bg-black.png, copied into this
            app's public/), same mark used across the monorepo. */}
        <img src="/logo-bg-black.png" alt="Nimia Games" className="h-8 w-8 shrink-0 rounded-md" />
        <span className="nimia-font-display hidden truncate text-base font-bold tracking-wide text-white lg:inline">
          Nimia <span className="nimia-gradient-text">Admin</span>
        </span>
      </Link>

      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-5 lg:px-4">
        <span className="hidden px-3.5 pb-2 text-[11px] font-semibold uppercase tracking-wider text-white/30 lg:block">
          Menu
        </span>
        <div className="hidden flex-col gap-1 lg:flex">
          <AdminNav variant="sidebar" role={role} />
        </div>
        <div className="flex flex-col gap-1 lg:hidden">
          <AdminNav variant="rail" role={role} />
        </div>
      </nav>
    </aside>
  );
}
