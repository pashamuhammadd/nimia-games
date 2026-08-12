-- ============================================================
-- 0012: extend order_status for the negotiation + crypto payment flow
--
-- Old flow: pending_review -> quotation_sent -> converted (or rejected).
-- New flow (docs/ARCHITECTURE.md section 4):
--   pending_review -> negotiating -> awaiting_payment -> payment_submitted
--   -> paid -> converted (or rejected at any point before paid).
--
-- 'quotation_sent' is NOT removed (dropping an enum value that existing
-- rows might use is unsafe).
--
-- CORRECTION (12 Agustus 2026, order-flow audit) — this comment originally
-- said 'quotation_sent' was "no longer produced by new orders going
-- forward", on the assumption every order would move through
-- 'negotiating' instead. That did not end up being how apps/admin's order
-- actions actually shipped: approveOrderAction (Approve & Send Quotation,
-- pending_review -> quotation_sent) is still the live path for every
-- direct (non-"Negotiate Price") order — see
-- app/(protected)/orders/actions.ts. Only a client explicitly clicking
-- "Negotiate Price" on /order produces 'negotiating' directly (see
-- apps/studio/modules/order/state/submit-order-action.ts). Both are
-- normal, currently-used statuses; don't treat 'quotation_sent' as
-- legacy/dead when reading this schema.
--
-- IMPORTANT — same rule as 0011: run this file BY ITSELF, separately from
-- 0013, which references these new values.
-- ============================================================

alter type public.order_status add value 'negotiating';
alter type public.order_status add value 'awaiting_payment';
alter type public.order_status add value 'payment_submitted';
alter type public.order_status add value 'paid';
