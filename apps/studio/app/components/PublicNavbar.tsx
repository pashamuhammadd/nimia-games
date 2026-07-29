"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { Button, buttonVariants, cn } from "@nimia/ui";
import { LoginModal } from "./LoginModal";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/services", label: "Services" },
];

// Public navbar for the unauthenticated/marketing side of studio.nimiagames.com
// (/, /services, /login, /register — and /ambassador/apply once that's
// built). Deliberately separate from the dashboard's sidebar (DashboardNav)
// — the two areas were confirmed with the user to have opposite nav
// patterns: public pages get a top navbar with NO sidebar, dashboard pages
// keep their existing sidebar with NO top navbar.
export function PublicNavbar({ isAuthenticated = false }: { isAuthenticated?: boolean }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [loginOpen, setLoginOpen] = React.useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-[var(--nimia-border)] bg-[var(--nimia-surface)]/95 backdrop-blur supports-[backdrop-filter]:bg-[var(--nimia-surface)]/80">
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
            {isAuthenticated ? (
              <Link href="/dashboard" className={buttonVariants({ size: "sm" })}>
                Go to dashboard
              </Link>
            ) : (
              <>
                <Button type="button" variant="ghost" size="sm" onClick={() => setLoginOpen(true)}>
                  Log in
                </Button>
                <Link href="/register" className={buttonVariants({ size: "sm" })}>
                  Sign up
                </Link>
              </>
            )}
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
              {isAuthenticated ? (
                <Link
                  href="/dashboard"
                  onClick={() => setMobileOpen(false)}
                  className={buttonVariants({ size: "sm" })}
                >
                  Go to dashboard
                </Link>
              ) : (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setMobileOpen(false);
                      setLoginOpen(true);
                    }}
                  >
                    Log in
                  </Button>
                  <Link
                    href="/register"
                    onClick={() => setMobileOpen(false)}
                    className={buttonVariants({ size: "sm" })}
                  >
                    Sign up
                  </Link>
                </>
              )}
            </div>
          </div>
        ) : null}
      </header>

      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />
    </>
  );
}
