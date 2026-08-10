-- ============================================================
-- 0031: seed the new "Game MVP" service (10 Agst 2026 repricing —
-- "ATURAN PRICING NIMIA STUDIO 2026" brief, item 26).
--
-- Game MVP is a NEW /order catalog service, distinct from "Prototype"
-- (00000000-0000-4000-8000-000000000019, seeded in 0018): Prototype is a
-- proof-of-concept to test an idea, Game MVP is a more complete playable
-- product with core gameplay. See
-- apps/studio/modules/order/data/categories/game-development.ts for the
-- matching TypeScript ServiceDefinition (id: "game-mvp") — same fixed uuid
-- convention as 0018 (next id in the existing …0001–…0020 sequence).
--
-- base_price is in PLAIN USD NUMBERS, matching 0018's convention — 900 is
-- Game MVP's cheapest ("Basic") scope tier.
--
-- Must run after 0017 (needs the 'game_development' service_category
-- value) and after 0018 (this is additive to that seed, not a replacement
-- — written with the same idempotent "insert if this id doesn't already
-- exist" pattern so re-running it is safe).
-- ============================================================

insert into public.services (id, name, category, description, base_price)
select v.id, v.name, v.category, v.description, v.base_price
from (
  values
    (
      '00000000-0000-4000-8000-000000000021'::uuid,
      'Game MVP',
      'game_development'::public.service_category,
      'A playable minimum viable game built to validate your core gameplay, mechanics, and concept.',
      900::numeric
    )
) as v(id, name, category, description, base_price)
where not exists (
  select 1 from public.services s where s.id = v.id
);
