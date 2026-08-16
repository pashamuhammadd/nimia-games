-- ============================================================================
-- Nimia Studio — Migration status report
--
-- WHAT THIS IS: a single, 100% read-only query you can paste into the
-- Supabase Dashboard → SQL Editor and run any time you need to double-check
-- which of packages/db/migrations/*.sql have actually been applied to THIS
-- database. It does not run, skip, or fix any migration — it only inspects
-- pg_catalog/information_schema for a distinguishing object (a column,
-- function, trigger, table, or — for 0034 — an actual data value) that each
-- migration creates, and reports APPLIED or MISSING for each one.
--
-- WHY THIS EXISTS: as of 15 Agustus 2026 there was no single source of
-- truth for "which of the 42 migration files in packages/db/migrations
-- are actually live in production" — status was being reconstructed from
-- memory/chat history, which is exactly how gaps like 0034 (the
-- Rupiah->USD price fix) go unnoticed. Supabase's CLI migration tracking
-- isn't in use here (migrations are run by hand, one .sql file at a time,
-- in the SQL Editor) — this script is the lightweight alternative: no new
-- infrastructure, nothing to configure, just run it.
--
-- SCOPE: covers 0028 through 0042 — the later half of the migration
-- history, which is exactly the range the 15 Agustus 2026 platform audit
-- flagged as "not certain to have run" (0001-0027 have been exercised by
-- the live app for weeks and are not re-checked here). If you ever doubt
-- an earlier migration too, the same EXISTS-check pattern below extends
-- to any migration file — just add a row.
--
-- HOW TO USE:
--   1. Open Supabase Dashboard → SQL Editor → New query.
--   2. Paste this whole file, click Run.
--   3. Read the `status` column. Any row that is NOT "APPLIED" means: open
--      that exact migration file from packages/db/migrations/, paste ITS
--      contents into a new SQL Editor query, and run it (all migrations in
--      this repo are written to be idempotent / safe to re-run).
--   4. Re-run THIS script afterward to confirm it flipped to APPLIED.
--
-- Safe to run as often as you like — it only ever SELECTs.
-- ============================================================================

select
  migration_no,
  migration,
  status,
  note
from (
  values
    -- ------------------------------------------------------------------
    -- Prerequisites for the migrations below (checked first so a MISSING
    -- here explains a cascade of MISSING further down).
    -- ------------------------------------------------------------------
    (28, '0028_partner_admin_directory',
      case when exists (
        select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public' and p.proname = 'get_all_partners_admin'
      ) then 'APPLIED' else 'MISSING' end,
      'Admin partner directory RPC. Prerequisite for 0030.'),

    (29, '0029_auto_create_project_on_paid',
      case when exists (
        select 1 from pg_trigger where tgname = 'orders_create_project_after_paid'
      ) then 'APPLIED' else 'MISSING' end,
      'Auto-creates a project row when an order is marked paid.'),

    -- ------------------------------------------------------------------
    -- The 7-8 critical/uncertain ones the audit flagged.
    -- ------------------------------------------------------------------
    (30, '0030_partner_page_signup_bonus',
      case when exists (
        select 1 from information_schema.columns
        where table_schema = 'public' and table_name = 'partners'
          and column_name = 'joined_via_partner_page'
      ) then 'APPLIED' else 'MISSING' end,
      'Gold-floor commission for /partners-page signups. NOTE: this migration failed on its first run (error 42P13) — if you only ran it once before that fix was sent, re-run the CURRENT file in packages/db/migrations/.'),

    (31, '0031_game_mvp_service_seed',
      case when exists (
        select 1 from public.services where id = '00000000-0000-4000-8000-000000000021'::uuid
      ) then 'APPLIED' else 'MISSING' end,
      'Seeds the "Game MVP" /order catalog service ($900 starting).'),

    (32, '0032_notifications',
      case when exists (
        select 1 from pg_trigger where tgname = 'orders_notify_staff_after_insert'
      ) then 'APPLIED' else 'MISSING' end,
      'In-app notification bell (studio + admin). Prerequisite for 0037.'),

    (33, '0033_partner_reward_withdrawals',
      case when exists (
        select 1 from information_schema.tables
        where table_schema = 'public' and table_name = 'partner_withdrawal_requests'
      ) then 'APPLIED' else 'MISSING' end,
      'Partner reward WITHDRAW system (request/approve/reject RPCs + table).'),

    (34, '0034_fix_legacy_service_prices_currency',
      case
        when not exists (select 1 from public.services where name = 'Logo Animation')
          then 'CANNOT VERIFY (row not found)'
        when (select base_price from public.services where name = 'Logo Animation' and category = 'logo_animation'::public.service_category limit 1) = 95
          then 'APPLIED'
        else 'MISSING — prices likely still in raw IDR (millions)'
      end,
      'MOST CRITICAL: converts 8 legacy service prices from raw IDR to USD. This is a data check, not a schema check — it reads the actual current price.'),

    (35, '0035_discord_partner_gamification',
      case when exists (
        select 1 from information_schema.tables
        where table_schema = 'public' and table_name = 'discord_leaderboard_state'
      ) then 'APPLIED' else 'MISSING' end,
      'Discord Partner Program leaderboard/gamification. Never confirmed run in any prior session — verify this one first if unsure.'),

    (36, '0036_order_package_name',
      case when exists (
        select 1 from information_schema.columns
        where table_schema = 'public' and table_name = 'orders' and column_name = 'package_name'
      ) then 'APPLIED' else 'MISSING' end,
      'Package/Bundle orders show their real name instead of "Custom Project".'),

    (37, '0037_notify_order_converted',
      case when exists (
        select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public' and p.proname = 'notify_on_order_status_change'
          and pg_get_functiondef(p.oid) ilike '%Project started%'
      ) then 'APPLIED' else 'MISSING' end,
      'Notifies client when an order is converted straight to a project.'),

    (38, '0038_custom_order_installments',
      case when exists (
        select 1 from information_schema.tables
        where table_schema = 'public' and table_name = 'order_installments'
      ) then 'APPLIED' else 'MISSING' end,
      'FOUNDATION FOR CUSTOM ORDER + PAYMENT PLAN: order_installments/order_service_selections/order_price_breakdown tables, installment RPCs. Must run after 0016, 0020, 0032.'),

    -- 0039 is intentionally NOT checked here: it was fully superseded by
    -- 0040 (the "AI Client Hunter" -> "AI Prospect Hunter" rewrite), whose
    -- own file drops 0039's objects before recreating the new schema. If
    -- 0040 is APPLIED below, 0039's status is irrelevant.
    (40, '0040_ai_prospect_hunter',
      case when exists (
        select 1 from information_schema.tables
        where table_schema = 'public' and table_name = 'ai_projects'
      ) then 'APPLIED' else 'MISSING' end,
      'AI Prospect Hunter (CoinGecko-based). Supersedes/replaces 0039 — do not run 0039 separately.'),

    (41, '0041_creative_agent_sessions',
      case when exists (
        select 1 from information_schema.tables
        where table_schema = 'public' and table_name = 'creative_agent_sessions'
      ) then 'APPLIED' else 'MISSING' end,
      'Nimia Creative Agent homepage conversation sessions.'),

    (42, '0042_creative_agent_assets_and_orders',
      case when exists (
        select 1 from information_schema.columns
        where table_schema = 'public' and table_name = 'creative_agent_sessions'
          and column_name = 'order_id'
      ) then 'APPLIED' else 'MISSING' end,
      'Adds uploaded_assets + order_id to creative_agent_sessions. Requires 0041 first.'),

    -- ------------------------------------------------------------------
    -- Fase 1/2 of the 16 Agustus 2026 Order/Payment/Invoice refactor.
    -- ------------------------------------------------------------------
    (43, '0043_order_payment_summary',
      case when exists (
        select 1 from pg_type where typname = 'order_payment_status'
      ) then 'APPLIED' else 'MISSING' end,
      'get_order_payment_summary() RPC + order_payment_status enum — the fix for installment orders'' invoices showing the full price instead of what was actually paid.'),

    (44, '0044_invoice_architecture_cleanup',
      case
        when exists (
          select 1 from information_schema.tables where table_schema = 'public' and table_name = 'invoices'
        ) then 'MISSING — dead invoices/invoice_items/payments/receipts trio (0005) still present'
        when not exists (
          select 1 from information_schema.columns
          where table_schema = 'public' and table_name = 'order_receipts' and column_name = 'installment_id'
        ) then 'MISSING — order_receipts not yet extended with installment_id/amount_usd'
        else 'APPLIED'
      end,
      'Drops the dead 0005 billing trio + invoice_status/payment_status enums; extends order_receipts for per-installment receipts; redesigns get_or_create_order_receipt(order_id, installment_id).'),

    (45, '0045_project_status_simplify',
      case when exists (
        select 1 from pg_enum e join pg_type t on t.oid = e.enumtypid
        where t.typname = 'project_status' and e.enumlabel = 'in_production'
      ) then 'APPLIED' else 'MISSING' end,
      'Simplifies project_status 10->7 (new/approved/in_production/revision/ready_for_delivery/completed/cancelled), kept deliberately separate from order_payment_status (0043). Redefines orders_create_project_on_paid (0029) + notify_on_project_status_change (0032) to match.')

) as report(migration_no, migration, status, note)
order by migration_no;
