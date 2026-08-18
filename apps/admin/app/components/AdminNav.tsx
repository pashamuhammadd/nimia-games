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
  Ticket,
  Target,
  Wallet,
  LifeBuoy,
  Handshake,
  Bot,
  Clapperboard,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@nimia/ui";
import { isFounderRole } from "../lib/roles";

// The full set of possible sections — Finance is included here (not just
// conditionally appended) so getActiveNavItem can still resolve the page
// title correctly for whoever's actually allowed to be on /finance.
// `founderOnly` items are filtered OUT for non-founders in AdminNav below;
// they are NOT removed from this list.
export const ADMIN_NAV_ITEMS: { href: string; label: string; icon: LucideIcon; founderOnly?: boolean }[] = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/orders", label: "Orders", icon: Package },
  { href: "/clients", label: "Clients", icon: Users },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/invoices", label: "Invoices", icon: Receipt },
  { href: "/services", label: "Services", icon: Boxes },
  // Animation Portfolio curation (18 Agustus 2026) — publish/feature/
  // reorder/edit items for portfolio.nimiastudio.com and manually
  // backfill from Cloudinary. Same is_admin()-only visibility as
  // Services/Vouchers/Quests above, not founderOnly (content curation,
  // not a money-moving action). See apps/admin/app/(protected)/portfolio/.
  { href: "/portfolio", label: "Portfolio", icon: Clapperboard },
  // Vouchers/Quests (4 Agustus 2026, P1) — not founderOnly, staff manages
  // these same as Orders/Clients/Projects.
  { href: "/vouchers", label: "Vouchers", icon: Ticket },
  { href: "/quests", label: "Quests", icon: Target },
  // Partners (10 Agustus 2026) — admin directory for the Nimia Partner
  // Program (client-facing side already live since 30 Juli 2026). Same
  // is_admin()-gated visibility as Vouchers/Quests above, not founderOnly
  // — matches get_partner_metrics()/get_partner_referral_activity()
  // (0016), which were already staff-accessible, not founder-only.
  { href: "/partners", label: "Partners", icon: Handshake },
  // AI Prospect Hunter (12 Agustus 2026 — rewritten from "AI Client
  // Hunter" the same day) — CoinGecko-powered crypto/Web3 project
  // prospecting for Nimia Studio's animation services, see
  // apps/admin/app/(protected)/ai-prospect-hunter/. Same is_admin()-only
  // visibility as every other staff tool here (ai_projects_admin_all
  // etc., packages/db/migrations/0040_ai_prospect_hunter.sql) — not
  // founderOnly, this is a research/prep tool, not a money-moving one.
  { href: "/ai-prospect-hunter", label: "AI Prospect Hunter", icon: Bot },
  // Tickets (9 Agustus 2026, Discord support-ticket pass) — unlike the
  // client-facing dashboard, apps/admin's brief never said "don't add
  // menu items", so this is a real Sidebar entry rather than tucked into
  // a dropdown. `Ticket` icon is already used for Vouchers above, so
  // `LifeBuoy` here to keep the two visually distinct.
  { href: "/tickets", label: "Tickets", icon: LifeBuoy },
  { href: "/finance", label: "Finance", icon: Wallet, founderOnly: true },
];

export function getActiveNavItem(pathname: string | null) {
  if (!pathname) return undefined;
  return [...ADMIN_NAV_ITEMS]
    .sort((a, b) => b.href.length - a.href.length)
    .find((item) => (item.href === "/" ? pathname === item.href : pathname.startsWith(item.href)));
}

export function AdminNav({
  variant = "sidebar",
  role,
  onNavigate,
}: {
  variant?: "sidebar" | "rail" | "mobile";
  // Role decides whether "Finance" shows at all — see docs/ARCHITECTURE.md
  // section 1/3: "staff lihat 'Admin Orders' tapi tidak 'Finance', founder
  // lihat semua".
  role: string;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const active = getActiveNavItem(pathname);
  const isFounder = isFounderRole(role);
  const items = ADMIN_NAV_ITEMS.filter((item) => !item.founderOnly || isFounder);

  return (
    <>
      {items.map((item) => {
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
