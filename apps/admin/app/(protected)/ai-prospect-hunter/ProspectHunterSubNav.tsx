"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@nimia/ui";

// Second-level tab strip for the AI Prospect Hunter section (spec section
// 15's nav: Overview / Projects / Find Prospects / Outreach / Agent Runs
// / Settings). "Opportunities" and "Qualified Prospects" from the spec's
// literal nav list are deliberately folded into Projects' own status
// filter pills (same "All / Project / Opportunity / Qualified / ..."
// pattern the retired Leads page used for qualification_status) rather
// than three near-duplicate list pages showing the same underlying table
// — see ProjectsList's filter pills. Same "pill" visual language as
// OrdersPage's status filters for consistency.
const TABS = [
  { href: "/ai-prospect-hunter", label: "Overview" },
  { href: "/ai-prospect-hunter/projects", label: "Projects" },
  { href: "/ai-prospect-hunter/find", label: "Find Prospects" },
  { href: "/ai-prospect-hunter/outreach", label: "Outreach" },
  { href: "/ai-prospect-hunter/runs", label: "Agent Runs" },
  { href: "/ai-prospect-hunter/settings", label: "Settings" },
];

export function ProspectHunterSubNav() {
  const pathname = usePathname();

  return (
    <div className="flex flex-wrap gap-2">
      {TABS.map((tab) => {
        const isActive = tab.href === "/ai-prospect-hunter" ? pathname === tab.href : pathname?.startsWith(tab.href);
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
