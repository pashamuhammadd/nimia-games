-- ============================================================
-- 0002: clients, service catalog, portfolio catalog
-- ============================================================

-- clients: 1:1 with a `users` row (role='client'). Company/contact info
-- collected on the Order Service form lives here so it doesn't need to be
-- re-entered on every order.
create table public.clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.users (id) on delete cascade,
  company_name text,
  whatsapp text,
  country text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_clients_updated_at
  before update on public.clients
  for each row execute function public.set_updated_at();

-- services: catalog shown on the Order Service page (3D Animation, Game
-- Trailer, etc). Admin-managed; publicly readable when active.
create table public.services (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category public.service_category not null,
  description text,
  base_price numeric(12, 2),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------------
-- portfolio (shared by apps/portfolio and apps/studio previews)
-- ------------------------------------------------------------------

create table public.portfolio_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique
);

create table public.portfolio_tags (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique
);

create table public.portfolio (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  category_id uuid references public.portfolio_categories (id) on delete set null,
  description text,
  client_name text,
  year integer,
  duration_seconds integer,
  -- Cloudinary public IDs, not full URLs — apps/portfolio builds the
  -- optimized thumbnail/video URL from these at render time.
  cloudinary_video_public_id text,
  cloudinary_thumbnail_public_id text,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_portfolio_updated_at
  before update on public.portfolio
  for each row execute function public.set_updated_at();

-- Many-to-many join table. The spec lists "portfolio_tags" as its own
-- table; this junction table is the normalized way to connect it to
-- `portfolio` without duplicating tag text on every row.
create table public.portfolio_tag_map (
  portfolio_id uuid not null references public.portfolio (id) on delete cascade,
  tag_id uuid not null references public.portfolio_tags (id) on delete cascade,
  primary key (portfolio_id, tag_id)
);
