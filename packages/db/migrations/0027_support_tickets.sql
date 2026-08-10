-- ============================================================
-- 0027: Support tickets — docs/DISCORD.md's "Client support": "A 'Support'
-- button on the website → the bot creates a Private Ticket, visible only
-- to Founder + Admin + the Client who created it. No general chat channel
-- for support."
--
-- Fourth pass of the Discord integration (0025 = account linking, then a
-- notifications pass with no schema change, then 0026 =
-- auto-thread-per-order). Same core principle as
-- every migration before it: the website stays the single source of
-- truth. A ticket's `status` only ever changes via an explicit action ON
-- THE WEBSITE (an admin clicking "Close") — this integration never
-- listens for Discord-side events (no Gateway connection, see
-- docs/DISCORD.md's "Why no persistent bot process is needed"), so there
-- is no way to detect a thread being archived/closed manually inside
-- Discord itself and sync that back here. Staff should always close a
-- ticket from the admin dashboard, not just archive the thread in Discord.
-- ============================================================

create type public.support_ticket_status as enum ('open', 'closed');

create table public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  -- Denormalized snapshot at creation time, same convention `orders`
  -- already uses (0003_orders_projects.sql stores full_name/company_name
  -- directly rather than joining clients/users at read time) — keeps the
  -- admin tickets list a single-table query, and preserves what the
  -- client's name/email actually were at the moment they opened the
  -- ticket even if their profile changes later.
  full_name text,
  company_name text,
  email text not null,
  subject text not null,
  message text not null,
  status public.support_ticket_status not null default 'open',
  -- Discord private thread created by @nimia/discord's createSupportTicket
  -- right after this row is inserted (same pattern as
  -- orders.discord_thread_id, 0026) — null if Discord isn't configured or
  -- the API call failed; the ticket still exists and is still visible to
  -- staff in the admin dashboard either way.
  discord_thread_id text,
  closed_by uuid references public.users (id) on delete set null,
  closed_at timestamptz,
  created_at timestamptz not null default now()
);

comment on column public.support_tickets.discord_thread_id is
  'Discord PRIVATE thread id created by createSupportTicket (@nimia/discord). Null if the ticket predates Discord setup, or thread creation failed — the ticket is always tracked here regardless, this column is purely "is there also a Discord thread for staff to discuss this in".';

alter table public.support_tickets enable row level security;

-- Same shape as orders_select_own_or_admin / orders_insert_own /
-- orders_update_admin_only (0006_rls_policies.sql) — a client can create
-- and read their own tickets, only admin can change status (close it).
create policy "support_tickets_select_own_or_admin" on public.support_tickets
  for select using (public.is_owner_client(client_id) or public.is_admin());

create policy "support_tickets_insert_own" on public.support_tickets
  for insert with check (public.is_owner_client(client_id));

create policy "support_tickets_update_admin_only" on public.support_tickets
  for update using (public.is_admin());

-- ------------------------------------------------------------------
-- set_support_ticket_discord_thread_id
-- ------------------------------------------------------------------
--
-- SECURITY DEFINER — same reasoning as 0026's set_order_discord_thread_id:
-- support_tickets_update_admin_only blocks a client-side raw UPDATE
-- entirely, but createSupportTicketAction (apps/studio) still needs to
-- persist the thread id it gets back from createSupportTicket immediately
-- after inserting the ticket it just created.
create or replace function public.set_support_ticket_discord_thread_id(
  p_ticket_id uuid,
  p_thread_id text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.support_tickets
  set discord_thread_id = p_thread_id
  where id = p_ticket_id
    and (
      client_id in (select id from public.clients where user_id = auth.uid())
      or public.is_admin()
    );

  if not found then
    raise exception 'Ticket not found or not owned by the current user.';
  end if;
end;
$$;

grant execute on function public.set_support_ticket_discord_thread_id(uuid, text) to authenticated;
