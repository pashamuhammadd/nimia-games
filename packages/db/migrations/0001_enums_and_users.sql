-- ============================================================
-- 0001: extensions, shared helpers, enums, and the `users` table
-- ============================================================

-- pgcrypto gives us gen_random_uuid() for primary keys.
create extension if not exists "pgcrypto";

-- Shared helper: auto-update `updated_at` on every row change. Reused by
-- every table below that has an `updated_at` column.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ------------------------------------------------------------------
-- Enums
-- ------------------------------------------------------------------

create type public.user_role as enum ('admin', 'client');

create type public.service_category as enum (
  '3d_animation',
  '2d_animation',
  'game_trailer',
  'product_visualization',
  'motion_graphics',
  'logo_animation',
  'game_asset',
  'ui_animation',
  'custom_project'
);

-- Intake-side status for a raw order submission, before it becomes a
-- project. Kept separate from project_status (below) because an order can
-- be rejected or sit in quotation back-and-forth before any project exists.
create type public.order_status as enum (
  'pending_review',
  'quotation_sent',
  'rejected',
  'converted'
);

-- Full operational lifecycle for a project, matches the 10 stages from the
-- studio spec exactly.
create type public.project_status as enum (
  'pending_review',
  'quotation',
  'waiting_payment',
  'paid',
  'planning',
  'in_progress',
  'revision',
  'final_review',
  'completed',
  'cancelled'
);

create type public.invoice_status as enum (
  'draft',
  'unpaid',
  'partially_paid',
  'paid',
  'cancelled',
  'overdue'
);

create type public.payment_status as enum ('pending', 'verified', 'rejected');

create type public.project_file_type as enum ('deliverable', 'reference');

-- ------------------------------------------------------------------
-- users: profile table extending Supabase auth.users. One row per
-- authenticated user (admin or client), auto-created by a trigger on
-- signup — see 0006_rls_policies.sql for that trigger. There is
-- intentionally NO direct insert policy on this table for regular users;
-- rows are only ever created via that trusted trigger.
-- ------------------------------------------------------------------

create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.user_role not null default 'client',
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_users_updated_at
  before update on public.users
  for each row execute function public.set_updated_at();
