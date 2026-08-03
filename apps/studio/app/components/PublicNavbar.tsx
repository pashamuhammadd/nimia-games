"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { buttonVariants, cn } from "@nimia/ui";

// Expanded from 2 to 5 items (29 Juli 2026, per user request) — Why
// Nimia, Portfolio, and Contact were new destinations built alongside that
// change. Why Nimia and Portfolio are intentionally minimal "coming soon"
// pages for now (see their page.tsx files) since the real content for
// each is still pending from the user (Why Nimia: their own bullet
// points; Portfolio: new/real work, NOT the old removed Recent Work
// videos) — the links are live so the navbar itself doesn't need to
// change again once that content arrives.
//
// Contact -> How to Start (30 Juli 2026, per user request): the old
// /contact page (a contact form) was removed entirely, not just relabeled.
// /how-to-start is a full guide to Nimia Studio's order/negotiate/pay/
// verify/deliver process — see app/how-to-start/page.tsx.
const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/why-nimia", label: "Why Nimia" },
  { href: "/services", label: "Services" },
  { href: "/portfolio", label: "Portfolio" },
  { href: "/how-to-start", label: "How to Start" },
];

// Public navbar for the unauthenticated/marketing side of studio.nimiagames.com
// (/, /services, /login, /register — and /ambassador/apply once that's
// built). Deliberately separate from the dashboard's sidebar (DashboardNav)
// — the two areas were confirmed with the user to have opposite nav
// patterns: public pages get a top navbar with NO sidebar, dashboard pages
// keep their existing sidebar with NO top navbar.
//
// Redesigned dark (29 Juli 2026, per user reference image) to match
// apps/www's cinematic dark brand instead of the dashboard's light theme.
// `nimia-dark` (see globals.css) overrides the SAME CSS variables
// Button/Card etc already read, so this file barely changes color-wise —
// it just needs to render inside that scope. It's applied here directly on
// <header> (self-contained) AND the caller wraps its own page content in
// the same class, so header and page background merge with no seam.
//
// Single CTA (per explicit user instruction, replacing the previous
// Log in + Start a Project / Go to dashboard pair): the navbar now only
// ever shows one button, "Start Your Project" — its destination is what
// changes based on auth state, not the button itself. Signed out, it goes
// to /login with a redirectedFrom back to /order (the Project
// Configurator — see modules/order and app/actions.ts#signInAction), so a
// visitor logs in first, then lands straight in the wizard instead of the
// dashboard. Signed in, it skips login entirely and goes straight to
// /order. There's no separate "Log in" button and no LoginModal anymore —
// signing in now only happens through the full /login page.
export function PublicNavbar({ isAuthenticated = false }: { isAuthenticated?: boolean }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const startProjectHref = isAuthenticated ? "/order" : "/login?redirectedFrom=/order";

  return (
    <header className="nimia-dark sticky top-0 z-40 border-b border-[var(--nimia-border)] bg-[var(--background)]/90 backdrop-blur supports-[backdrop-filter]:bg-[var(--background)]/70">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link
          href="/"
          className="flex shrink-0 items-center"
          onClick={() => setMobileOpen(false)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- fixed local
              brand asset with a known aspect ratio; next/image adds no real
              benefit here and risks stretching if intrinsic size drifts */}
          <img src="/nimia-studio-lockup.svg" alt="Nimia Games Studio" className="h-9 w-auto" />
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "text-sm font-medium transition-colors",
                pathname === link.href
                  ? "text-[var(--nimia-crimson)]"
                  : "text-[var(--foreground)] hover:text-[var(--nimia-crimson)]",
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          {/* bg/text/hover repeated on top of buttonVariants() as a
              safety net (29 Juli 2026) — see the @source note in
              globals.css for why. */}
          <Link
            href={startProjectHref}
            className={cn(
              buttonVariants({ size: "sm" }),
              "bg-[var(--nimia-crimson)] text-white hover:bg-[var(--nimia-crimson-hover)]",
            )}
          >
            Start Your Project
          </Link>
        </div>

        <button
          type="button"
          className="flex h-9 w-9 items-center justify-center rounded-md text-[var(--foreground)] hover:bg-[var(--nimia-surface-hover)] md:hidden"
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((v) => !v)}
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {mobileOpen ? (
        <div className="border-t border-[var(--nimia-border)] px-4 pb-4 pt-2 md:hidden">
          <nav className="flex flex-col gap-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "rounded-md px-3 py-2 text-sm font-medium",
                  pathname === link.href
                    ? "bg-[var(--nimia-crimson)]/10 text-[var(--nimia-crimson)]"
                    : "text-[var(--foreground)] hover:bg-[var(--nimia-surface-hover)]",
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="mt-3 flex flex-col gap-2">
            <Link
              href={startProjectHref}
              onClick={() => setMobileOpen(false)}
              className={cn(
                buttonVariants({ size: "sm" }),
                "justify-center bg-[var(--nimia-crimson)] text-white hover:bg-[var(--nimia-crimson-hover)]",
              )}
            >
              Start Your Project
            </Link>
          </div>
        </div>
      ) : null}
    </header>
  );
}
