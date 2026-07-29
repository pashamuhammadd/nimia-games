-- ============================================================
-- 0007: auto-provision a `clients` row on signup
--
-- 0006's handle_new_auth_user() only created the `public.users` row.
-- Tahap 4's register form collects company_name/whatsapp/country as
-- Supabase Auth signup metadata (auth.users.raw_user_meta_data) — this
-- extends the SAME trigger function to also insert the matching
-- `public.clients` row in the same transaction, so a client can submit
-- the Order Service form immediately after verifying their email without
-- any separate "complete your profile" step.
--
-- Safe to run multiple times: `create or replace function` just repoints
-- the existing `on_auth_user_created` trigger (created in 0006) at this
-- new body — no need to recreate the trigger itself.
-- ============================================================

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name');

  insert into public.clients (user_id, company_name, whatsapp, country)
  values (
    new.id,
    nullif(new.raw_user_meta_data ->> 'company_name', ''),
    nullif(new.raw_user_meta_data ->> 'whatsapp', ''),
    nullif(new.raw_user_meta_data ->> 'country', '')
  );

  return new;
end;
$$;
