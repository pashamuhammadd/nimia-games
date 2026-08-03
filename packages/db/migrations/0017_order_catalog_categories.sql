-- ============================================================
-- 0017: extend service_category for the /order Project Configurator
--
-- The original service_category enum (0001) was built around the old
-- Order Service form's specific categories (3d_animation, game_trailer,
-- etc.) — it has no value that represents the /order module's own 4
-- top-level categories (Animation, Digital Assets, Website Development,
-- Game Development; see apps/studio/modules/order/data/categories/*.ts).
-- Adding these 4 new BROAD values rather than one narrow value per
-- individual service (there are 32) keeps `category` usable for coarse
-- filtering/reporting, while the specific service name/id already lives on
-- `name` and the fixed uuid inserted in 0018.
--
-- The old narrow values (3d_animation, 2d_animation, ...) are untouched —
-- existing rows from 0008_seed_services.sql keep using them, nothing is
-- migrated or removed.
--
-- IMPORTANT — same rule as 0011/0012: run this file BY ITSELF, separately
-- from 0018, which references these new values. Postgres does not allow a
-- newly-added enum value to be used in the SAME transaction that added it.
-- ============================================================

alter type public.service_category add value 'animation';
alter type public.service_category add value 'digital_assets';
alter type public.service_category add value 'website_development';
alter type public.service_category add value 'game_development';
