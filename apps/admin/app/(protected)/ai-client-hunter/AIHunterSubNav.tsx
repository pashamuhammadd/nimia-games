"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@nimia/ui";

// Second-level tab strip for the AI Client Hunter section (brief section
// 9's suggested nav: Overview / Leads / Find Clients / Outreach Queue /
// Settings) — this module is the one place in apps/admin that needs a
// sub-nav under a single top-level Sidebar item, so it's colocated here
// rather than generalizing AdminNav.tsx for a pattern nothing else uses
// yet. Same "pill" visual language as OrdersPage's status filters
// (apps/admin/app/(protected)/orders/page.tsx) for consistency.
const TABS = [
  { href: "/ai-client-hunter", label: "Overview" },
  { href: "/ai-client-hunter/leads", label: "Leads" },
  { href: "/ai-client-hunter/find", label: "Find Clients" },
  { href: "/ai-client-hunter/outreach", label: "Outreach Queue" },
  { href: "/ai-client-hunter/settings", label: "Settings" },
];

export function AIHunterSubNav() {
  const pathname = usePathname();

  return (
    <div className="flex flex-wrap gap-2">
      {TABS.map((tab) => {
        const isActive = tab.href === "/ai-client-hunter" ? pathname === tab.href : pathname?.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
              isActive
                ? "bg-[var(--nimia-crimson)]/15 text-white ring-1 ring-inset ring-[var(--nimia-crimson)]/40"
                : "text-white/55 hover:bg-white/[0.06] hover:text-white/90",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
