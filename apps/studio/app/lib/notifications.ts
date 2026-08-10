import {
  Bell,
  Package,
  MessageSquare,
  Wallet,
  LifeBuoy,
  FolderKanban,
  FileText,
  Handshake,
  type LucideIcon,
} from "lucide-react";

// Icon/accent metadata for the notification bell (Topbar.tsx / NotificationsBell.tsx).
// `type` values are free-form text (see packages/db/migrations/0004_messaging_files.sql's
// own comment) written by the database triggers in
// packages/db/migrations/0032_notifications.sql — KEEP THIS RECORD IN SYNC
// with the `type` string literals used there, same "manually synced in
// multiple places" convention as apps/*/lib/projectStatus.ts and the
// partner level ladder (0016). apps/admin has its own copy of this file
// (same client/staff split every other app/lib/*.ts in this codebase
// already has) — only the types relevant to THIS app's audience are
// listed here (client-facing: order_status/negotiation/support/project/
// referral); apps/admin's copy lists the staff-facing ones instead.
export type NotificationType =
  | "order_status"
  | "order_negotiation_offer"
  | "support_ticket_closed"
  | "project_status"
  | "project_deliverable"
  | "referral_signup"
  | (string & {});

export const NOTIFICATION_TYPE_META: Record<string, { icon: LucideIcon; accentClass: string }> = {
  order_status: { icon: Package, accentClass: "bg-sky-500/15 text-sky-400" },
  order_negotiation_offer: { icon: MessageSquare, accentClass: "bg-amber-500/15 text-amber-400" },
  order_payment_submitted: { icon: Wallet, accentClass: "bg-sky-500/15 text-sky-400" },
  support_ticket_closed: { icon: LifeBuoy, accentClass: "bg-emerald-500/15 text-emerald-400" },
  project_status: { icon: FolderKanban, accentClass: "bg-violet-500/15 text-violet-400" },
  project_deliverable: { icon: FileText, accentClass: "bg-emerald-500/15 text-emerald-400" },
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
