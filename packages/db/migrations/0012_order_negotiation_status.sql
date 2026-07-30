-- ============================================================
-- 0012: extend order_status for the negotiation + crypto payment flow
--
-- Old flow: pending_review -> quotation_sent -> converted (or rejected).
-- New flow (docs/ARCHITECTURE.md section 4):
--   pending_review -> negotiating -> awaiting_payment -> payment_submitted
--   -> paid -> converted (or rejected at any point before paid).
--
-- 'quotation_sent' is NOT removed (dropping an enum value that existing
-- rows might use is unsafe) but is no longer produced by new orders going
-- forward — apps/admin's order actions move pending_review straight into
-- 'negotiating' instead (see app/(protected)/orders/actions.ts, Phase 3).
--
-- IMPORTANT — same rule as 0011: run this file BY ITSELF, separately from
-- 0013, which references these new values.
-- ============================================================

alter type public.order_status add value 'negotiating';
alter type public.order_status add value 'awaiting_payment';
alter type public.order_status add value 'payment_submitted';
alter type public.order_status add value 'paid';
