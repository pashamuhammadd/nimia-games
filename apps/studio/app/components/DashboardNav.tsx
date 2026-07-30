"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Package,
  Handshake,
  Gift,
  Ticket,
  Target,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@nimia/ui";

// Rebuilt for the Client Dashboard redesign (30 Juli 2026, per user brief +
// reference mockup). Exactly the 6 items the brief asks for — no more, no
// less ("JANGAN tambahkan menu lain"): Dashboard, Orders, Negotiations,
// Deliveries, Vouchers, Quests. Settings/Invoices/Messages/Profile are
// deliberately NOT here anymore (they moved to the avatar dropdown or are
// reachable directly by URL for now) — see Topbar.tsx's account menu.
export const DASHBOARD_NAV_ITEMS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/orders", label: "Orders", icon: Package },
  { href: "/dashboard/negotiations", label: "Negotiations", icon: Handshake },
  { href: "/dashboard/deliveries", label: "Deliveries", icon: Gift },
  { href: "/dashboard/vouchers", label: "Vouchers", icon: Ticket },
  { href: "/dashboard/quests", label: "Quests", icon: Target },
];

// Shared by Sidebar.tsx (desktop rail), MobileNavDrawer.tsx, and Topbar.tsx
// (for the current page title) so the single source of truth for "what
// pages exist" lives in one place, per the brief's request for a modular
// foundation future pages can slot into.
export function getActiveNavItem(pathname: string | null) {
  if (!pathname) return undefined;
  // Longest-prefix match so nested routes (e.g. a future
  // /dashboard/orders/[id]) still highlight "Orders", checked in reverse
  // order (most specific href first) — "/dashboard" itself only matches
  // exactly, everything else matches by prefix.
  return [...DASHBOARD_NAV_ITEMS]
    .sort((a, b) => b.href.length - a.href.length)
    .find((item) => (item.href === "/dashboard" ? pathname === item.href : pathname.startsWith(item.href)));
}

export function DashboardNav({
  variant = "sidebar",
  onNavigate,
}: {
  // "sidebar" = full label + icon (desktop, lg+), "rail" = icon-only with
  // a centered layout (tablet, md-lg), "mobile" = full label + icon inside
  // the slide-in drawer.
  variant?: "sidebar" | "rail" | "mobile";
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const active = getActiveNavItem(pathname);

  return (
    <>
      {DASHBOARD_NAV_ITEMS.map((item) => {
        const isActive = active?.href === item.href;
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            title={variant === "rail" ? item.label : undefined}
            className={cn(
              "group relative flex items-center gap-3 rounded-xl text-sm font-medium transition-colors",
              variant === "rail" ? "justify-center px-0 py-3" : "px-3.5 py-2.5",
              isActive
                ? "text-white"
                : "text-white/55 hover:bg-white/[0.06] hover:text-white/90",
            )}
          >
            {isActive ? (
              <motion.span
                layoutId="dashboard-nav-active-pill"
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
                className="absolute inset-0 rounded-xl bg-[var(--nimia-crimson)]/15 ring-1 ring-inset ring-[var(--nimia-crimson)]/40"
              />
            ) : null}
            <Icon
              className={cn(
                "relative h-[18px] w-[18px] shrink-0",
                isActive && "text-[var(--nimia-pink)]",
              )}
              aria-hidden="true"
            />
            {variant !== "rail" ? <span className="relative">{item.label}</span> : null}
            {isActive && variant === "rail" ? (
              <span className="absolute -right-px top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-l-full bg-[var(--nimia-crimson)]" />
            ) : null}
          </Link>
        );
      })}
    </>
  );
}
