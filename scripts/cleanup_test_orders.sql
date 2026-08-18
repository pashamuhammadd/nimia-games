-- ============================================================================
-- Nimia Studio — Wipe ALL order/project test data
--
-- WHAT THIS DOES: deletes every row in `orders` and `projects`, plus
-- everything that hangs off them (installments, receipts, negotiations,
-- attachments, service selections, price breakdowns, voucher redemptions,
-- partner rewards, project updates/messages/files). Written 18 Agustus
-- 2026 after a full end-to-end click-test of the cicilan (installment)
-- flow left real-but-fake orders/projects/receipts/partner-reward rows in
-- the database — this clears all of that in one go so the next real
-- client order starts from a clean slate.
--
-- WHY THIS SHAPE: `orders.id` cascades (ON DELETE CASCADE) to most of its
-- children automatically — order_files, order_negotiations,
-- order_installments, order_service_selections, order_price_breakdown,
-- order_receipts, voucher_redemptions, partner_rewards — so a single
-- `delete from orders` handles all of those for free. The one exception
-- is `projects.order_id`, which is ON DELETE SET NULL (a project is
-- allowed to outlive its originating order, or exist without one at all
-- — see 0003_orders_projects.sql's own comment), so projects need an
-- EXPLICIT second delete. Deleting `projects` in turn cascades to
-- `project_updates`, `project_files`, and `messages`.
--
-- NOT touched (deliberately — these are NOT "order data"):
--   - clients / users — real accounts, never touched by this script.
--   - vouchers — the voucher DEFINITIONS survive; only redemption
--     records (which reference a specific order) are cascade-deleted.
--   - creative_agent_sessions — its order_id column is ON DELETE SET
--     NULL (0042), so a Creative Agent chat session survives with its
--     order link cleared, rather than being deleted outright — the
--     conversation itself isn't "order data".
--   - notifications — free-text `link` field, no FK to orders/projects
--     at all, so nothing here can dangle. A handful of old bell
--     notifications may still reference a now-deleted order/project by
--     URL; clicking one just 404s, same as any other stale link. Not
--     cleaned here since it's cosmetic, not a data-integrity issue — ask
--     if you also want notifications truncated.
--
-- ONLY does DELETEs against these 2 root tables + whatever cascades from
-- them — never touches DDL (no DROP/TRUNCATE/ALTER), so table structure,
-- sequences, RLS policies, and triggers are all completely unaffected.
--
-- Wrapped in an explicit transaction so you can inspect the row counts
-- below BEFORE anything commits — if the "will delete" counts look wrong
-- (e.g. way more than you expect, meaning real client data may have come
-- in since this script was written), run ROLLBACK instead of COMMIT.
--
-- HOW TO USE:
--   1. Paste this whole file into Supabase Dashboard -> SQL Editor.
--   2. Run it. Read the NOTICE lines it prints (counts about to be
--      deleted) and the final SELECT (should show every count as 0).
--   3. If everything looks right, run: COMMIT;
--      If anything looks wrong, run: ROLLBACK;
--      (Supabase's SQL Editor does NOT auto-commit a transaction you
--      opened with BEGIN — it stays open until you explicitly say
--      COMMIT or ROLLBACK, even across separate query runs in the same
--      session/tab.)
-- ============================================================================

begin;

do $$
declare
  v_orders_count int;
  v_projects_count int;
begin
  select count(*) into v_orders_count from public.orders;
  select count(*) into v_projects_count from public.projects;
  raise notice 'About to delete % order(s) and % project(s), plus everything that cascades from them.', v_orders_count, v_projects_count;
end $$;

-- Deleting `orders` first cascades away: order_files, order_negotiations,
-- order_installments, order_service_selections, order_price_breakdown,
-- order_receipts, voucher_redemptions, partner_rewards.
delete from public.orders;

-- `projects.order_id` is SET NULL (not cascade) on order delete, so any
-- project row survives the delete above — this second delete is what
-- actually clears it, and cascades away: project_updates, project_files,
-- messages.
delete from public.projects;

-- Final verification — every count below should read 0. If anything is
-- non-zero, something didn't cascade as expected; ROLLBACK and investigate
-- rather than committing a half-finished cleanup.
select
  (select count(*) from public.orders) as orders,
  (select count(*) from public.projects) as projects,
  (select count(*) from public.order_files) as order_files,
  (select count(*) from public.order_negotiations) as order_negotiations,
  (select count(*) from public.order_installments) as order_installments,
  (select count(*) from public.order_service_selections) as order_service_selections,
  (select count(*) from public.order_price_breakdown) as order_price_breakdown,
  (select count(*) from public.order_receipts) as order_receipts,
  (select count(*) from public.voucher_redemptions) as voucher_redemptions,
  (select count(*) from public.partner_rewards) as partner_rewards,
  (select count(*) from public.project_updates) as project_updates,
  (select count(*) from public.project_files) as project_files,
  (select count(*) from public.messages) as messages;

-- Everything above ran inside the transaction opened by `begin;` and is
-- NOT permanent yet. Review the NOTICE line and the all-zero SELECT
-- above, then explicitly run ONE of:
--
--   COMMIT;      -- makes the deletion permanent
--   ROLLBACK;    -- undoes everything above, database unchanged
