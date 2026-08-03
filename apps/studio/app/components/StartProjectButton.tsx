"use client";

import * as React from "react";
import Link from "next/link";
import { LoginModal } from "./LoginModal";

export interface StartProjectButtonProps {
  isAuthenticated: boolean;
  className?: string;
  children: React.ReactNode;
  /** Extra behavior to run on click before navigating or opening the modal
   * — e.g. closing the navbar's mobile drawer. */
  onClick?: () => void;
}

// Shared "Start Your Project" trigger (3 Agustus 2026, per user request —
// every such CTA sitewide, not just the navbar, must offer login via modal
// instead of a full /login page navigation). Used by PublicNavbar, the home
// hero, and every services/why-nimia/how-to-start hero + closing CTA +
// featured package card.
//
// Signed in: a plain Link straight to /order, nothing else happens.
// Signed out: opens the same LoginModal used elsewhere on the site
// (app/components/LoginModal.tsx) with redirectedFrom="/order" instead of
// navigating anywhere. LoginModal -> LoginForm -> signInAction already know
// how to read that hidden field and redirect() there on success (see
// app/actions.ts#signInAction and its safeRedirectTarget guard) — the same
// mechanism the navbar's earlier /login?redirectedFrom=/order flow used,
// just triggered from a modal instead of a page navigation. So a visitor
// who isn't logged in lands on /order the moment they log in, from
// whichever CTA they clicked.
//
// Deliberately renders a <button>, not an <a>/<Link>, in the signed-out
// case: nothing is being navigated to, a modal is opening in place, and a
// button is the semantically correct element for that.
export function StartProjectButton({
  isAuthenticated,
  className,
  children,
  onClick,
}: StartProjectButtonProps) {
  const [loginOpen, setLoginOpen] = React.useState(false);

  if (isAuthenticated) {
    return (
      <Link href="/order" className={className} onClick={onClick}>
        {children}
      </Link>
    );
  }

  return (
    <>
      <button
        type="button"
        className={className}
        onClick={() => {
          onClick?.();
          setLoginOpen(true);
        }}
      >
        {children}
      </button>
      <LoginModal
        open={loginOpen}
        onClose={() => setLoginOpen(false)}
        redirectedFrom="/order"
      />
    </>
  );
}
