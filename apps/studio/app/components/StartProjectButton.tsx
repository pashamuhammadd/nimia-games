"use client";

import * as React from "react";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.nimiastudio.com";

export interface StartProjectButtonProps {
  isAuthenticated: boolean;
  className?: string;
  children: React.ReactNode;
  /** Extra behavior to run on click before navigating — e.g. closing the
   * navbar's mobile drawer. */
  onClick?: () => void;
}

// Shared "Start Your Project" trigger — used by PublicNavbar, the home
// hero, and every services/why-nimia/how-to-start hero + closing CTA +
// featured package card.
//
// Rewritten cross-origin (14 Agustus 2026, dashboard split — see
// [[studio_multi_app_split_plan]]): /order and /login now live on a
// different subdomain (app.nimiastudio.com), so this can no longer open an
// in-page LoginModal the way it used to — a Server Action bound to one
// Next.js deployment can't be invoked from a page served by a different
// one, and the login form itself now lives in that other app entirely.
//
// Signed in -> straight to the app's /order. Signed out -> the app's
// /login, with redirectedFrom=/order so its signInAction lands the visitor
// back on Review Order once they sign in — same mechanism as before, just
// now a real cross-domain navigation instead of a same-page modal. This is
// a deliberate UX tradeoff versus the old no-reload modal; flagged
// explicitly in project memory rather than left as a silent regression.
export function StartProjectButton({
  isAuthenticated,
  className,
  children,
  onClick,
}: StartProjectButtonProps) {
  const href = isAuthenticated
    ? `${APP_URL}/order`
    : `${APP_URL}/login?redirectedFrom=${encodeURIComponent("/order")}`;

  return (
    <a href={href} className={className} onClick={onClick}>
      {children}
    </a>
  );
}
