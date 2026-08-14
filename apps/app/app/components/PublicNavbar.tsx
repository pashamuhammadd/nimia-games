"use client";

import * as React from "react";
import { Menu, X } from "lucide-react";
import { buttonVariants, cn } from "@nimia/ui";
import { StartProjectButton } from "./StartProjectButton";

// Marketing site's public URL (14 Agustus 2026, dashboard split — see
// [[studio_multi_app_split_plan]]). This app (app.nimiastudio.com) has no
// marketing pages of its own anymore — /, /why-nimia, /services,
// /portfolio, /how-to-start, /partners all still live on apps/studio, so
// every nav link here has to be an absolute cross-origin URL instead of a
// local route (unlike apps/studio's own PublicNavbar, which this file was
// copied from and kept relative). Falls back to the production marketing
// domain so this still works if the env var is ever unset.
const STUDIO_URL = process.env.NEXT_PUBLIC_STUDIO_URL ?? "https://nimiastudio.com";

const NAV_LINKS = [
  { href: STUDIO_URL, label: "Home" },
  { href: `${STUDIO_URL}/why-nimia`, label: "Why Nimia" },
  { href: `${STUDIO_URL}/services`, label: "Services" },
  { href: `${STUDIO_URL}/portfolio`, label: "Portfolio" },
  { href: `${STUDIO_URL}/how-to-start`, label: "How to Start" },
  { href: `${STUDIO_URL}/partners`, label: "Partners" },
];

// Only rendered on this app's own public-while-signed-out pages
// (/login, /register, /register/check-email) — /order and /dashboard/*
// don't use this at all (OrderWizard has its own header, DashboardShell
// has the Sidebar/Topbar instead). The "Start a Project" CTA below stays a
// same-origin relative link to /order (unlike apps/studio's copy of this
// button, which has to cross origins to reach here) — everything after
// login already lives in this same app.
export function PublicNavbar({ isAuthenticated = false }: { isAuthenticated?: boolean }) {
  const [mobileOpen, setMobileOpen] = React.useState(false);

  return (
    <header className="nimia-dark sticky top-0 z-40 border-b border-[var(--nimia-border)] bg-[var(--background)]/90 backdrop-blur supports-[backdrop-filter]:bg-[var(--background)]/70">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <a href={STUDIO_URL} className="flex shrink-0 items-center">
          {/* eslint-disable-next-line @next/next/no-img-element -- fixed local
              brand asset with a known aspect ratio; next/image adds no real
              benefit here and risks stretching if intrinsic size drifts */}
          <img src="/nimia-studio-lockup.svg" alt="Nimia Games Studio" className="h-9 w-auto" />
        </a>

        <nav className="hidden items-center gap-6 md:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-[var(--foreground)] transition-colors hover:text-[var(--nimia-crimson)]"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <StartProjectButton
            isAuthenticated={isAuthenticated}
            className={cn(
              buttonVariants({ size: "sm" }),
              "bg-[var(--nimia-crimson)] text-white hover:bg-[var(--nimia-crimson-hover)]",
            )}
          >
            Start a Project
          </StartProjectButton>
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
              <a
                key={link.href}
                href={link.href}
                className="rounded-md px-3 py-2 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--nimia-surface-hover)]"
              >
                {link.label}
              </a>
            ))}
          </nav>
          <div className="mt-3 flex flex-col gap-2">
            <StartProjectButton
              isAuthenticated={isAuthenticated}
              onClick={() => setMobileOpen(false)}
              className={cn(
                buttonVariants({ size: "sm" }),
                "justify-center bg-[var(--nimia-crimson)] text-white hover:bg-[var(--nimia-crimson-hover)]",
              )}
            >
              Start a Project
            </StartProjectButton>
          </div>
        </div>
      ) : null}
    </header>
  );
}
