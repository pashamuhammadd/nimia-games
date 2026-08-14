import Link from "next/link";
import { DashboardNav } from "../DashboardNav";

// Desktop/tablet sidebar (30 Juli 2026, Client Dashboard redesign).
// Responsive per the brief: full width + labels at lg+, icon-only "rail" at
// md-lg (tablet), hidden entirely below md — MobileNavDrawer.tsx covers
// that breakpoint instead. Rendered as a plain Server Component (no state),
// active-item highlighting lives in DashboardNav which is the only client
// piece here.
export function Sidebar() {
  return (
    <aside className="sticky top-0 hidden h-screen shrink-0 flex-col border-r border-white/[0.07] bg-[#0a0508]/95 md:flex md:w-[84px] lg:w-64">
      <Link
        href="/dashboard"
        className="flex h-16 shrink-0 items-center gap-2.5 border-b border-white/[0.07] px-5 lg:px-6"
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- fixed local
            brand asset, same lockup already proven to render on this exact
            dark background in PublicNavbar.tsx */}
        <img
          src="/nimia-studio-lockup.svg"
          alt="Nimia Games Studio"
          className="hidden h-7 w-auto lg:block"
        />
        {/* Tablet rail (md-lg): the full lockup is a wide horizontal
            wordmark, too wide to crop into a square icon without cutting
            off the mark itself — there's no separate square icon-only
            brand asset yet, so favicon.ico (already square, already a
            brand asset) stands in here instead. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/favicon.ico" alt="Nimia Games Studio" className="h-7 w-7 rounded-md lg:hidden" />
      </Link>

      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-5 lg:px-4">
        <span className="hidden px-3.5 pb-2 text-[11px] font-semibold uppercase tracking-wider text-white/30 lg:block">
          Menu
        </span>
        <div className="hidden flex-col gap-1 lg:flex">
          <DashboardNav variant="sidebar" />
        </div>
        <div className="flex flex-col gap-1 lg:hidden">
          <DashboardNav variant="rail" />
        </div>
      </nav>
    </aside>
  );
}
