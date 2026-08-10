-- ============================================================
-- 0030: Partner Program — instant Gold-floor commission for signups via
-- the public /partners marketing page.
--
-- Context: studio.nimiagames.com/partners (built earlier this session,
-- 10 Agustus 2026) is a dedicated public page for acquiring NEW partners
-- — distinct from the /r/:code referral link, which acquires new CLIENTS
-- on behalf of an existing partner. Per user decision (10 Agustus 2026,
-- same evening):
--   1. Anyone who registers through THAT SPECIFIC page starts at the
--      Gold rate (10%) immediately, instead of the normal Bronze (5%)
--      everyone else starts at.
--   2. This is a FLOOR, not a lifetime lock like Founding Partner — if
--      they go on to refer 15+ paid clients, they still rise to
--      Platinum (12%) like any other partner would.
--   3. Unlimited — no quota/expiry, unlike Founding Partner's fixed
--      first-100 quota. Applies for as long as this signup path exists.
--
-- PREREQUISITE — run after 0016_partner_program.sql (adds a column to,
-- and replaces two functions from, that migration) and 0028 (extends
-- get_all_partners_admin() with one more output column).
-- ============================================================

alter table public.partners
  add column if not exists joined_via_partner_page boolean not null default false;

comment on column public.partners.joined_via_partner_page is
  'True if this account registered through studio.nimiagames.com/partners (the public Partner Program marketing page) rather than a plain /register visit or a referral link. Grants a Gold-rate (10%) commission FLOOR, not a lock — see partner_commission_rate() below. Set once, at signup, by handle_new_auth_user() reading auth.users.raw_user_meta_data ->> ''joined_via_partner_page'' (forwarded by app/actions.ts#signUpAction from RegisterForm.tsx''s hidden field, set when the visitor arrived via /register?via=partners).';

-- Replace partner_commission_rate() to add the Gold floor. A different
-- parameter list is a NEW overload in Postgres, not a replacement — drop
-- the old 2-arg version explicitly so only one (the new 3-arg, with a
-- default for the 3rd param so 2-arg call sites elsewhere would still
-- resolve, though none remain after this migration) exists. KEEP IN SYNC
-- with PARTNER_LEVELS / resolvePartnerLevel() in
-- apps/studio/modules/partners/ — same "manually synced in multiple
-- places" convention 0016 already established for this ladder.
drop function if exists public.partner_commission_rate(integer, boolean);

create or replace function public.partner_commission_rate(
  p_paid_clients_count integer,
  p_is_founding_partner boolean,
  p_joined_via_partner_page boolean default false
)
returns numeric
language sql
immutable
as $$
  select case
    when p_is_founding_partner then 0.10 -- Founding Partner override: instant/lifetime Gold rate, regardless of paid_clients_count. Checked first — doesn't matter whether a partner also has joined_via_partner_page set, Founding Partner's own rate is fixed for life either way.
    when p_paid_clients_count >= 15 then 0.12 -- Platinum — checked BEFORE the /partners floor below, so a /partners signup can still rise above Gold once they qualify (floor, not a lock).
    when p_joined_via_partner_page then 0.10 -- /partners signup floor: guaranteed at least Gold (10%) even at 0 paid clients.
    when p_paid_clients_count >= 7 then 0.10  -- Gold
    when p_paid_clients_count >= 3 then 0.07  -- Silver
    else 0.05                                  -- Bronze
  end;
$$;

-- Re-point the reward trigger at the new 3-arg signature explicitly
-- (rather than relying on the dropped 2-arg call to somehow keep
-- working) so a referred client's paid order correctly credits the Gold
-- floor rate when the referring partner has joined_via_partner_page set.
create or replace function public.handle_order_paid_partner_reward()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_partner_id uuid;
  v_is_founding boolean;
  v_joined_via_partner_page boolean;
  v_paid_clients_count integer;
  v_rate numeric;
begin
  if new.status = 'paid' and old.status is distinct from 'paid' then
    select pr.partner_id into v_partner_id
    from public.partner_referrals pr
    join public.clients c on c.user_id = pr.referred_user_id
    where c.id = new.client_id
    limit 1;

    if v_partner_id is not null and new.final_price_usd is not null then
      select is_founding_partner, joined_via_partner_page
        into v_is_founding, v_joined_via_partner_page
        from public.partners where id = v_partner_id;
      -- Counted AFTER this order counts as paid (AFTER UPDATE trigger, so
      -- this row is already visible to the same-transaction query below).
      v_paid_clients_count := public.partner_paid_clients_count(v_partner_id);
      v_rate := public.partner_commission_rate(v_paid_clients_count, v_is_founding, v_joined_via_partner_page);

      insert into public.partner_rewards (partner_id, order_id, amount_usd, rate_applied, status)
      values (v_partner_id, new.id, new.final_price_usd * v_rate, v_rate, 'pending')
      on conflict (order_id) do nothing;
    end if;
  end if;
  return new;
