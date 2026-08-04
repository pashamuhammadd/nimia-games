-- ============================================================
-- 0020: close three RLS gaps found in the pre-launch security review
-- (P0.5) of every policy touching money on `orders`/`order_negotiations`.
--
-- All three share the same root cause: a policy that correctly checks ROW
-- ownership (is the caller the client on this order?) but never
-- constrains which COLUMNS or VALUES the caller's own write may contain.
-- 0019 already solved this correctly once, for the negotiation
-- accept/reject actions, by moving the write into a SECURITY DEFINER
-- function that re-derives the trusted values itself instead of taking
-- them from the caller. This migration applies the same pattern to the
-- two spots that were missed, plus a narrower fix (a BEFORE INSERT
-- trigger) for the third.
--
-- Fix 1 — order_negotiations.proposed_by was fully caller-supplied. A
-- client could INSERT a row claiming proposed_by = 'staff' for their own
-- order, then call the already client-callable accept_negotiation_offer()
-- (0019) — which only checks "is the latest offer proposed_by = 'staff'?"
-- — to move their own order straight to awaiting_payment at whatever
-- final_price_usd they just faked. A BEFORE INSERT trigger now derives
-- proposed_by from the caller's ACTUAL role, ignoring whatever value the
-- INSERT payload contains, so this can never be spoofed regardless of
-- what any client (or future code) sends.
--
-- Fix 2 — orders_update_own_payment_submission (0013) only constrained
-- `status` on the client's own payment-submission UPDATE. Nothing stopped
-- the same UPDATE from also rewriting final_price_usd,
-- payment_expected_amount, or payment_wallet_address — the exact numbers
-- staff's manual block-explorer verification trusts. apps/studio's own
-- submitPaymentAction already recomputes these server-side and never
-- trusted client input for them, but that is UX, not the security
-- boundary (see this repo's own convention: RLS is the boundary, server
-- actions are not). This migration drops that policy and replaces it with
-- submit_payment_transaction(), a SECURITY DEFINER function that re-looks
-- up the wallet address from payment_wallets and re-derives the expected
-- amount itself (exact 1:1 for stablecoins; derived from a caller-supplied
-- LIVE RATE for native coins, since this function has no way to fetch one
-- itself — see the function's own comment for why that residual trust is
-- intentional and bounded).
--
-- Fix 3 — orders_insert_own (0006) only checked client_id ownership, not
-- `status` or any payment/verification column. A client could INSERT a
-- brand new order already marked 'paid', with any final_price_usd or
-- payment_verified_at they liked. The policy is tightened so a client's
-- own INSERT must start in an intake status with every payment/
-- verification column null.
-- ============================================================

-- ------------------------------------------------------------------
-- Fix 1: order_negotiations.proposed_by can no longer be spoofed
-- ------------------------------------------------------------------

create or replace function public.set_negotiation_proposed_by()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  -- Overwrites whatever the INSERT payload sent, every time — this is not
  -- "validate and reject if wrong", it's "the caller's input for this
  -- column is never trusted at all, full stop."
  new.proposed_by := case when public.is_admin() then 'staff' else 'client' end;
  return new;
end;
$$;

drop trigger if exists order_negotiations_force_proposed_by on public.order_negotiations;

create trigger order_negotiations_force_proposed_by
  before insert on public.order_negotiations
  for each row execute function public.set_negotiation_proposed_by();

-- ------------------------------------------------------------------
-- Fix 2: payment submission moves behind a SECURITY DEFINER function
-- ------------------------------------------------------------------

drop policy if exists "orders_update_own_payment_submission" on public.orders;

create or replace function public.submit_payment_transaction(
  p_order_id uuid,
  p_network text,
  p_currency text,
  p_tx_hash text,
  p_rate_usd numeric default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order record;
  v_wallet record;
  v_is_stablecoin boolean;
  v_is_native boolean;
  v_expected_amount numeric;
  v_trimmed_hash text;
begin
  v_trimmed_hash := trim(coalesce(p_tx_hash, ''));
  if v_trimmed_hash = '' then
    raise exception 'Enter the transaction hash for your payment.';
  end if;

  select * into v_order from public.orders where id = p_order_id;
  if v_order is null then
    raise exception 'Order not found.';
  end if;
  if not public.is_owner_client(v_order.client_id) then
    raise exception 'Not authorized.';
  end if;
  if v_order.status <> 'awaiting_payment' then
    raise exception 'This order is not currently awaiting payment.';
  end if;
  if v_order.final_price_usd is null then
    raise exception 'No agreed price is set on this order yet.';
  end if;

  -- Re-derived fresh from payment_wallets, never from the caller — closes
  -- the "point staff at a wallet address I control" spoofing path.
  select *
  into v_wallet
  from public.payment_wallets
  where network = p_network::public.crypto_network
    and is_active = true;
  if v_wallet is null then
    raise exception 'That payment network isn''t available right now.';
  end if;

  v_is_stablecoin := p_currency = any(v_wallet.stablecoin_symbols);
  v_is_native := v_wallet.allow_native
    and v_wallet.native_symbol is not null
    and v_wallet.native_symbol = p_currency;

  if not v_is_stablecoin and not v_is_native then
    raise exception 'That currency isn''t accepted on this network.';
  end if;

  if v_is_stablecoin then
    -- Accepted 1:1 (0015) — always exactly final_price_usd, computed
    -- here, never taken from the caller.
    v_expected_amount := v_order.final_price_usd;
  else
    -- Native coins need a LIVE rate, which plain SQL can't fetch on its
    -- own (no outbound HTTP without extra Postgres extensions). The
    -- caller (apps/studio's submitPaymentAction) fetches this from
    -- CoinGecko exactly like it always has, and we derive the amount FROM
    -- that rate ourselves rather than accepting a pre-multiplied amount
    -- directly — a narrower, visible number for staff to sanity-check
    -- during their manual verification (Fase 1 is explicitly manual-only
    -- verification already, per docs/ARCHITECTURE.md section 5), instead
    -- of a silently pre-computed final amount.
    if p_rate_usd is null or p_rate_usd <= 0 then
      raise exception 'A live exchange rate is required for this currency.';
    end if;
    v_expected_amount := v_order.final_price_usd / p_rate_usd;
  end if;

  update public.orders
  set status = 'payment_submitted',
      payment_network = p_network,
      payment_token = p_currency,
      payment_wallet_address = v_wallet.address,
      payment_expected_amount = v_expected_amount,
      payment_tx_hash = v_trimmed_hash,
      payment_submitted_at = now(),
      payment_underpaid_note = null
  where id = p_order_id;
end;
$$;

grant execute on function public.submit_payment_transaction(uuid, text, text, text, numeric) to authenticated;

-- ------------------------------------------------------------------
-- Fix 3: orders_insert_own can no longer create an order that already
-- looks negotiated/paid/verified
-- ------------------------------------------------------------------

drop policy if exists "orders_insert_own" on public.orders;

create policy "orders_insert_own" on public.orders
  for insert
  with check (
    public.is_owner_client(client_id)
    and status in ('pending_review', 'negotiating')
    and final_price_usd is null
    and payment_network is null
    and payment_token is null
    and payment_wallet_address is null
    and payment_expected_amount is null
    and payment_tx_hash is null
    and payment_submitted_at is null
    and payment_verified_by is null
    and payment_verified_at is null
    and payment_underpaid_note is null
  );

-- Note: proposed_price_usd is deliberately NOT restricted above — it's the
-- client's own opening ask (set by apps/studio's submitOrderAction when
-- intent is "negotiate"), not an authoritative/verification field, so
-- there's nothing to fake by setting it.
