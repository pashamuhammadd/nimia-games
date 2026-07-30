"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Package,
  Users,
  FolderKanban,
  Receipt,
  Boxes,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@nimia/ui";

// Exactly the 6 sections agreed for v1: Overview (fully live), Orders
// (fully live — approve/reject/convert), and Clients/Projects/Invoices/
// Services as "Coming Soon" placeholders until their own backend lands —
// same staged approach apps/studio's DashboardNav used for its redesign.
export const ADMIN_NAV_ITEMS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/orders", label: "Orders", icon: Package },
  { href: "/clients", label: "Clients", icon: Users },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/invoices", label: "Invoices", icon: Receipt },
  { href: "/services", label: "Services", icon: Boxes },
];

export function getActiveNavItem(pathname: string | null) {
  if (!pathname) return undefined;
  return [...ADMIN_NAV_ITEMS]
    .sort((a, b) => b.href.length - a.href.length)
    .find((item) => (item.href === "/" ? pathname === item.href : pathname.startsWith(item.href)));
}

export function AdminNav({
  variant = "sidebar",
  onNavigate,
}: {
  variant?: "sidebar" | "rail" | "mobile";
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const active = getActiveNavItem(pathname);

  return (
    <>
      {ADMIN_NAV_ITEMS.map((item) => {
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
              isActive ? "text-white" : "text-white/55 hover:bg-white/[0.06] hover:text-white/90",
            )}
          >
            {isActive ? (
              <motion.span
                layoutId="admin-nav-active-pill"
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
                className="absolute inset-0 rounded-xl bg-[var(--nimia-crimson)]/15 ring-1 ring-inset ring-[var(--nimia-crimson)]/40"
              />
            ) : null}
            <Icon
              className={cn("relative h-[18px] w-[18px] shrink-0", isActive && "text-[var(--nimia-pink)]")}
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