end;
$$;

-- Extend handle_new_auth_user() (0006/0007/0016) to also read/store the
-- new signup-source flag. Re-defining the whole function body (same "safe
-- to run multiple times, just repoints the existing trigger" pattern 0016
-- used) since Postgres has no partial-function-edit syntax.
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_founding_number bigint;
  v_new_referral_code text;
  v_input_referral_code text;
  v_referrer_partner_id uuid;
  v_joined_via_partner_page boolean;
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

  -- Nimia Partner Program: every account gets a partner row + permanent
  -- referral code automatically, no application step.
  v_founding_number := nextval('public.partner_founding_seq');
  v_new_referral_code := public.generate_partner_referral_code();
  v_joined_via_partner_page := coalesce((new.raw_user_meta_data ->> 'joined_via_partner_page')::boolean, false);

  insert into public.partners (user_id, referral_code, is_founding_partner, founding_partner_number, joined_via_partner_page)
  values (
    new.id,
    v_new_referral_code,
    v_founding_number <= 100,
    case when v_founding_number <= 100 then v_founding_number end,
    v_joined_via_partner_page
  );

  -- If this signup came through a referral link/code, record it. A
  -- missing/invalid/self-referenced code is silently ignored — it should
  -- never block signup.
  v_input_referral_code := upper(trim(new.raw_user_meta_data ->> 'referral_code'));
  if v_input_referral_code is not null and v_input_referral_code <> '' then
    select id into v_referrer_partner_id
    from public.partners
    where referral_code = v_input_referral_code and user_id <> new.id;

    if v_referrer_partner_id is not null then
      insert into public.partner_referrals (partner_id, referred_user_id)
      values (v_referrer_partner_id, new.id)
      on conflict (referred_user_id) do nothing;
    end if;
  end if;

  return new;
end;
$$;

-- Extend get_all_partners_admin() (0028) with the new flag so the admin
-- directory can show it too (same "3 places kept in sync manually"
-- pattern as the level thresholds — see partner-level.ts in both apps).
-- The argument list is unchanged (still no args), but Postgres ALSO
-- refuses `create or replace function` when the RETURNS TABLE column list
-- changes (error 42P13: "cannot change return type of existing function"
-- — same class of restriction as partner_commission_rate() above, just
-- triggered by the output row shape instead of the input signature this
-- time), so an explicit drop is required here too.
drop function if exists public.get_all_partners_admin();

create or replace function public.get_all_partners_admin()
returns table (
  partner_id uuid,
  user_id uuid,
  full_name text,
  company_name text,
  referral_code text,
  is_founding_partner boolean,
  founding_partner_number integer,
  joined_via_partner_page boolean,
  partner_created_at timestamptz,
  referral_count bigint,
  paid_clients_count integer,
  pending_reward_usd numeric,
  available_reward_usd numeric,
  lifetime_reward_usd numeric
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'not authorized to read the partner directory';
  end if;

  return query
  select
    p.id,
    p.user_id,
    u.full_name,
    c.company_name,
    p.referral_code,
    p.is_founding_partner,
    p.founding_partner_number,
    p.joined_via_partner_page,
    p.created_at,
    (select count(*) from public.partner_referrals pr where pr.partner_id = p.id),
    public.partner_paid_clients_count(p.id),
    coalesce((select sum(amount_usd) from public.partner_rewards where partner_id = p.id and status = 'pending'), 0),
    coalesce((select sum(amount_usd) from public.partner_rewards where partner_id = p.id and status = 'available'), 0),
    coalesce((select sum(amount_usd) from public.partner_rewards where partner_id = p.id), 0)
  from public.partners p
  join public.users u on u.id = p.user_id
  left join public.clients c on c.user_id = p.user_id
  where u.role = 'client'
  order by p.created_at desc;
end;
$$;

-- Backfill: NOT needed. Nobody could have registered "via the /partners
-- page" before this migration exists — the page and this flag were built
-- in the same session, so there is no historical data to retroactively
-- flag as true.
