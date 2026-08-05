-- ============================================================
-- 0023: quests self-heal (auto-award) every time a client's Quests page is
-- viewed, not only at the exact instant an order flips to 'paid'.
--
-- Bug report (4 Agustus 2026, tester account): a client's "First Order"
-- quest showed progress 1/1 on /dashboard/quests, but never got marked
-- completed and never got a reward voucher. Root cause: the tester's order
-- was already 'paid' BEFORE this migration's own trigger
-- (orders_check_quests_after_paid, 0022) existed — that trigger only fires
-- on the UPDATE transition `old.status ~IS DISTINCT FROM 'paid' AND
-- new.status = 'paid'`, so it never had a chance to run for an order that
-- became paid earlier. get_client_quest_progress (0022) recomputes
-- current_progress LIVE from `orders`/`partners` on every call, so it
-- correctly showed "1/1" — but nothing had ever actually called
-- check_and_award_quests() for that client, so no completion row / voucher
-- was ever inserted. Same gap would hit ANY client whose qualifying
-- activity happened before this feature (or any future goal_type/quest)
-- existed.
--
-- Fix: rather than add a manual "Claim" button (the approved design is
-- fully automatic — quests reward clients without them doing anything),
-- get_client_quest_progress now also runs check_and_award_quests() for the
-- client at the START of every read. check_and_award_quests() is already
-- idempotent (skips any quest with an existing client_quest_completions
-- row — see 0022's own comment), so calling it on every page view is safe
-- and cheap: a client who's already been awarded gets a no-op, a client
-- who's newly eligible (whether from a live transition or a state that
-- predates this feature) gets awarded immediately, no click required.
--
-- Also drops the `stable` volatility marker this function had in 0022 —
-- it's no longer accurate once the function performs a write (via the
-- check_and_award_quests() call), so it's left as the default VOLATILE.
--
-- MUST run after 0022_quests.sql.
-- ============================================================

create or replace function public.get_client_quest_progress(p_client_id uuid)
returns table (
  quest_id uuid,
  quest_key text,
  title text,
  description text,
  goal_type text,
  goal_value numeric,
  reward_discount_percent numeric,
  current_progress numeric,
  is_completed boolean,
  completed_at timestamptz,
  reward_voucher_code text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_partner_id uuid;
begin
  if not (public.is_owner_client(p_client_id) or public.is_admin()) then
    raise exception 'Not authorized to read quest progress for this client.';
  end if;

  -- Self-heal first (see this migration's header comment) — idempotent,
  -- so safe to call unconditionally on every read.
  perform public.check_and_award_quests(p_client_id);

  select p.id into v_partner_id
  from public.partners p
  join public.clients c on c.user_id = p.user_id
  where c.id = p_client_id;

  return query
  select
    qd.id,
    qd.key,
    qd.title,
    qd.description,
    qd.goal_type,
    qd.goal_value,
    qd.reward_discount_percent,
    (case qd.goal_type
      when 'orders_count' then
        (select count(*)::numeric from public.orders where client_id = p_client_id and status = 'paid')
      when 'total_spend_usd' then
        (select coalesce(sum(final_price_usd), 0) from public.orders where client_id = p_client_id and status = 'paid')
      when 'referral_count' then
        coalesce(
          (case when v_partner_id is not null then public.partner_paid_clients_count(v_partner_id) else 0 end),
          0
        )::numeric
      else 0
    end) as current_progress,
    (cqc.id is not null) as is_completed,
    cqc.completed_at,
    v.code
  from public.quest_definitions qd
  left join public.client_quest_completions cqc on cqc.quest_id = qd.id and cqc.client_id = p_client_id
  left join public.vouchers v on v.id = cqc.voucher_id
  where qd.is_active
  order by qd.sort_order;
end;
$$;

grant execute on function public.get_client_quest_progress(uuid) to authenticated;
