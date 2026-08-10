"use client";

import * as React from "react";
import Link from "next/link";
import { Bell, CheckCheck, Loader2 } from "lucide-react";
import { cn } from "@nimia/ui";
import {
  getNotificationsAction,
  markAllNotificationsReadAction,
  markNotificationReadAction,
  type NotificationsResult,
} from "../../(protected)/notifications/actions";
import { notificationTypeMeta, type NotificationRow } from "../../lib/notifications";
import { formatRelativeTime } from "../../lib/relativeTime";

// In-app Notification Center bell (10 Agustus 2026) — staff-facing
// counterpart to apps/studio's own NotificationsBell.tsx (same component
// shape, same polling-based refresh, different copy/routes). See that
// file's own comment for why this polls instead of using Supabase
// Realtime, and why it's self-contained (owns its own open/closed state)
// rather than threading bellOpen up into Topbar.
const POLL_INTERVAL_MS = 45_000;

function useClickOutside<T extends HTMLElement>(onOutside: () => void) {
  const ref = React.useRef<T>(null);
  React.useEffect(() => {
    function handle(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        onOutside();
      }
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") onOutside();
    }
    document.addEventListener("mousedown", handle);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handle);
      document.removeEventListener("keydown", handleKey);
    };
  }, [onOutside]);
  return ref;
}

export function NotificationsBell({
  initialNotifications,
  initialUnreadCount,
}: {
  initialNotifications: NotificationRow[];
  initialUnreadCount: number;
}) {
  const [open, setOpen] = React.useState(false);
  const [notifications, setNotifications] = React.useState(initialNotifications);
  const [unreadCount, setUnreadCount] = React.useState(initialUnreadCount);
  const [loading, setLoading] = React.useState(false);
  const ref = useClickOutside<HTMLDivElement>(() => setOpen(false));

  const applyResult = React.useCallback((result: NotificationsResult) => {
    setNotifications(result.notifications);
    setUnreadCount(result.unreadCount);
  }, []);

  const refresh = React.useCallback(async () => {
    try {
      const result = await getNotificationsAction();
      applyResult(result);
    } catch {
      // Best-effort — a failed poll just means the bell shows slightly
      // stale data until the next tick, never worth surfacing as an error.
    }
  }, [applyResult]);

  React.useEffect(() => {
    const interval = setInterval(refresh, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [refresh]);

  async function handleToggle() {
    const next = !open;
    setOpen(next);
    if (next) {
      setLoading(true);
      await refresh();
      setLoading(false);
    }
  }

  async function handleItemClick(notification: NotificationRow) {
    if (!notification.read_at) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, read_at: new Date().toISOString() } : n)),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
      await markNotificationReadAction(notification.id);
    }
    setOpen(false);
  }

  async function handleMarkAllRead() {
    setNotifications((prev) => prev.map((n) => (n.read_at ? n : { ...n, read_at: new Date().toISOString() })));
    setUnreadCount(0);
    await markAllNotificationsReadAction();
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={handleToggle}
        aria-label="Notifications"
        aria-expanded={open}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg text-white/70 transition-colors hover:bg-white/[0.06] hover:text-white"
      >
        <Bell className="h-[18px] w-[18px]" />
        {unreadCount > 0 ? (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--nimia-crimson)] px-1 text-[10px] font-semibold leading-none text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-11 w-80 overflow-hidden rounded-2xl border border-white/10 bg-[#120a0f]/95 shadow-2xl shadow-black/50 backdrop-blur"
        >
          <div className="flex items-center justify-between gap-2 px-3.5 pb-2 pt-3">
            <span className="text-sm font-semibold text-white">Notifications</span>
            {unreadCount > 0 ? (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-white/50 transition-colors hover:bg-white/[0.06] hover:text-white"
              >
                <CheckCheck className="h-3.5 w-3.5" aria-hidden="true" />
                Mark all read
              </button>
            ) : null}
          </div>

          <div className="max-h-96 overflow-y-auto p-1">
            {loading && notifications.length === 0 ? (
              <div className="flex items-center justify-center gap-2 px-3.5 py-8 text-sm text-white/45">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Loading…
              </div>
            ) : notifications.length === 0 ? (
              <div className="px-3.5 pb-4 pt-1 text-sm text-white/45">
                You&apos;re all caught up, nothing new right now.
              </div>
            ) : (
              notifications.map((notification) => {
                const { icon: Icon, accentClass } = notificationTypeMeta(notification.type);
                const isUnread = !notification.read_at;
                const content = (
                  <div
                    className={cn(
                      "flex gap-2.5 rounded-xl px-2.5 py-2.5 text-left transition-colors hover:bg-white/[0.06]",
                      isUnread && "bg-white/[0.03]",
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                        accentClass,
                      )}
                    >
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        <span className="truncate text-sm font-medium text-white">{notification.title}</span>
                        {isUnread ? (
                          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--nimia-pink)]" aria-hidden="true" />
                        ) : null}
                      </span>
                      {notification.body ? (
                        <span className="mt-0.5 block line-clamp-2 text-xs text-white/50">{notification.body}</span>
                      ) : null}
                      <span className="mt-1 block text-[11px] text-white/35">
                        {formatRelativeTime(notification.created_at)}
                      </span>
                    </span>
                  </div>
                );

                return notification.link ? (
                  <Link
                    key={notification.id}
                    href={notification.link}
                    role="menuitem"
                    onClick={() => void handleItemClick(notification)}
                    className="block"
                  >
                    {content}
                  </Link>
                ) : (
                  <button
                    key={notification.id}
                    type="button"
                    role="menuitem"
                    onClick={() => void handleItemClick(notification)}
                    className="block w-full"
                  >
                    {content}
                  </button>
                );
              })
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
