"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ClipboardList,
  FolderKanban,
  Receipt,
  MessageSquare,
  User,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@nimia/ui";

const NAV_ITEMS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/orders", label: "Orders", icon: ClipboardList },
  { href: "/dashboard/projects", label: "Projects", icon: FolderKanban },
  { href: "/dashboard/invoices", label: "Invoices", icon: Receipt },
  { href: "/dashboard/messages", label: "Messages", icon: MessageSquare },
  { href: "/dashboard/profile", label: "Profile", icon: User },
];

// Split out of dashboard/layout.tsx (a Server Component, so it can do the
// auth check server-side) because active-item highlighting needs
// usePathname(), which only works in a Client Component.
export function DashboardNav({
  variant = "sidebar",
  onNavigate,
}: {
  variant?: "sidebar" | "mobile";
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  return (
    <>
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const isActive = href === "/dashboard" ? pathname === href : pathname?.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-md text-sm font-medium transition-colors",
              variant === "sidebar" ? "px-3 py-2" : "shrink-0 px-3 py-1.5",
              isActive
                ? "bg-[var(--nimia-crimson)]/10 text-[var(--nimia-crimson)]"
                : "text-[var(--foreground)] hover:bg-[var(--nimia-surface-hover)]",
            )}
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
            {label}
          </Link>
        );
      })}
    </>
  );
}
