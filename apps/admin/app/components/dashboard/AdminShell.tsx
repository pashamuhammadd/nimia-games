"use client";

import * as React from "react";
import { Sidebar } from "./Sidebar";
import { MobileNavDrawer } from "./MobileNavDrawer";
import { Topbar } from "./Topbar";

// Client wrapper composing sidebar/drawer/topbar around whatever page the
// App Router renders — split from (protected)/layout.tsx (which stays a
// Server Component so the auth + role check never round-trips to the
// browser first) same as apps/studio's DashboardShell/dashboard/layout.tsx
// split.
export function AdminShell({
  children,
  userName,
  userEmail,
  signOutAction,
}: {
  children: React.ReactNode;
  userName: string;
  userEmail: string;
  signOutAction: () => void | Promise<void>;
}) {
  const [mobileOpen, setMobileOpen] = React.useState(false);

  return (
    <div className="flex min-h-screen bg-[var(--background)]">
      <Sidebar />
      <MobileNavDrawer open={mobileOpen} onClose={() => setMobileOpen(false)} />

      <div className="flex min-h-screen flex-1 flex-col">
        <Topbar
          onMenuClick={() => setMobileOpen(true)}
          userName={userName}
          userEmail={userEmail}
          onSignOut={() => void signOutAction()}
        />
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
