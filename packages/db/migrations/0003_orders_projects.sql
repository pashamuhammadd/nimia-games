-- ============================================================
-- 0003: orders (intake) -> projects (operational lifecycle)
-- ============================================================

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  service_id uuid references public.services (id) on delete set null,
  full_name text not null,
  company_name text,
  email text not null,
  whatsapp text,
  country text,
  budget text,
  deadline date,
  description text not null,
  reference_link text,
  status public.order_status not null default 'pending_review',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_orders_updated_at
  before update on public.orders
  for each row execute function public.set_updated_at();

-- Lampiran file attached at submission time (separate table since an
-- order can have any number of attachments).
create table public.order_files (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  file_name text not null,
  file_url text not null,
  created_at timestamptz not null default now()
);

-- projects: created by an admin once an order is approved. order_id is
-- nullable so a project can also be opened directly by an admin without
-- going through the public order form.
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  order_id uuid unique references public.orders (id) on delete set null,
  client_id uuid not null references public.clients (id) on delete cascade,
  title text not null,
  status public.project_status not null default 'pending_review',
  progress smallint not null default 0 check (progress between 0 and 100),
  start_date date,
  deadline date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_projects_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

-- project_updates: the timeline shown in the client dashboard. Rows are
-- inserted automatically by the trigger below whenever a project's status
-- changes — nobody should insert into this table directly.
create table public.project_updates (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  from_status public.project_status,
  to_status public.project_status not null,
  note text,
  created_by uuid references public.users (id) on delete set null,
  created_at timestamptz not null default now()
);

-- IMPORTANT: split into an explicit IF/ELSIF on tg_op rather than
-- referencing OLD inside a single shared expression — OLD is unassigned
-- during an INSERT firing, and PL/pgSQL will error if that branch ever
-- touches OLD.status, even accidentally.
create or replace function public.log_project_status_change()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.project_updates (project_id, from_status, to_status, created_by)
    values (new.id, null, new.status, auth.uid());
  elsif tg_op = 'UPDATE' and new.status is distinct from old.status then
    insert into public.project_updates (project_id, from_status, to_status, created_by)
    values (new.id, old.status, new.status, auth.uid());
  end if;
  return new;
end;
$$;

create trigger log_projects_status_change
  after insert or update on public.projects
  for each row execute function public.log_project_status_change();
