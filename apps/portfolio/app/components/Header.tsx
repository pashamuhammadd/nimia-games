"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { buttonVariants, cn } from "@nimia/ui";

const STUDIO_URL = process.env.NEXT_PUBLIC_STUDIO_URL ?? "https://nimiastudio.com";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.nimiastudio.com";

// Same 6 destinations as apps/studio's PublicNavbar (spec §4's suggested
// nav), minus a login-state-aware CTA behavior — this app has no session
// of its own (no login here at all, it's a pure public gallery), so
// "Portfolio" is the only internal link (this app's own "/") and every
// other item points back at the main studio site. Matches spec's "follow
// the existing Nimia Studio website style" instruction directly rather
// than inventing a new nav pattern for one subdomain.
const NAV_LINKS = [
  { href: `${STUDIO_URL}/`, label: "Home", internal: false },
  { href: `${STUDIO_URL}/why-nimia`, label: "Why Nimia", internal: false },
  { href: `${STUDIO_URL}/services`, label: "Services", internal: false },
  { href: "/", label: "Portfolio", internal: true },
  { href: `${STUDIO_URL}/how-to-start`, label: "How to Start", internal: false },
  { href: `${STUDIO_URL}/partners`, label: "Partners", internal: false },
];

// Minimal, subtle header (spec §4: "should NOT be visually dominant") —
// logo left, centered nav on desktop, single CTA right, hamburger on
// mobile. Blends with the page (translucent + blur) rather than sitting on
// an opaque bar, same technique as apps/studio's PublicNavbar.
export function Header() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = React.useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--nimia-border)] bg-[var(--background)]/90 backdrop-blur supports-[backdrop-filter]:bg-[var(--background)]/70">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <a href={`${STUDIO_URL}/`} className="flex shrink-0 items-center gap-2" onClick={() => setMobileOpen(false)}>
          <span className="nimia-font-display text-lg font-bold tracking-wide text-white">
            NIMIA <span className="nimia-gradient-text">STUDIO</span>
          </span>
        </a>

        <nav className="hidden items-center gap-6 md:flex">
          {NAV_LINKS.map((link) =>
            link.internal ? (
              <Link
                key={link.label}
                href={link.href}
                className={cn(
                  "text-sm font-medium transition-colors",
                  pathname === link.href
                    ? "text-[var(--nimia-pink)]"
                    : "text-[var(--foreground)] hover:text-[var(--nimia-pink)]",
                )}
              >
                {link.label}
              </Link>
            ) : (
              <a
                key={link.label}
                href={link.href}
                className="text-sm font-medium text-[var(--foreground)] transition-colors hover:text-[var(--nimia-pink)]"
              >
                {link.label}
              </a>
            ),
          )}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <a
            href={`${APP_URL}/order`}
            className={cn(
              buttonVariants({ size: "sm" }),
              "bg-[var(--nimia-crimson)] text-white hover:bg-[var(--nimia-crimson-hover)]",
            )}
          >
            Start a Project
          </a>
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
            {NAV_LINKS.map((link) =>
              link.internal ? (
                <Link
                  key={link.label}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "rounded-md px-3 py-2 text-sm font-medium",
                    pathname === link.href
                      ? "bg-[var(--nimia-pink)]/10 text-[var(--nimia-pink)]"
                      : "text-[var(--foreground)] hover:bg-[var(--nimia-surface-hover)]",
                  )}
                >
                  {link.label}
                </Link>
              ) : (
                <a
                  key={link.label}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="rounded-md px-3 py-2 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--nimia-surface-hover)]"
                >
                  {link.label}
                </a>
              ),
            )}
          </nav>
          <div className="mt-3 flex flex-col gap-2">
            <a
              href={`${APP_URL}/order`}
              onClick={() => setMobileOpen(false)}
              className={cn(
                buttonVariants({ size: "sm" }),
                "justify-center bg-[var(--nimia-crimson)] text-white hover:bg-[var(--nimia-crimson-hover)]",
              )}
            >
              Start a Project
            </a>
          </div>
        </div>
      ) : null}
    </header>
  );
}
