"use server";

import { cookies } from "next/headers";
import { createServerClient } from "@nimia/db";
import type { NotificationRow } from "../../lib/notifications";

// Read side of the in-app Notification Center (10 Agustus 2026) — the
// WRITE side is entirely database triggers, see
// packages/db/migrations/0032_notifications.sql's own file comment for
// why. This file only ever reads/marks-read the current staff member's
// own rows (every admin/staff/founder account gets its own broadcast row
// per event via notify_staff() — see that migration — so "own rows" here
// still means "everything relevant to me", nothing is shared/mutable
// across staff accounts).
//
// IMPORTANT: notifications_select_own (0006_rls_policies.sql) is
// `user_id = auth.uid() OR public.is_admin()` — the is_admin() half means
// RLS alone does NOT scope a query to "only mine" for an admin-tier
// account (which every user of this app is) — every query below
// explicitly filters `.eq("user_id", user.id)` so one staff member never
// sees (or marks read) another staff member's copy of the same broadcast.

export type NotificationsResult = {
  notifications: NotificationRow[];
  unreadCount: number;
};

const EMPTY_RESULT: NotificationsResult = { notifications: [], unreadCount: 0 };

export async function getNotificationsAction(): Promise<NotificationsResult> {
  const supabase = createServerClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return EMPTY_RESULT;

  const [{ data: notifications }, { count }] = await Promise.all([
    supabase
      .from("notifications")
      .select("id, type, title, body, link, read_at, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .is("read_at", null),
  ]);

  return {
    notifications: (notifications as NotificationRow[] | null) ?? [],
    unreadCount: count ?? 0,
  };
}

export async function markNotificationReadAction(notificationId: string): Promise<void> {
  const supabase = createServerClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", notificationId)
    .eq("user_id", user.id)
    .is("read_at", null);
}

export async function markAllNotificationsReadAction(): Promise<void> {
  const supabase = createServerClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .is("read_at", null);
}
