-- ============================================================
-- 0052: animation portfolio gallery (portfolio.nimiastudio.com)
--
-- Extends the `portfolio` / `portfolio_categories` / `portfolio_tags` /
-- `portfolio_tag_map` tables that have existed since 0002 but were never
-- built on top of by any app — apps/studio/app/portfolio/data.ts (the
-- "Portfolio Preview" teaser) has always used a hardcoded TS array, not
-- this table, and no other app reads it. This migration is what turns the
-- long-planned `apps/portfolio` (portfolio.nimiastudio.com) into a real,
-- database-driven, Cloudinary-synced gallery instead of a static page.
--
-- Nothing here has ever been read/written by application code, so every
-- change below is a plain, safe ALTER — no backfill of real rows needed,
-- no other table/RPC/trigger references any of the columns being renamed
-- or dropped.
-- ============================================================

-- ------------------------------------------------------------------
-- portfolio: widen the schema to match the animation-portfolio spec
-- ------------------------------------------------------------------

-- `client_name` -> `client` (matches the PortfolioItem.client field the
-- frontend/admin UI use) and a new sibling `project` column (spec
-- distinguishes "client" from "project name", e.g. client "Lifetopia
-- World", project "Sunset Village").
alter table public.portfolio rename column client_name to client;
alter table public.portfolio add column project text;

-- `cloudinary_video_public_id` -> `cloudinary_public_id`: the primary
-- asset id, now general-purpose (video OR image, see resource_type below)
-- rather than video-only. `cloudinary_thumbnail_public_id` is kept as-is —
-- an OPTIONAL manually-chosen poster override; when null, the video proxy
-- route derives a poster automatically from the primary asset (so_0 frame
-- capture), exactly like apps/studio's existing /api/video/[id] route.
alter table public.portfolio rename column cloudinary_video_public_id to cloudinary_public_id;

-- Cloudinary's own resource type for the primary asset. Needed because a
-- single gallery now mixes video clips AND still images/GIFs (spec §2/§8),
-- which previously wasn't possible (the old schema assumed every row was a
-- video).
alter table public.portfolio
  add column resource_type text not null default 'video'
    check (resource_type in ('image', 'video'));

-- Display aspect-ratio bucket used by the grid/card/modal to lay out and
-- size each item (spec §8/§12) — 'gif' is its own bucket distinct from
-- aspect ratio (an animated GIF might be square OR landscape, but the
-- grid/card treats it as its own format filter per the brief's nav:
-- "ALL WORKS / 2D ANIMATION / GIFS & LOOPS / ... / 1:1 / 16:9 / 9:16").
alter table public.portfolio
  add column format text
    check (format in ('1:1', '16:9', '9:16', 'gif'));

-- Raw pixel dimensions from Cloudinary — used to derive `format` on
-- sync/upload and to reserve correct aspect-ratio boxes client-side
-- (prevents layout shift while thumbnails lazy-load).
alter table public.portfolio add column width integer;
alter table public.portfolio add column height integer;

-- Duration already existed as `duration_seconds` (0002) — kept as-is,
-- nullable for images. No rename needed.

-- Curation controls the spec explicitly asks for (§7 sort "Featured", §17
-- admin "featured"/"sort_order"/"status").
alter table public.portfolio add column featured boolean not null default false;
alter table public.portfolio add column sort_order integer not null default 0;

-- `status` replaces the old boolean `is_published` with the 3-state model
-- the spec asks for (draft / published / archived, §17). Backfill from the
-- old boolean, then drop it — nothing else in the codebase reads
-- `is_published` (this table has never been queried by app code before
-- this migration).
alter table public.portfolio
  add column status text not null default 'draft'
    check (status in ('draft', 'published', 'archived'));

update public.portfolio set status = 'published' where is_published = true;

drop policy if exists "portfolio_public_read_published" on public.portfolio;
alter table public.portfolio drop column is_published;

-- How a row entered the table — lets admin/UI distinguish hand-entered
-- rows from ones a Cloudinary sync/webhook created, and lets the sync
-- logic safely re-run without clobbering hand-edited metadata on rows it
-- didn't create (spec §15/§31).
alter table public.portfolio
  add column source text not null default 'manual'
    check (source in ('manual', 'cloudinary_sync'));

-- Full Cloudinary folder path at sync time (e.g.
-- "nimia-studio/animations/cinematic/featured") — kept for admin
-- troubleshooting ("why did this land in this category") and as the
-- provenance trail the spec's Cloudinary architecture section (§14)
-- expects, without forcing folder structure to be re-parsed from
-- `cloudinary_public_id` every time it's needed.
alter table public.portfolio add column cloudinary_folder text;

-- Cloudinary's own tags + context/structured metadata at sync time,
-- verbatim — never rendered to the public site, only used by the admin
-- Portfolio page to show "here's what Cloudinary sent us" when
-- troubleshooting a sync (spec §16's metadata association, kept
-- inspectable rather than silently discarded after being mapped onto the
-- typed columns above).
alter table public.portfolio add column cloudinary_metadata jsonb;

-- Idempotency key for the webhook/sync upsert (spec §15: "if a portfolio
-- asset is added ... it should automatically become available" — this is
-- what lets both the webhook and the manual "Sync from Cloudinary" button
-- safely upsert by public_id without ever creating duplicate rows for the
-- same Cloudinary asset).
create unique index portfolio_cloudinary_public_id_key
  on public.portfolio (cloudinary_public_id)
  where cloudinary_public_id is not null;

-- Query performance at the scale the spec targets (300 -> 1,000+ rows,
-- §2/§20): category/format filtering, status gate on every public read,
-- and the default "Latest"/"Featured" sort orders.
create index portfolio_status_idx on public.portfolio (status);
create index portfolio_category_id_idx on public.portfolio (category_id);
create index portfolio_format_idx on public.portfolio (format);
create index portfolio_featured_idx on public.portfolio (featured) where featured = true;
create index portfolio_sort_order_idx on public.portfolio (sort_order desc, created_at desc);

-- ------------------------------------------------------------------
-- RLS: same public-read-when-published / admin-write-everything shape as
-- every other catalog table (services, the old is_published policy) —
-- just re-pointed at `status` instead of the dropped `is_published`.
-- ------------------------------------------------------------------

create policy "portfolio_public_read_published" on public.portfolio
  for select using (status = 'published' or public.is_admin());

-- ------------------------------------------------------------------
-- Seed the category nav the spec's Portfolio Navigation section (§6)
-- describes. `on conflict do nothing` on the existing `slug` unique
-- constraint makes this safe to re-run. Admin can still add/rename/reorder
-- categories later via the portfolio_categories table itself (no code
-- changes required to add a new one — spec §15's "no manual frontend
-- edits per upload" applies to categories too).
-- ------------------------------------------------------------------

insert into public.portfolio_categories (name, slug) values
  ('2D Animation', '2d-animation'),
  ('GIFs & Loops', 'gifs-loops'),
  ('Cinematic', 'cinematic'),
  ('Long Form (30s+)', 'long-form'),
  ('Game Trailer', 'game-trailer'),
  ('Promotional', 'promotional'),
  ('Social', 'social')
on conflict (slug) do nothing;
