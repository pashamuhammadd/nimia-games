"use client";

import * as React from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { Button, buttonVariants, cn } from "@nimia/ui";
import { LoginModal } from "@/app/components/LoginModal";

export interface OrderHeaderProps {
  isAuthenticated: boolean;
}

// Deliberately NOT the full PublicNavbar (5 nav links + mobile drawer) —
// per the brief this page should feel like a focused configurator (Tesla/
// Vercel-style), not a marketing page with a wizard bolted on, so the
// header here is stripped down to just: brand mark, an exit back to
// Services, and the same auth affordance every other public page offers
// (Log in / Go to dashboard). Progress through the wizard itself is shown
// by ProgressIndicator, directly below this header, not up here.
export function OrderHeader({ isAuthenticated }: OrderHeaderProps) {
  const [loginOpen, setLoginOpen] = React.useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[var(--background)]/90 backdrop-blur supports-[backdrop-filter]:bg-[var(--background)]/70">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex shrink-0 items-center">
            {/* eslint-disable-next-line @next/next/no-img-element -- fixed local brand asset, same as PublicNavbar.tsx */}
            <img src="/nimia-studio-lockup.svg" alt="Nimia Games Studio" className="h-8 w-auto" />
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            {isAuthenticated ? (
              <Link
                href="/dashboard"
                className={cn(
                  buttonVariants({ size: "sm" }),
                  "bg-[var(--nimia-crimson)] text-white hover:bg-[var(--nimia-crimson-hover)]",
                )}
              >
                Go to dashboard
              </Link>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="border-white/25 hover:border-[var(--nimia-pink)]/70 hover:bg-white/5"
                onClick={() => setLoginOpen(true)}
              >
                Log in
              </Button>
            )}
            <Link
              href="/services"
              aria-label="Exit configurator"
              className="flex h-9 w-9 items-center justify-center rounded-md text-white/50 transition-colors hover:bg-white/10 hover:text-white"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </header>

      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />
    </>
  );
}
