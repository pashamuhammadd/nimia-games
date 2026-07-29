-- ============================================================
-- 0009: translate `services.description` to English
--
-- 0008 seeded the catalog with Indonesian descriptions (the `name` values
-- were already English). Since 0008 already ran against the live database,
-- re-running it won't touch existing rows (it's an insert-if-missing
-- migration matched by name) — so this is a separate UPDATE migration.
-- Written as plain UPDATE ... WHERE name = ..., safe to re-run any number
-- of times (idempotent by construction, not just by guard clause).
-- ============================================================

update public.services set description = '3D animation for characters, products, or cinematics.'
  where name = '3D Animation';

update public.services set description = '2D animation for explainer videos, characters, or social media content.'
  where name = '2D Animation';

update public.services set description = 'Cinematic trailers for game launches or promotions.'
  where name = 'Game Trailer';

update public.services set description = 'Photorealistic 3D renders for physical or digital products.'
  where name = 'Product Visualization';

update public.services set description = 'Motion graphics for ads, intros, and promotional content.'
  where name = 'Motion Graphics';

update public.services set description = 'Logo animation for brand/channel intros.'
  where name = 'Logo Animation';

update public.services set description = '2D/3D asset creation for games (characters, environments, props).'
  where name = 'Game Asset';

update public.services set description = 'UI/UX animation for apps, websites, or games.'
  where name = 'UI Animation';

update public.services set description = 'Custom project outside the categories above — discuss the details via this form.'
  where name = 'Custom Project';
