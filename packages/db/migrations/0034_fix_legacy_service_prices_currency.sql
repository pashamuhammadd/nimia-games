-- ============================================================
-- 0034: convert 0008_seed_services.sql's legacy `services` rows from IDR
-- to USD, so `base_price` is consistently USD across the WHOLE table.
--
-- 0018's own header comment already flagged this exact inconsistency:
-- 0008 seeded the 9 old Order-Service-form categories (3d_animation,
-- 2d_animation, game_trailer, product_visualization, motion_graphics,
-- logo_animation, game_asset, ui_animation, custom_project) with
-- base_price in RAW IDR (e.g. 5000000 = Rp5.000.000), while 0018 seeded
-- the 4 live /order categories in plain USD numbers (100, 800, 1500...).
-- apps/admin's Services page (ServicesList.tsx) rendered the two groups
-- with two different Intl currency formatters (id-ID/IDR vs en-US/USD) to
-- paper over this — user (11 Agustus 2026) correctly flagged that as
-- wrong: the admin app should show dollars everywhere, not Rupiah for a
-- subset of rows. Fixing at the DATA layer here (one-time conversion),
-- not just the display layer, so a future admin who edits one of these
-- prices types a real USD number and it round-trips correctly — a
-- display-only fix (e.g. dividing by an exchange rate only when
-- rendering) would have silently mis-converted any NEW price an admin
-- typed in after this ships.
--
-- 0008's own comment already called these "placeholder starting values...
-- adjust to your real pricing before going live", and 0018/ServicesList.tsx
-- both already document these 9 rows as legacy/unused (the old Order
-- Service form that read them is dead code, not linked from anywhere
-- live — see apps/studio/app/dashboard/orders/OrderForm.tsx on the P2
-- cleanup list). So exact precision doesn't matter; this uses an
-- approximate ~15,800 IDR/USD conversion, rounded to clean dollar
-- figures, preserving the SAME relative ordering the original IDR prices
-- had (Logo Animation cheapest -> Game Trailer priciest).
--
-- Idempotent: plain UPDATEs by name+category, safe to re-run (sets the
-- same value again, doesn't compound).
-- ============================================================

update public.services set base_price = 95   where name = 'Logo Animation'          and category = 'logo_animation'::public.service_category;
update public.services set base_price = 160  where name = 'UI Animation'            and category = 'ui_animation'::public.service_category;
update public.services set base_price = 190  where name = 'Motion Graphics'         and category = 'motion_graphics'::public.service_category;
update public.services set base_price = 220  where name = '2D Animation'            and category = '2d_animation'::public.service_category;
update public.services set base_price = 250  where name = 'Product Visualization'   and category = 'product_visualization'::public.service_category;
update public.services set base_price = 285  where name = 'Game Asset'              and category = 'game_asset'::public.service_category;
update public.services set base_price = 320  where name = '3D Animation'            and category = '3d_animation'::public.service_category;
update public.services set base_price = 475  where name = 'Game Trailer'            and category = 'game_trailer'::public.service_category;
-- 'Custom Project' already has base_price = null ("Custom pricing"), nothing to convert.
