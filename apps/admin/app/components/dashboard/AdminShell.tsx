"use client";

import * as React from "react";
import { Sidebar } from "./Sidebar";
import { MobileNavDrawer } from "./MobileNavDrawer";
import { Topbar } from "./Topbar";
import type { NotificationRow } from "../../lib/notifications";

// Client wrapper composing sidebar/drawer/topbar around whatever page the
// App Router renders — split from (protected)/layout.tsx (which stays a
// Server Component so the auth + role check never round-trips to the
// browser first) same as apps/studio's DashboardShell/dashboard/layout.tsx
// split. `role` is threaded down to Sidebar/MobileNavDrawer purely to
// decide whether the Finance nav item shows — /finance itself is ALSO
// hard-gated server-side in its own page (defense in depth), so hiding
// the link here is a UX nicety, not the security boundary.
export function AdminShell({
  children,
  userName,
  userEmail,
  role,
  signOutAction,
  initialNotifications,
  initialUnreadCount,
}: {
  children: React.ReactNode;
  userName: string;
  userEmail: string;
  role: string;
  signOutAction: () => void | Promise<void>;
  initialNotifications: NotificationRow[];
  initialUnreadCount: number;
}) {
  const [mobileOpen, setMobileOpen] = React.useState(false);

  return (
    <div className="flex min-h-screen bg-[var(--background)]">
      <Sidebar role={role} />
      <MobileNavDrawer role={role} open={mobileOpen} onClose={() => setMobileOpen(false)} />

      <div className="flex min-h-screen flex-1 flex-col">
        <Topbar
          onMenuClick={() => setMobileOpen(true)}
          userName={userName}
          userEmail={userEmail}
          onSignOut={() => void signOutAction()}
          initialNotifications={initialNotifications}
          initialUnreadCount={initialUnreadCount}
        />
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
