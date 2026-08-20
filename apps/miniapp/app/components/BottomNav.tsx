"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// 5-tab bottom navigation (docs/TELEGRAM.md §2 bottom nav spec). A plain
// client component rather than anything Telegram-SDK-aware — Telegram's
// own BackButton (docs/TELEGRAM.md §15) is a separate, optional piece of
// polish for a later pass (deeper screens like an individual order
// detail should show Telegram's native back arrow instead of/in addition
// to this bottom nav; this first slice doesn't have any screens deep
// enough to need it yet).
const TABS = [
  { href: "/", label: "Home", icon: "🏠" },
  { href: "/services", label: "Services", icon: "🛒" },
  { href: "/orders", label: "Orders", icon: "📦" },
  { href: "/partner", label: "Partner", icon: "🤝" },
  { href: "/account", label: "Account", icon: "👤" },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="bottom-nav">
      {TABS.map((tab) => {
        const active = tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
        return (
          <Link key={tab.href} href={tab.href} data-active={active}>
            <span className="icon">{tab.icon}</span>
            <span>{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
