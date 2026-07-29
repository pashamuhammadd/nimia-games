-- ============================================================
-- 0008: seed the `services` catalog
--
-- The Order Service form (Tahap 4) needs at least one row per
-- service_category enum value (0001) to populate its service dropdown.
-- Written as an idempotent "insert if the name doesn't already exist"
-- so re-running this file after you've edited prices in the dashboard
-- later won't create duplicates or clobber your edits.
-- Adjust name/description/base_price to your real pricing before going
-- live — these are placeholder starting values.
-- ============================================================

insert into public.services (name, category, description, base_price)
select v.name, v.category, v.description, v.base_price
from (
  values
    ('3D Animation', '3d_animation'::public.service_category,
      'Animasi 3D untuk karakter, produk, atau cinematic.', 5000000::numeric),
    ('2D Animation', '2d_animation'::public.service_category,
      'Animasi 2D untuk explainer video, karakter, atau konten sosial media.', 3500000::numeric),
    ('Game Trailer', 'game_trailer'::public.service_category,
      'Trailer sinematik untuk peluncuran atau promosi game.', 7500000::numeric),
    ('Product Visualization', 'product_visualization'::public.service_category,
      'Render 3D fotorealistik untuk produk fisik maupun digital.', 4000000::numeric),
    ('Motion Graphics', 'motion_graphics'::public.service_category,
      'Motion graphics untuk iklan, intro, dan konten promosi.', 3000000::numeric),
    ('Logo Animation', 'logo_animation'::public.service_category,
      'Animasi logo untuk intro brand/channel.', 1500000::numeric),
    ('Game Asset', 'game_asset'::public.service_category,
      'Pembuatan asset 2D/3D untuk kebutuhan game (karakter, environment, prop).', 4500000::numeric),
    ('UI Animation', 'ui_animation'::public.service_category,
      'Animasi UI/UX untuk aplikasi, website, atau game.', 2500000::numeric),
    ('Custom Project', 'custom_project'::public.service_category,
      'Proyek kustom di luar kategori di atas — diskusikan detail via form ini.', null)
) as v(name, category, description, base_price)
where not exists (
  select 1 from public.services s where s.name = v.name
);
