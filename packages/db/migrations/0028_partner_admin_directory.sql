-- ============================================================
-- 0028: Partner Program — admin directory RPC
--
-- Context: apps/studio/dashboard/partners (client-facing side of the
-- Nimia Partner Program, migration 0016) has been live and confirmed
-- working since 30 Juli 2026, but apps/admin never got an equivalent page
-- — staff had no way to see who the partners are, how many people they've
-- referred, or how much reward is owed to them. This migration adds ONE
-- new RPC for that admin directory; it reuses public.partner_paid_clients_count()
-- from 0016 rather than re-deriving that logic, and gates on public.is_admin()
-- the same way get_partner_metrics()/get_partner_referral_activity() (also
-- 0016) already do — so the same staff/founder accounts that can already
-- read one partner's own metrics via those two RPCs can now also list all
-- of them at once here.
--
-- PREREQUISITE — reads public.partners/partner_referrals/partner_rewards
-- and calls public.partner_paid_clients_count(), all from 0016. Run 0016
-- (and everything before it) first if you haven't.
-- ============================================================

-- Deliberately filters to role = 'client' — every public.users row gets a
-- partners row (0016's backfill/handle_new_auth_user extension has no role
-- filter, "one row per public.users row" per that migration's own
-- comment), so without this filter, staff/admin/founder accounts would
-- show up in this directory too, which isn't useful for "who are our
-- partners" and would just be noise.
create or replace function public.get_all_partners_admin()
returns table (
  partner_id uuid,
  user_id uuid,
  full_name text,
  company_name text,
  referral_code text,
  is_founding_partner boolean,
  founding_partner_number integer,
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
