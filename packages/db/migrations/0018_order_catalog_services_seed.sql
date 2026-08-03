-- ============================================================
-- 0018: seed `services` with the /order Project Configurator's full
-- catalog (32 services across Animation, Digital Assets, Website
-- Development, Game Development — see
-- apps/studio/modules/order/data/categories/*.ts, the single source of
-- truth this migration mirrors).
--
-- MUST run after 0017 has been committed on its own (separate "Run") —
-- this references the 4 new service_category values added there.
--
-- Ids are EXPLICIT fixed uuids, not gen_random_uuid() — the TypeScript
-- catalog hardcodes the exact same uuids (each ServiceDefinition's new
-- `dbServiceId` field) so the app can insert a real `orders.service_id`
-- without querying `services` by name at submit time. If you ever add a
-- new service to the TS catalog, add its matching row here with the same
-- convention (increment the last hex segment) — the two are meant to stay
-- in lockstep by hand, there's no codegen linking them.
--
-- base_price is in PLAIN USD NUMBERS (100, 800, 1500, ...), matching the
-- TS catalog's `startingPrice` / cheapest package price and the app's own
-- `_usd`-suffixed columns (orders.proposed_price_usd, final_price_usd).
-- NOTE: this is NOT the same unit as 0008_seed_services.sql's rows, which
-- store base_price in IDR (e.g. 5000000) — that inconsistency already
-- existed between the old Order Service form and the new /order
-- configurator's pricing model before this migration; flagging it here
-- rather than silently leaving it undocumented. Revisit if `services`
-- ever needs a real currency column.
--
-- Written as an idempotent "insert if this id doesn't already exist" (same
-- pattern as 0008) so re-running this file after editing prices elsewhere
-- won't duplicate or clobber rows.
-- ============================================================

insert into public.services (id, name, category, description, base_price)
select v.id, v.name, v.category, v.description, v.base_price
from (
  values
    -- Animation
    ('00000000-0000-4000-8000-000000000001'::uuid, 'GIF / Sticker', 'animation'::public.service_category, 'Loopable animated GIFs and sticker packs.', 100::numeric),
    ('00000000-0000-4000-8000-000000000002'::uuid, 'Character Animation', 'animation'::public.service_category, 'Expressive rigged character performance for any scene.', 100::numeric),
    ('00000000-0000-4000-8000-000000000003'::uuid, 'Game Animation', 'animation'::public.service_category, 'Idle, walk, attack, and combo cycles ready to import.', 150::numeric),
    ('00000000-0000-4000-8000-000000000004'::uuid, 'Trailer', 'animation'::public.service_category, 'Cinematic trailers for games, apps, and launches.', 300::numeric),
    ('00000000-0000-4000-8000-000000000005'::uuid, 'Story Animation', 'animation'::public.service_category, 'Narrative short-form animation with multiple scenes.', 200::numeric),
    ('00000000-0000-4000-8000-000000000006'::uuid, 'Motion Graphic', 'animation'::public.service_category, 'Kinetic type and graphic motion for ads and intros.', 120::numeric),
    ('00000000-0000-4000-8000-000000000007'::uuid, 'UI Animation', 'animation'::public.service_category, 'Micro-interactions and screen transitions for apps.', 90::numeric),
    ('00000000-0000-4000-8000-000000000008'::uuid, 'Logo Animation', 'animation'::public.service_category, 'A signature motion reveal for your brand mark.', 60::numeric),
    ('00000000-0000-4000-8000-000000000009'::uuid, 'Explainer Animation', 'animation'::public.service_category, 'Clear, friendly animation that explains your product.', 250::numeric),
    -- Digital Assets
    ('00000000-0000-4000-8000-00000000000a'::uuid, 'Game Icons', 'digital_assets'::public.service_category, 'A cohesive icon set for items, skills, or UI.', 80::numeric),
    ('00000000-0000-4000-8000-00000000000b'::uuid, 'UI Kit', 'digital_assets'::public.service_category, 'A consistent screen and component library for your app.', 200::numeric),
    ('00000000-0000-4000-8000-00000000000c'::uuid, 'Sprite Sheet', 'digital_assets'::public.service_category, 'Frame-by-frame sprite sheets ready for any engine.', 90::numeric),
    ('00000000-0000-4000-8000-00000000000d'::uuid, 'Character Design', 'digital_assets'::public.service_category, 'Original character concept art, front to back.', 150::numeric),
    ('00000000-0000-4000-8000-00000000000e'::uuid, 'Environment Assets', 'digital_assets'::public.service_category, 'Backgrounds and scene props for games or animation.', 180::numeric),
    ('00000000-0000-4000-8000-00000000000f'::uuid, 'Tileset', 'digital_assets'::public.service_category, 'Seamless tile sets for building your game''s world.', 100::numeric),
    ('00000000-0000-4000-8000-000000000010'::uuid, 'NFT Artwork', 'digital_assets'::public.service_category, 'Layered collectible art, ready for generative traits.', 150::numeric),
    ('00000000-0000-4000-8000-000000000011'::uuid, 'Illustration', 'digital_assets'::public.service_category, 'Custom illustrations for covers, scenes, or marketing.', 70::numeric),
    ('00000000-0000-4000-8000-000000000012'::uuid, 'Banner', 'digital_assets'::public.service_category, 'Web and store banners sized for every placement.', 60::numeric),
    ('00000000-0000-4000-8000-000000000013'::uuid, 'Thumbnail', 'digital_assets'::public.service_category, 'Scroll-stopping thumbnails for video and store listings.', 50::numeric),
    -- Website Development
    ('00000000-0000-4000-8000-000000000014'::uuid, 'Landing Page', 'website_development'::public.service_category, 'A single, high-converting page for a launch or campaign.', 150::numeric),
    ('00000000-0000-4000-8000-000000000015'::uuid, 'Company Website', 'website_development'::public.service_category, 'A complete, professional site for your business.', 250::numeric),
    ('00000000-0000-4000-8000-000000000016'::uuid, 'Dashboard', 'website_development'::public.service_category, 'A data dashboard for monitoring and managing operations.', 400::numeric),
    ('00000000-0000-4000-8000-000000000017'::uuid, 'Admin Panel', 'website_development'::public.service_category, 'Internal tooling to manage your product''s data and users.', 350::numeric),
    ('00000000-0000-4000-8000-000000000018'::uuid, 'SaaS', 'website_development'::public.service_category, 'A full multi-tenant product, from onboarding to billing.', 800::numeric),
    -- Game Development
    ('00000000-0000-4000-8000-000000000019'::uuid, 'Prototype', 'game_development'::public.service_category, 'A playable proof-of-concept to test your core idea.', 300::numeric),
    ('00000000-0000-4000-8000-00000000001a'::uuid, 'Mobile Game', 'game_development'::public.service_category, 'A complete game built for iOS and Android.', 800::numeric),
    ('00000000-0000-4000-8000-00000000001b'::uuid, 'HTML5 Game', 'game_development'::public.service_category, 'A lightweight browser game, playable anywhere.', 500::numeric),
    ('00000000-0000-4000-8000-00000000001c'::uuid, 'PC Game', 'game_development'::public.service_category, 'A full-scale desktop title built for Windows/macOS.', 1500::numeric),
    ('00000000-0000-4000-8000-00000000001d'::uuid, 'Web3 Game', 'game_development'::public.service_category, 'A game with on-chain assets and wallet-based ownership.', 1200::numeric),
    ('00000000-0000-4000-8000-00000000001e'::uuid, 'Backend', 'game_development'::public.service_category, 'Server infrastructure to power your game''s live features.', 600::numeric),
    ('00000000-0000-4000-8000-00000000001f'::uuid, 'LiveOps', 'game_development'::public.service_category, 'Tools to run, monitor, and tune your game after launch.', 400::numeric),
    ('00000000-0000-4000-8000-000000000020'::uuid, 'Game Optimization', 'game_development'::public.service_category, 'Performance tuning for a smoother, faster-loading game.', 250::numeric)
) as v(id, name, category, description, base_price)
where not exists (
  select 1 from public.services s where s.id = v.id
);
