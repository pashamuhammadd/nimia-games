import { Bell, Package, MessageSquare, Wallet, LifeBuoy, Handshake, type LucideIcon } from "lucide-react";

// Same idea as apps/studio's own app/lib/notifications.ts (see that file's
// comment) — icon/accent metadata for the notification bell, keyed by the
// free-form `type` text the triggers in
// packages/db/migrations/0032_notifications.sql write. Only lists the
// STAFF-facing types (apps/studio's copy has the client-facing ones) —
// KEEP BOTH IN SYNC with the trigger functions' `type` string literals.
export type NotificationType =
  | "order_new"
  | "order_negotiation_offer"
  | "order_payment_submitted"
  | "support_ticket_new"
  | (string & {});

export const NOTIFICATION_TYPE_META: Record<string, { icon: LucideIcon; accentClass: string }> = {
  order_new: { icon: Package, accentClass: "bg-sky-500/15 text-sky-400" },
  order_negotiation_offer: { icon: MessageSquare, accentClass: "bg-amber-500/15 text-amber-400" },
  order_payment_submitted: { icon: Wallet, accentClass: "bg-sky-500/15 text-sky-400" },
  support_ticket_new: { icon: LifeBuoy, accentClass: "bg-emerald-500/15 text-emerald-400" },
  referral_signup: { icon: Handshake, accentClass: "bg-pink-500/15 text-[var(--nimia-pink)]" },
};

export function notificationTypeMeta(type: string) {
  return NOTIFICATION_TYPE_META[type] ?? { icon: Bell, accentClass: "bg-white/10 text-white/60" };
}

export type NotificationRow = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
};
