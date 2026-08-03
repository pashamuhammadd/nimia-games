"use client";

import * as React from "react";
import { Sidebar } from "./Sidebar";
import { MobileNavDrawer } from "./MobileNavDrawer";
import { Topbar } from "./Topbar";

// Client wrapper composing the sidebar/drawer/topbar shell around whatever
// page the App Router renders as `children`. Split out from
// dashboard/layout.tsx (30 Juli 2026, Client Dashboard redesign) because
// only this piece needs interactive state (mobile drawer open/closed) —
// layout.tsx stays a Server Component so the auth check + user/client
// lookup it does never has to round-trip to the browser first.
export function DashboardShell({
  children,
  userName,
  userEmail,
  userAvatarUrl,
  signOutAction,
}: {
  children: React.ReactNode;
  userName: string;
  userEmail: string;
  userAvatarUrl?: string | null;
  signOutAction: () => void | Promise<void>;
}) {
  const [mobileOpen, setMobileOpen] = React.useState(false);

  return (
    // "nimia-dark" (see globals.css) is what actually re-themes every
    // @nimia/ui component (Card, Button, Modal, ...) to the dark palette —
    // this whole client dashboard intentionally overrides Tahap 4's original
    // light-dashboard decision per the new brief + reference mockup (Linear/
    // Stripe/Vercel-style dark SaaS). Applied here at the shell root so it
    // covers every /dashboard/* page automatically, including ones not
    // touched by this pass (profile, orders, etc.).
    <div className="nimia-dark flex min-h-screen bg-[#0a0508]">
      <Sidebar />
      <MobileNavDrawer open={mobileOpen} onClose={() => setMobileOpen(false)} />

      <div className="flex min-h-screen flex-1 flex-col">
        <Topbar
          onMenuClick={() => setMobileOpen(true)}
          userName={userName}
          userEmail={userEmail}
          userAvatarUrl={userAvatarUrl}
          onSignOut={() => void signOutAction()}
        />
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
