-- ============================================================
-- 0048: Fase 10 (Notification) — installment coverage for the in-app bell
--
-- FASE0-AUDIT.md Current Problems #11: "Notifikasi in-app (bell,
-- migration 0032) TIDAK PUNYA trigger untuk order_installments sama
-- sekali — staff tidak dapat notifikasi in-app saat installment disubmit
-- untuk verifikasi, client tidak dapat notifikasi in-app spesifik
-- 'installment Anda sudah diverifikasi' (yang ada cuma 'installment
-- berikutnya sudah bisa dibayar', trigger handle_installment_paid).
-- Discord notification SUDAH menutupi ini (notifyPaymentSubmitted/
-- notifyPaymentVerified/notifyPaymentFlagged dipanggil manual dari
-- action), tapi bell in-app tidak."
--
-- Three gaps, all closed by ONE new trigger function below (same
-- "single function, several branches on the transition" shape
-- notify_on_order_status_change, 0032, already uses for the orders
-- table's own status machine):
--
--   1. pending_payment -> payment_submitted (client called
--      submit_installment_payment, 0038) -> notify STAFF. This is the
--      literal gap #11 names first — today an admin only finds out an
--      installment needs review by opening /orders and looking, or via
--      Discord's #payment-verification channel; the in-app bell stays
--      silent. Mirrors notify_on_order_status_change's existing
--      'payment_submitted' branch for whole orders.
--
--   2. payment_submitted -> paid (admin called
--      verifyInstallmentPaymentAction) -> notify the CLIENT that THIS
--      installment was verified. This is deliberately a NEW, separate
--      notification from the one handle_installment_paid (0038) already
--      sends on the exact same transition ("Next installment is ready",
--      type 'order_installment_due') — that one only fires when there
--      IS a next 'scheduled' installment, and even then it announces the
--      NEXT milestone, never confirms the one that just cleared. A
--      client who just paid the LAST installment (no next one) currently
--      gets no in-app confirmation at all that their payment landed.
--      Both notifications are legitimate and not duplicates of each
--      other — this migration only adds the missing one.
--
--   3. payment_submitted -> pending_payment WITH a payment_underpaid_note
--      set (admin called flagUnderpaidInstallmentAction) -> notify the
--      CLIENT their payment needs to be resubmitted. Mirrors
--      notify_on_order_status_change's existing
--      "awaiting_payment and old.status = 'payment_submitted'" branch for
--      whole orders (the legacy full-payment flow's equivalent flag).
--      Guarded on payment_underpaid_note being non-null (rather than just
--      the bare status transition) because
--      submit_installment_payment/handle_installment_paid never produce
--      a payment_submitted -> pending_payment transition themselves — the
--      note is what actually distinguishes "admin flagged this" from any
--      other path that could theoretically land here.
--
-- Deliberately a SEPARATE trigger from handle_installment_paid (0038),
-- not a rewrite of it — that function does load-bearing business logic
-- (unlocking the next installment, flipping the parent order to 'paid')
-- that this migration has no reason to touch. Postgres fires both
-- triggers on the same UPDATE event without conflict; this one is
-- notification-only, mirrors the "hang a trigger off the write that
-- already happens" philosophy 0032's own header comment documents, and
-- needs zero changes to any apps/admin or apps/app server action file —
-- only the bell's read-side icon metadata
-- (apps/admin + apps/app's app/lib/notifications.ts) needs a matching
-- update, done in the same batch as this migration.
--
-- No schema change — reuses the existing `notifications` table (0004),
-- notify_staff()/notify_client_by_client_id() helpers (0032), and
-- order_installments (0038). Purely additive: a new trigger function +
-- a new trigger. Safe to run standalone; requires 0032 and 0038 to
-- already be applied (both confirmed APPLIED, see
-- verify_migrations_status.sql).
-- ============================================================

create or replace function public.notify_on_installment_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_client_id uuid;
  v_order_code text;
  v_milestone_label text;
begin
  if new.status = old.status then
    return new;
  end if;

  select client_id into v_client_id from public.orders where id = new.order_id;
  v_order_code := 'ORD-' || upper(substring(new.order_id::text from 1 for 8));
  v_milestone_label := 'Milestone ' || new.sequence || ' (' || new.label || ') of ' || v_order_code;

  if new.status = 'payment_submitted' and old.status = 'pending_payment' then
    perform public.notify_staff(
      'order_installment_submitted', 'Installment payment submitted',
      v_milestone_label || ' is waiting for verification.', '/orders'
    );
  elsif new.status = 'paid' and old.status = 'payment_submitted' then
    perform public.notify_client_by_client_id(
      v_client_id, 'order_installment_verified', 'Installment verified',
      v_milestone_label || ' has been verified. Thank you!', '/dashboard/orders'
    );
  elsif new.status = 'pending_payment' and old.status = 'payment_submitted' and new.payment_underpaid_note is not null then
    perform public.notify_client_by_client_id(
      v_client_id, 'order_installment_flagged', 'Installment payment needs attention',
      v_milestone_label || ' could not be verified: ' || new.payment_underpaid_note,
      '/dashboard/orders'
    );
  end if;

  return new;
end;
$$;

drop trigger if exists order_installments_notify_after_status_change on public.order_installments;

create trigger order_installments_notify_after_status_change
  after update on public.order_installments
  for each row execute function public.notify_on_installment_status_change();
