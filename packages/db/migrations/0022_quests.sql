-- ============================================================
-- 0022: Quests — milestone goals that auto-reward a Voucher on completion
--
-- Part of the "Vouchers & Quests" feature (P1, 4 Agustus 2026). A Quest is
-- an admin-managed goal (e.g. "complete 3 orders") a client's progress is
-- measured against automatically; the moment a client's real activity
-- meets the goal, they're awarded a personal single-use Voucher and the
-- completion is recorded permanently (a quest is only ever awarded once
-- per client, even if their qualifying activity later changes).
--
-- MUST run after 0021_vouchers.sql (quest rewards are Vouchers) and after
-- 0016_partner_program.sql (the referral-count goal type reuses
-- partner_paid_clients_count()).
-- ============================================================

create table public.quest_definitions (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  title text not null,
  description text not null,
  goal_type text not null check (goal_type in ('orders_count', 'total_spend_usd', 'referral_count')),
  goal_value numeric(12, 2) not null check (goal_value > 0),
  reward_discount_percent numeric(5, 2) not null check (reward_discount_percent > 0 and reward_discount_percent <= 100),
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- Ledger of completions — inserted exactly once per (client, quest) by
-- check_and_award_quests() below, never by a client or admin's own direct
-- INSERT (see RLS below). voucher_id points at the reward this specific
-- completion generated, so the client's Quests page can show/link it.
create table public.client_quest_completions (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  quest_id uuid not null references public.quest_definitions (id) on delete cascade,
  voucher_id uuid references public.vouchers (id) on delete set null,
  completed_at timestamptz not null default now(),
  unique (client_id, quest_id)
);

alter table public.quest_definitions enable row level security;
alter table public.client_quest_completions enable row level security;

-- quest_definitions — public catalog, same "publicly readable while
-- active, admin manages" shape as services/portfolio (0006).
create policy "quest_definitions_public_read_active" on public.quest_definitions
  for select using (is_active or public.is_admin());

create policy "quest_definitions_admin_write" on public.quest_definitions
  for all using (public.is_admin()) with check (public.is_admin());

create policy "client_quest_completions_select_own_or_admin" on public.client_quest_completions
  for select using (public.is_owner_client(client_id) or public.is_admin());

-- No client insert policy at all — a completion (and the voucher it
-- grants) can only ever be created inside check_and_award_quests() below,
-- or by admin directly for manual overrides/support cases.
create policy "client_quest_completions_admin_write" on public.client_quest_completions
  for all using (public.is_admin()) with check (public.is_admin());

-- Seed the 4 quests agreed with the user (4 Agustus 2026) — reward
-- percentages are a starting suggestion, editable any time from the admin
-- Quests page (0022's own admin UI), not hardcoded assumptions.
insert into public.quest_definitions (key, title, description, goal_type, goal_value, reward_discount_percent, sort_order)
values
  ('first_order', 'First Order', 'Complete your first paid order with Nimia Studio.', 'orders_count', 1, 5, 1),
  ('loyal_client', 'Loyal Client', 'Complete 3 paid orders with Nimia Studio.', 'orders_count', 3, 10, 2),
  ('big_spender', 'Big Spender', 'Reach $1,000 in total paid orders.', 'total_spend_usd', 1000, 10, 3),
  ('bring_a_friend', 'Bring a Friend', 'Refer 3 people who go on to complete a paid order.', 'referral_count', 3, 15, 4);

-- check_and_award_quests — evaluates every active quest for one client and
-- awards a voucher + records a completion for any quest whose goal is now
-- met and that client hasn't already completed. Idempotent (safe to call
-- repeatedly — already-completed quests are skipped via the unique
-- (client_id, quest_id) row). NOT granted to `authenticated` — this is only
-- ever invoked from inside the trigger below (which runs as its own
-- SECURITY DEFINER context), never called directly by a client or admin
-- session, so there's no caller identity to authorize against here.
create or replace function public.check_and_award_quests(p_client_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_quest record;
  v_progress numeric;
  v_partner_id uuid;
  v_voucher_id uuid;
  v_code text;
begin
  select p.id into v_partner_id
  from public.partners p
  join public.clients c on c.user_id = p.user_id
  where c.id = p_client_id;

  for v_quest in select * from public.quest_definitions where is_active loop
    if exists (
      select 1 from public.client_quest_completions
      where client_id = p_client_id and quest_id = v_quest.id
    ) then
      continue;
    end if;

    if v_quest.goal_type = 'orders_count' then
      select count(*) into v_progress from public.orders
      where client_id = p_client_id and status = 'paid';
    elsif v_quest.goal_type = 'total_spend_usd' then
      select coalesce(sum(final_price_usd), 0) into v_progress from public.orders
      where client_id = p_client_id and status = 'paid';
    elsif v_quest.goal_type = 'referral_count' then
      -- "Referred people who went on to complete a paid order" reuses the
      -- Partner Program's own real metric (0016) rather than
      -- re-implementing the referral join here — this client only
      -- progresses on this quest if THEY are also a partner who referred
      -- others (matches the "Bring a Friend" framing).
      v_progress := coalesce(
        case when v_partner_id is not null then public.partner_paid_clients_count(v_partner_id) else 0 end,
        0
      );
    else
      v_progress := 0;
    end if;

    if v_progress >= v_quest.goal_value then
      -- Human-readable-ish, collision-safe code — vouchers.code is UNIQUE
      -- with its own normalize trigger (0021), so no separate uniqueness
      -- check is needed here.
      v_code := 'QUEST-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));

      insert into public.vouchers (code, discount_percent, source, client_id, max_redemptions, note)
      values (
        v_code, v_quest.reward_discount_percent, 'quest_reward', p_client_id, 1,
        'Reward for completing quest: ' || v_quest.title
      )
      returning id into v_voucher_id;

      insert into public.client_quest_completions (client_id, quest_id, voucher_id)
      values (p_client_id, v_quest.id, v_voucher_id);
    end if;
  end loop;
end;
$$;

-- Trigger: re-check quests whenever an order becomes 'paid' — both for the
-- order's own client (orders_count/total_spend_usd progress) and, if that
-- client was referred by a partner, for the REFERRER's own client_id too
-- (referral_count progress). Deliberately a separate, independent trigger
-- from handle_order_paid()/orders_after_paid (0013/0016, commission
-- calculation) rather than folding this into that function — keeps this
-- feature from ever risking a regression in partner reward logic.
create or replace function public.orders_check_quests_on_paid()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_referrer_client_id uuid;
begin
  if new.status = 'paid' and old.status is distinct from 'paid' then
    perform public.check_and_award_quests(new.client_id);

    select c.id into v_referrer_client_id
    from public.clients bc
    join public.partner_referrals pr on pr.referred_user_id = bc.user_id
    join public.partners p on p.id = pr.partner_id
    join public.clients c on c.user_id = p.user_id
    where bc.id = new.client_id;

    if v_referrer_client_id is not null then
      perform public.check_and_award_quests(v_referrer_client_id);
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists orders_check_quests_after_paid on public.orders;

create trigger orders_check_quests_after_paid
  after update on public.orders
  for each row execute function public.orders_check_quests_on_paid();

-- get_client_quest_progress — read-only RPC for the client Quests page.
-- Same "SECURITY DEFINER + check p_client_id belongs to the caller (or
-- admin) at the top" shape as get_partner_metrics (0016) — this reaches
-- across orders/partners/vouchers, tables an ordinary client has no direct
-- RLS access to read in aggregate, so this check is the only thing
-- standing between a client and reading another client's quest progress.
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
stable
security definer
set search_path = public
as $$
declare
  v_partner_id uuid;
begin
  if not (public.is_owner_client(p_client_id) or public.is_admin()) then
    raise exception 'Not authorized to read quest progress for this client.';
  end if;

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
