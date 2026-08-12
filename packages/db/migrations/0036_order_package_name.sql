-- ============================================================
-- 0036: orders.package_name — label for Package/Bundle orders
--
-- Bug found in the 12 Agustus 2026 order-flow audit: a Package/Bundle
-- order (Package/Bundle system, 10 Agustus 2026 — see
-- apps/studio/modules/order/state/submit-order-action.ts's isBundleOrder
-- branch) always inserts `orders.service_id = null`, because there is no
-- FK from a bundle package to `services` — the package's name/price only
-- ever lived inside the free-text `orders.description` (see
-- buildBundleDescription in that same file). Every place in the app that
-- shows "which service/package is this order for" reads services(name)
-- and falls back to a hardcoded "Custom Project" string when that embed
-- is null — which is exactly right for a genuinely custom/no-service
-- order, but WRONG for a bundle order: the receipt PDF
-- (apps/studio and apps/admin's app/api/orders/[id]/receipt/route.ts),
-- the admin Orders list/detail, and the client's own Orders list all
-- showed "Custom Project" for a $-paying package order instead of the
-- package's real name (e.g. "Web3 Launch Package").
--
-- Fix: a single nullable column, set once at submit time (never updated
-- after — same ledger-style "set once at insert" convention as
-- full_name/company_name/email/whatsapp/country right next to it in
-- 0003_orders_projects.sql, all snapshotted at order-submission time
-- rather than re-derived later). Null for every non-bundle order, exactly
-- like service_id is null only for bundle orders — the two are mutually
-- exclusive by construction (see submitOrderAction's isBundleOrder
-- branch), so call sites can safely do
-- `service?.name ?? order.package_name ?? "Custom Project"` and only ever
-- hit one of the two non-null cases.
-- ============================================================

alter table public.orders add column if not exists package_name text;

comment on column public.orders.package_name is
  'Set once at insert for Package/Bundle orders only (service_id is null for those) — the bundle package''s display name, e.g. "Web3 Launch Package". Null for every Project Builder / custom order, which use service_id instead. Never updated after insert.';
