-- ============================================================
-- 0033: Partner reward withdrawal system
--
-- Context: migration 0016 explicitly deferred payout/withdraw for the
-- Nimia Partner Program ("Belum perlu membuat sistem withdraw. Cukup
-- siapkan tampilan UI.") — apps/studio's Rewards section has been
-- read-only since 30 Juli 2026, and apps/admin's Partners directory page
-- says so explicitly ("There's no payout/withdraw system yet ... this
-- page is view-only"). Per user decision (11 Agustus 2026), that's no
-- longer true: a partner can now claim their whole current Available
-- Reward balance to a wallet address they type in, a founder reviews the
-- request on the admin Partners page, manually sends the crypto
-- off-platform (same "manual, no on-chain automation" posture the actual
-- payment side of this app already has — see 0015's own comment), and
-- marks the request as sent (or rejects it, e.g. bad address, which
-- releases the reward back to Available so the partner can try again).
--
-- Design notes:
--   - One open (pending) request per partner at a time — see the partial
--     unique index below. Simpler to reason about than partial/repeated
--     claims against the same balance, and matches the brief ("langsung
--     menuju ke halaman khusus untuk mengisi alamat wallet" reads as one
--     request at a time, not a running tab).
--   - A request always claims the FULL available balance at the moment
--     it's created (not a partial/custom amount) — keeps the UI to one
--     button instead of an amount input the partner could get wrong.
--   - partner_rewards stays ledger-style (never mutate amount_usd/
--     rate_applied — same rule 0016 set), but its `status` column grows
--     two more values so a reward can now flow
--     pending -> available -> withdrawal_pending -> withdrawn (or back to
--     available, if the request is rejected).
--   - Reuses public.crypto_network (0013, extended 0014) for the target
--     wallet's network — same set of chains the buyer-facing payment flow
--     already accepts, so the studio UI can share one
--     network-code -> human-label table (see PaymentPanel.tsx's
--     NETWORK_LABELS) instead of inventing a second list.
--
-- PREREQUISITE — reads/extends public.partners/partner_rewards (0016),
-- calls public.notify_staff()/inserts into public.notifications (0032),
-- and reuses public.crypto_network (0013/0014). Run those first if you
-- haven't.
-- ============================================================

-- ------------------------------------------------------------------
-- partner_withdrawal_requests: one row per withdrawal request. Ledger
-- style like partner_rewards — amount_usd/wallet_network/wallet_address
-- are never mutated after insert (that's what the partner asked to be
-- paid, and where the founder needs to actually send it); only
-- status/admin_note/processed_at/processed_by change as the request
-- moves through review.
-- ------------------------------------------------------------------
create table public.partner_withdrawal_requests (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partners (id) on delete cascade,
  amount_usd numeric(12, 2) not null check (amount_usd > 0),
  wallet_network public.crypto_network not null,
  wallet_address text not null,
  status text not null default 'pending' check (status in ('pending', 'completed', 'rejected')),
  admin_note text,
  requested_at timestamptz not null default now(),
  processed_at timestamptz,
  processed_by uuid references public.users (id)
);

create index partner_withdrawal_requests_partner_id_idx on public.partner_withdrawal_requests (partner_id);

-- Only one OPEN request per partner at a time — keeps "which
-- partner_rewards rows are locked into this request" unambiguous, and
-- stops a partner submitting a second request against the same balance
-- while the first is still being reviewed. Partial index (only enforced
-- while status = 'pending') so a partner can freely request again after
-- an earlier request is completed or rejected.
create unique index partner_withdrawal_requests_one_open_idx
  on public.partner_withdrawal_requests (partner_id)
  where status = 'pending';

alter table public.partner_withdrawal_requests enable row level security;

create policy "partner_withdrawal_requests_select_own_or_admin" on public.partner_withdrawal_requests
  for select using (
    exists (
      select 1 from public.partners
      where partners.id = partner_withdrawal_requests.partner_id and partners.user_id = auth.uid()
    )
    or public.is_admin()
  );

-- No insert/update policy for anyone — every row is written by the
-- SECURITY DEFINER RPCs below (request_partner_withdrawal /
-- approve_partner_withdrawal / reject_partner_withdrawal), same "trusted
-- RPC only" pattern 0016 already established for
-- partners/partner_referrals/partner_rewards.
create policy "partner_withdrawal_requests_admin_write" on public.partner_withdrawal_requests
  for all using (public.is_admin()) with check (public.is_admin());

-- ------------------------------------------------------------------
-- Extend partner_rewards.status with two more buckets:
--   'withdrawal_pending' — this reward is locked into an open withdrawal
--                          request; no longer counted in Available (it's
--                          spoken for) but still counted in Lifetime.
--   'withdrawn'           — the request was completed (founder manually
--                          sent the funds) — this reward has been fully
--                          paid out.
-- ------------------------------------------------------------------
alter table public.partner_rewards drop constraint partner_rewards_status_check;
alter table public.partner_rewards
  add constraint partner_rewards_status_check
  check (status in ('pending', 'available', 'withdrawal_pending', 'withdrawn'));

alter table public.partner_rewards
  add column withdrawal_request_id uuid references public.partner_withdrawal_requests (id) on delete set null;

create index partner_rewards_withdrawal_request_id_idx
  on public.partner_rewards (withdrawal_request_id)
  where withdrawal_request_id is not null;

-- ------------------------------------------------------------------
-- request_partner_withdrawal — a partner claims their ENTIRE current
-- Available Reward balance for payout to a wallet they type in. Locks
-- every 'available' partner_rewards row for this partner into the new
-- request (flips them to 'withdrawal_pending') in the same transaction
-- so the same dollars can never be claimed twice by a second request
-- before this one is resolved — the partial unique index above is the
-- other half of that guarantee (blocks a second concurrent request
-- outright).
-- ------------------------------------------------------------------
create or replace function public.request_partner_withdrawal(
  p_wallet_network public.crypto_network,
  p_wallet_address text
)
returns public.partner_withdrawal_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_partner_id uuid;
  v_amount numeric;
  v_request public.partner_withdrawal_requests;
begin
  select id into v_partner_id from public.partners where user_id = auth.uid();
  if v_partner_id is null then
    raise exception 'no partner account found for the current user';
  end if;

  if p_wallet_address is null or length(trim(p_wallet_address)) < 6 then
    raise exception 'enter a valid wallet address';
  end if;

  if exists (
    select 1 from public.partner_withdrawal_requests
    where partner_id = v_partner_id and status = 'pending'
  ) then
    raise exception 'you already have a withdrawal request in review';
  end if;

  select coalesce(sum(amount_usd), 0) into v_amount
  from public.partner_rewards
  where partner_id = v_partner_id and status = 'available';

  if v_amount <= 0 then
    raise exception 'no available reward to withdraw';
  end if;

  insert into public.partner_withdrawal_requests (partner_id, amount_usd, wallet_network, wallet_address)
  values (v_partner_id, v_amount, p_wallet_network, trim(p_wallet_address))
  returning * into v_request;

  update public.partner_rewards
  set status = 'withdrawal_pending', withdrawal_request_id = v_request.id
  where partner_id = v_partner_id and status = 'available';

  perform public.notify_staff(
    'partner_withdrawal_requested',
    'New partner withdrawal request',
    '$' || to_char(v_amount, 'FM999,999,990.00') || ' requested — review it on the Partners page.',
    '/partners'
  );

  return v_request;
end;
$$;

grant execute on function public.request_partner_withdrawal(public.crypto_network, text) to authenticated;

-- ------------------------------------------------------------------
-- approve_partner_withdrawal — founder confirms they've manually sent
-- the crypto to the wallet address recorded on the request, and marks it
-- paid. Gate is is_admin() at the DB layer, same as every other
-- admin-facing RPC in this schema — there is no SQL-level "founder only"
-- helper anywhere in this codebase yet (see 0011's own comment: founder-
-- vs-staff has stayed an app-layer distinction so far, e.g. the /finance
-- page's isFounderRole redirect). apps/admin restricts who can actually
-- SEE/click Approve/Reject to founder-tier accounts for that same reason
-- — see apps/admin/app/(protected)/partners/actions.ts.
-- ------------------------------------------------------------------
create or replace function public.approve_partner_withdrawal(
  p_request_id uuid,
  p_admin_note text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_partner_user_id uuid;
  v_amount numeric;
begin
  if not public.is_admin() then
    raise exception 'not authorized to process withdrawal requests';
  end if;

  select p.user_id, w.amount_usd into v_partner_user_id, v_amount
  from public.partner_withdrawal_requests w
  join public.partners p on p.id = w.partner_id
  where w.id = p_request_id and w.status = 'pending'
  for update of w;

  if v_partner_user_id is null then
    raise exception 'withdrawal request not found or already processed';
  end if;

  update public.partner_withdrawal_requests
  set status = 'completed', admin_note = p_admin_note, processed_at = now(), processed_by = auth.uid()
  where id = p_request_id;

  update public.partner_rewards
  set status = 'withdrawn'
  where withdrawal_request_id = p_request_id;

  insert into public.notifications (user_id, type, title, body, link)
  values (
    v_partner_user_id,
    'partner_withdrawal_sent',
    'Withdrawal sent',
    '$' || to_char(v_amount, 'FM999,999,990.00') || ' has been sent to your wallet.',
    '/dashboard/partners'
  );
end;
$$;

grant execute on function public.approve_partner_withdrawal(uuid, text) to authenticated;

-- ------------------------------------------------------------------
-- reject_partner_withdrawal — founder declines the request (e.g. bad
-- wallet address, suspicious activity); releases the locked rewards back
-- to 'available' so the partner can request again with a corrected
-- address.
-- ------------------------------------------------------------------
create or replace function public.reject_partner_withdrawal(
  p_request_id uuid,
  p_admin_note text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_partner_user_id uuid;
begin
  if not public.is_admin() then
    raise exception 'not authorized to process withdrawal requests';
  end if;

  select p.user_id into v_partner_user_id
  from public.partner_withdrawal_requests w
  join public.partners p on p.id = w.partner_id
  where w.id = p_request_id and w.status = 'pending'
  for update of w;

  if v_partner_user_id is null then
    raise exception 'withdrawal request not found or already processed';
  end if;

  update public.partner_withdrawal_requests
  set status = 'rejected', admin_note = p_admin_note, processed_at = now(), processed_by = auth.uid()
  where id = p_request_id;

  update public.partner_rewards
  set status = 'available', withdrawal_request_id = null
  where withdrawal_request_id = p_request_id;

  insert into public.notifications (user_id, type, title, body, link)
  values (
    v_partner_user_id,
    'partner_withdrawal_rejected',
    'Withdrawal request declined',
    coalesce('Reason: ' || p_admin_note, 'Your withdrawal request was declined. Please check your wallet address and try again.'),
    '/dashboard/partners'
  );
end;
$$;

grant execute on function public.reject_partner_withdrawal(uuid, text) to authenticated;

-- ------------------------------------------------------------------
-- get_partner_metrics — redefine (return shape changes, so DROP first —
-- Postgres won't let CREATE OR REPLACE change a function's output
-- columns) to exclude 'withdrawal_pending' rewards from Available (that
-- money is already spoken for) while still counting them in Lifetime,
-- and to surface the partner's current open request (if any) so the
-- Rewards card can show "Withdrawal in review" instead of a live Withdraw
-- button for money that's already been claimed.
-- ------------------------------------------------------------------
drop function if exists public.get_partner_metrics(uuid);

create or replace function public.get_partner_metrics(p_partner_id uuid)
returns table (
  referral_count bigint,
  paid_clients_count integer,
  pending_reward_usd numeric,
  available_reward_usd numeric,
  withdrawing_reward_usd numeric,
  lifetime_reward_usd numeric,
  open_withdrawal_request_id uuid,
  open_withdrawal_amount_usd numeric
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.partners
    where id = p_partner_id and (user_id = auth.uid() or public.is_admin())
  ) then
    raise exception 'not authorized to read metrics for this partner';
  end if;

  return query
  select
    (select count(*) from public.partner_referrals where partner_id = p_partner_id),
    public.partner_paid_clients_count(p_partner_id),
    coalesce((select sum(amount_usd) from public.partner_rewards where partner_id = p_partner_id and status = 'pending'), 0),
    coalesce((select sum(amount_usd) from public.partner_rewards where partner_id = p_partner_id and status = 'available'), 0),
    coalesce((select sum(amount_usd) from public.partner_rewards where partner_id = p_partner_id and status = 'withdrawal_pending'), 0),
    coalesce((select sum(amount_usd) from public.partner_rewards where partner_id = p_partner_id), 0),
    (select id from public.partner_withdrawal_requests where partner_id = p_partner_id and status = 'pending'),
    (select amount_usd from public.partner_withdrawal_requests where partner_id = p_partner_id and status = 'pending');
end;
$$;
