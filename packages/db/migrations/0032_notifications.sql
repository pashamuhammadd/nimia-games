-- ============================================================
-- 0032: In-app Notification Center — wires up the `notifications` table
-- that has existed (unused) since 0004_messaging_files.sql, with RLS
-- already active since 0006_rls_policies.sql (notifications_select_own /
-- notifications_update_own — a user can read + mark-read only their own
-- rows; there was never an INSERT policy for anyone, exactly because
-- every row here is meant to be written by a trusted server-side
-- process, same "trusted trigger only" convention as
-- public.users/public.clients/public.partners).
--
-- Design: every notification below is created by a database TRIGGER, not
-- by application code calling a new RPC — mirrors the pattern this schema
-- already uses heavily for cross-cutting side effects (0016's partner
-- reward triggers, 0022's quest-award trigger, 0024's receipt trigger,
-- 0029's auto-project trigger): the event that matters already happens as
-- a plain INSERT/UPDATE somewhere, so hanging a notification off that
-- same write is more robust than threading a new call through every
-- server action (and every RPC — e.g. submit_payment_transaction, 0020)
-- that could cause it. No apps/studio or apps/admin action file needs to
-- change for the WRITE side at all; only the bell UI (read side) is new
-- app code.
--
-- Two directions:
--   - "staff" notifications: broadcast, one row per every public.users
--     row with role in ('admin','staff','founder') — see notify_staff()
--     helper below. Read by apps/admin's Topbar bell.
--   - "client" notifications: one row for the specific client whose
--     order/project/ticket this is — resolved via clients.user_id, same
--     join every other client-scoped RLS policy in this schema already
--     uses. Read by apps/studio's Topbar bell.
--
-- `type` values used below (free-form text per 0004's own comment, no
-- enum): 'order_new', 'order_status', 'order_negotiation_offer',
-- 'order_payment_submitted', 'support_ticket_new', 'support_ticket_closed',
-- 'project_status', 'project_deliverable', 'referral_signup'. Keep these
-- in sync with NOTIFICATION_TYPE_META in apps/studio's and apps/admin's
-- own app/lib/notifications.ts (icon per type for the bell dropdown) —
-- same "manually synced in multiple places" convention as the partner
-- level ladder (0016) and project status labels (apps/*/lib/projectStatus.ts).
--
-- MUST run after 0006 (is_admin/notifications RLS), 0013 (order_negotiations),
-- 0016/0030 (handle_new_auth_user, partners), 0027 (support_tickets).
-- ============================================================

-- ------------------------------------------------------------------
-- notify_staff — fan-out helper, used by every trigger below that needs
-- to reach the admin/staff/founder side. SECURITY DEFINER so it also
-- works if a future server action ever needs an ad-hoc staff broadcast
-- outside a database event (granted to authenticated below for that
-- reason) — every call site in this migration is itself already inside
-- another SECURITY DEFINER trigger function, so the grant is a
-- convenience for later, not a requirement for this migration to work.
-- ------------------------------------------------------------------
create or replace function public.notify_staff(
  p_type text,
  p_title text,
  p_body text default null,
  p_link text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications (user_id, type, title, body, link)
  select id, p_type, p_title, p_body, p_link
  from public.users
  where role in ('admin', 'staff', 'founder');
end;
$$;

grant execute on function public.notify_staff(text, text, text, text) to authenticated;

-- Convenience wrapper: notify the client who owns a given clients.id row.
-- Every trigger below already has a client_id (directly or via a join) —
-- this just avoids repeating "look up user_id, insert" in each one.
create or replace function public.notify_client_by_client_id(
  p_client_id uuid,
  p_type text,
  p_title text,
  p_body text default null,
  p_link text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
begin
  select user_id into v_user_id from public.clients where id = p_client_id;
  if v_user_id is not null then
    insert into public.notifications (user_id, type, title, body, link)
    values (v_user_id, p_type, p_title, p_body, p_link);
  end if;
end;
$$;

grant execute on function public.notify_client_by_client_id(uuid, text, text, text, text) to authenticated;

-- ------------------------------------------------------------------
-- Orders: new order -> staff
-- ------------------------------------------------------------------
create or replace function public.notify_on_new_order()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_code text;
begin
  v_order_code := 'ORD-' || upper(substring(new.id::text from 1 for 8));
  perform public.notify_staff(
    'order_new',
    'New order received',
    new.full_name || ' submitted a new order (' || v_order_code || ').',
    '/orders'
  );
  return new;
end;
$$;

drop trigger if exists orders_notify_staff_after_insert on public.orders;
create trigger orders_notify_staff_after_insert
  after insert on public.orders
  for each row execute function public.notify_on_new_order();

-- ------------------------------------------------------------------
-- Orders: status changes -> client (quotation sent / accepted / flagged /
-- rejected / paid), and payment submitted -> staff. One function, several
-- branches on the transition — mirrors @nimia/discord's notifyPaymentSubmitted
-- vs notifyPaymentVerified vs notifyPaymentFlagged split, collapsed into
-- one trigger since they all fire off the same `orders` UPDATE. Fires
-- regardless of whether the UPDATE came from a plain apps/admin action or
-- from inside a SECURITY DEFINER RPC (submit_payment_transaction, 0020;
-- accept_negotiation_offer / reject_negotiation_offer, 0019) — Postgres
-- triggers fire on the write itself, not on who/what issued it, which is
-- exactly why this is more robust than a per-call-site notify() call.
-- ------------------------------------------------------------------
create or replace function public.notify_on_order_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_code text;
begin
  if new.status = old.status then
    return new;
  end if;

  v_order_code := 'ORD-' || upper(substring(new.id::text from 1 for 8));

  if new.status = 'quotation_sent' then
    perform public.notify_client_by_client_id(
      new.client_id, 'order_status', 'Quotation ready',
      'Your quotation for ' || v_order_code || ' is ready to review.', '/dashboard/orders'
    );
  elsif new.status = 'awaiting_payment' and old.status = 'payment_submitted' then
    perform public.notify_client_by_client_id(
      new.client_id, 'order_status', 'Payment needs attention',
      coalesce('Your payment for ' || v_order_code || ' could not be verified: ' || new.payment_underpaid_note,
               'Your payment for ' || v_order_code || ' could not be verified. Please check your dashboard.'),
      '/dashboard/orders'
    );
  elsif new.status = 'awaiting_payment' then
    perform public.notify_client_by_client_id(
      new.client_id, 'order_status', 'Ready for payment',
      'The price for ' || v_order_code || ' is agreed — you can now submit payment.', '/dashboard/orders'
    );
  elsif new.status = 'rejected' then
    perform public.notify_client_by_client_id(
      new.client_id, 'order_status', 'Order declined',
      'Your order ' || v_order_code || ' was declined. Contact support if you have questions.', '/dashboard/orders'
    );
  elsif new.status = 'payment_submitted' then
    perform public.notify_staff(
      'order_payment_submitted', 'Payment submitted for review',
      'A payment for ' || v_order_code || ' is waiting for verification.', '/orders'
    );
  elsif new.status = 'paid' then
    perform public.notify_client_by_client_id(
      new.client_id, 'order_status', 'Payment verified',
      'Your payment for ' || v_order_code || ' has been verified. Your project is starting soon!', '/dashboard/orders'
    );
  end if;

  return new;
end;
$$;

drop trigger if exists orders_notify_after_status_change on public.orders;
create trigger orders_notify_after_status_change
  after update on public.orders
  for each row execute function public.notify_on_order_status_change();

-- ------------------------------------------------------------------
-- Negotiation offers: client -> staff, staff -> client
-- ------------------------------------------------------------------
create or replace function public.notify_on_order_negotiation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order record;
  v_order_code text;
begin
  select client_id, full_name into v_order from public.orders where id = new.order_id;
  if v_order is null then
    return new;
  end if;
  v_order_code := 'ORD-' || upper(substring(new.order_id::text from 1 for 8));

  if new.proposed_by = 'client' then
    perform public.notify_staff(
      'order_negotiation_offer', 'New negotiation offer',
      coalesce(v_order.full_name, 'A client') || ' sent an offer for ' || v_order_code || '.',
      '/orders'
    );
  elsif new.proposed_by = 'staff' then
    perform public.notify_client_by_client_id(
      v_order.client_id, 'order_negotiation_offer', 'New counter offer',
      'Nimia Studio sent a counter offer for ' || v_order_code || '.',
      '/dashboard/negotiations'
    );
  end if;

  return new;
end;
$$;

drop trigger if exists order_negotiations_notify_after_insert on public.order_negotiations;
create trigger order_negotiations_notify_after_insert
  after insert on public.order_negotiations
  for each row execute function public.notify_on_order_negotiation();

-- ------------------------------------------------------------------
-- Support tickets: new -> staff, closed -> client
-- ------------------------------------------------------------------
create or replace function public.notify_on_new_support_ticket()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.notify_staff(
    'support_ticket_new', 'New support ticket',
    coalesce(new.full_name, new.company_name, 'A client') || ' opened a ticket: ' || new.subject,
    '/tickets'
  );
  return new;
end;
$$;

drop trigger if exists support_tickets_notify_staff_after_insert on public.support_tickets;
create trigger support_tickets_notify_staff_after_insert
  after insert on public.support_tickets
  for each row execute function public.notify_on_new_support_ticket();

create or replace function public.notify_on_support_ticket_closed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'closed' and old.status is distinct from 'closed' then
    perform public.notify_client_by_client_id(
      new.client_id, 'support_ticket_closed', 'Support ticket closed',
      'Your ticket "' || new.subject || '" has been closed.', '/dashboard/support'
    );
  end if;
  return new;
end;
$$;

drop trigger if exists support_tickets_notify_client_after_update on public.support_tickets;
create trigger support_tickets_notify_client_after_update
  after update on public.support_tickets
  for each row execute function public.notify_on_support_ticket_closed();

-- ------------------------------------------------------------------
-- Projects: status changes -> client (production started / revision /
-- final review / completed / etc). Deliberately only on UPDATE, not
-- INSERT — a brand-new project is created either from convertToProjectAction
-- or automatically when an order is marked paid (0029), and the client
-- already gets an "order status" notification for the payment itself
-- (see notify_on_order_status_change above) — notifying again the instant
-- the project row first appears would just be a near-duplicate.
-- ------------------------------------------------------------------
create or replace function public.notify_on_project_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_label text;
begin
  if tg_op <> 'UPDATE' or new.status = old.status then
    return new;
  end if;

  v_label := case new.status::text
    when 'pending_review' then 'Pending Review'
    when 'quotation' then 'Quotation'
    when 'waiting_payment' then 'Pending Payment'
    when 'paid' then 'Paid'
    when 'planning' then 'Planning'
    when 'in_progress' then 'In Production'
    when 'revision' then 'Review Stage'
    when 'final_review' then 'Final Review'
    when 'completed' then 'Completed'
    when 'cancelled' then 'Cancelled'
    else new.status::text
  end;

  perform public.notify_client_by_client_id(
    new.client_id, 'project_status',
    case when new.status = 'completed' then 'Project completed' else 'Project update' end,
    '"' || new.title || '" is now: ' || v_label,
    '/dashboard/projects'
  );

  return new;
end;
$$;

drop trigger if exists projects_notify_client_after_status_change on public.projects;
create trigger projects_notify_client_after_status_change
  after update on public.projects
  for each row execute function public.notify_on_project_status_change();

-- ------------------------------------------------------------------
-- Project deliverables: new file from staff -> client
-- ------------------------------------------------------------------
create or replace function public.notify_on_project_deliverable()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_project record;
begin
  if new.file_type <> 'deliverable' then
    return new;
  end if;

  select client_id, title into v_project from public.projects where id = new.project_id;
  if v_project is null then
    return new;
  end if;

  perform public.notify_client_by_client_id(
    v_project.client_id, 'project_deliverable', 'New file delivered',
    'A new file was added to "' || v_project.title || '": ' || new.file_name,
    '/dashboard/deliveries'
  );

  return new;
end;
$$;

drop trigger if exists project_files_notify_client_after_insert on public.project_files;
create trigger project_files_notify_client_after_insert
  after insert on public.project_files
  for each row execute function public.notify_on_project_deliverable();

-- ------------------------------------------------------------------
-- Referral signup -> the partner whose code was used. Extends
-- handle_new_auth_user() one more time (0006 -> 0007 -> 0016 -> 0030 ->
-- here) — same "safe to run multiple times, just repoints the existing
-- trigger" pattern every prior extension of this function used. Full body
-- copied from 0030's version with ONE addition: a notification insert
-- right after a referral is actually recorded.
-- ------------------------------------------------------------------
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
  v_referrer_user_id uuid;
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

      -- Added here (0032): let the partner know someone used their code,
      -- the moment it's actually recorded (FOUND is only true when the
      -- insert above wasn't skipped by ON CONFLICT).
      if found then
        select user_id into v_referrer_user_id from public.partners where id = v_referrer_partner_id;
        if v_referrer_user_id is not null then
          insert into public.notifications (user_id, type, title, body, link)
          values (
            v_referrer_user_id,
            'referral_signup',
            'Someone used your referral code!',
            coalesce(new.raw_user_meta_data ->> 'full_name', 'A new client') || ' just signed up using your referral link.',
            '/dashboard/partners'
          );
        end if;
      end if;
    end if;
  end if;

  return new;
end;
$$;
