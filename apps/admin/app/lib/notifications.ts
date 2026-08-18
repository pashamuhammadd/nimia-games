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
  | "order_installment_submitted"
  | "support_ticket_new"
  | "partner_withdrawal_requested"
  | (string & {});

export const NOTIFICATION_TYPE_META: Record<string, { icon: LucideIcon; accentClass: string }> = {
  order_new: { icon: Package, accentClass: "bg-sky-500/15 text-sky-400" },
  order_negotiation_offer: { icon: MessageSquare, accentClass: "bg-amber-500/15 text-amber-400" },
  order_payment_submitted: { icon: Wallet, accentClass: "bg-sky-500/15 text-sky-400" },
  // Installment coverage (16 Agustus 2026, Fase 10 — see
  // packages/db/migrations/0048_installment_notifications.sql). Same icon/
  // accent as the whole-order equivalent above — same kind of event
  // ("a payment is waiting on staff to verify"), just scoped to one
  // milestone instead of the whole order.
  order_installment_submitted: { icon: Wallet, accentClass: "bg-sky-500/15 text-sky-400" },
  support_ticket_new: { icon: LifeBuoy, accentClass: "bg-emerald-500/15 text-emerald-400" },
  referral_signup: { icon: Handshake, accentClass: "bg-pink-500/15 text-[var(--nimia-pink)]" },
  // Withdrawal system (11 Agustus 2026, migration 0033) — fired when a
  // partner requests a payout; founders act on it from the Partners page.
  partner_withdrawal_requested: { icon: Wallet, accentClass: "bg-amber-500/15 text-amber-400" },
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
