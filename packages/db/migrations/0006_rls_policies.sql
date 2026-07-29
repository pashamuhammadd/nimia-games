-- ============================================================
-- 0006: signup trigger + Row Level Security on every table
--
-- Security model: a client can only ever see/touch rows tied to their own
-- client_id (directly, or transitively through project_id/invoice_id).
-- An admin (public.users.role = 'admin') can see/touch everything. This
-- is enforced at the DATABASE level, not just in the UI, because
-- studio.nimiagames.com/client/[client_id] is a URL a client can type
-- directly.
-- ============================================================

-- ------------------------------------------------------------------
-- Helpers. Both are SECURITY DEFINER so they bypass RLS internally —
-- without this, is_admin() querying public.users would re-trigger the
-- users_select policy, which itself could call is_admin(), causing
-- infinite recursion.
-- ------------------------------------------------------------------

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.users where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.is_owner_client(check_client_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.clients
    where id = check_client_id and user_id = auth.uid()
  );
$$;

-- Auto-create a public.users profile row whenever someone signs up via
-- Supabase Auth. Also SECURITY DEFINER, since public.users has no direct
-- INSERT policy for regular users (see 0001).
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- ------------------------------------------------------------------
-- Enable RLS everywhere
-- ------------------------------------------------------------------

alter table public.users enable row level security;
alter table public.clients enable row level security;
alter table public.services enable row level security;
alter table public.portfolio_categories enable row level security;
alter table public.portfolio_tags enable row level security;
alter table public.portfolio enable row level security;
alter table public.portfolio_tag_map enable row level security;
alter table public.orders enable row level security;
alter table public.order_files enable row level security;
alter table public.projects enable row level security;
alter table public.project_updates enable row level security;
alter table public.messages enable row level security;
alter table public.project_files enable row level security;
alter table public.notifications enable row level security;
alter table public.email_logs enable row level security;
alter table public.invoices enable row level security;
alter table public.invoice_items enable row level security;
alter table public.payments enable row level security;
alter table public.receipts enable row level security;

-- ------------------------------------------------------------------
-- users — no insert policy on purpose (rows only created via the
-- on_auth_user_created trigger above).
-- ------------------------------------------------------------------

create policy "users_select_self_or_admin" on public.users
  for select using (id = auth.uid() or public.is_admin());

create policy "users_update_self_or_admin" on public.users
  for update using (id = auth.uid() or public.is_admin());

-- ------------------------------------------------------------------
-- clients
-- ------------------------------------------------------------------

create policy "clients_select_self_or_admin" on public.clients
  for select using (user_id = auth.uid() or public.is_admin());

create policy "clients_insert_self" on public.clients
  for insert with check (user_id = auth.uid());

create policy "clients_update_self_or_admin" on public.clients
  for update using (user_id = auth.uid() or public.is_admin());

-- ------------------------------------------------------------------
-- services & portfolio — public catalog data, admin-managed
-- ------------------------------------------------------------------

create policy "services_public_read_active" on public.services
  for select using (is_active or public.is_admin());

create policy "services_admin_write" on public.services
  for all using (public.is_admin()) with check (public.is_admin());

create policy "portfolio_categories_public_read" on public.portfolio_categories
  for select using (true);

create policy "portfolio_categories_admin_write" on public.portfolio_categories
  for all using (public.is_admin()) with check (public.is_admin());

create policy "portfolio_tags_public_read" on public.portfolio_tags
  for select using (true);

create policy "portfolio_tags_admin_write" on public.portfolio_tags
  for all using (public.is_admin()) with check (public.is_admin());

create policy "portfolio_public_read_published" on public.portfolio
  for select using (is_published or public.is_admin());

create policy "portfolio_admin_write" on public.portfolio
  for all using (public.is_admin()) with check (public.is_admin());

create policy "portfolio_tag_map_public_read" on public.portfolio_tag_map
  for select using (true);

create policy "portfolio_tag_map_admin_write" on public.portfolio_tag_map
  for all using (public.is_admin()) with check (public.is_admin());

-- ------------------------------------------------------------------
-- orders — a client can create + read their own; only admin updates
-- (status changes, converting to a project).
-- ------------------------------------------------------------------

create policy "orders_select_own_or_admin" on public.orders
  for select using (public.is_owner_client(client_id) or public.is_admin());

create policy "orders_insert_own" on public.orders
  for insert with check (public.is_owner_client(client_id));

create policy "orders_update_admin_only" on public.orders
  for update using (public.is_admin());

create policy "order_files_select_own_or_admin" on public.order_files
  for select using (
    exists (
      select 1 from public.orders
      where orders.id = order_files.order_id
        and (public.is_owner_client(orders.client_id) or public.is_admin())
    )
  );

create policy "order_files_insert_own" on public.order_files
  for insert with check (
    exists (
      select 1 from public.orders
      where orders.id = order_files.order_id
        and public.is_owner_client(orders.client_id)
    )
  );

-- ------------------------------------------------------------------
-- projects — read-only for the owning client, admin manages everything
-- ------------------------------------------------------------------

create policy "projects_select_own_or_admin" on public.projects
  for select using (public.is_owner_client(client_id) or public.is_admin());

create policy "projects_admin_write" on public.projects
  for all using (public.is_admin()) with check (public.is_admin());

create policy "project_updates_select_own_or_admin" on public.project_updates
  for select using (
    exists (
      select 1 from public.projects
      where projects.id = project_updates.project_id
        and (public.is_owner_client(projects.client_id) or public.is_admin())
    )
  );

create policy "project_updates_admin_write" on public.project_updates
  for insert with check (public.is_admin());

-- ------------------------------------------------------------------
-- messages — both sides can read + post on projects they belong to
-- ------------------------------------------------------------------

create policy "messages_select_own_or_admin" on public.messages
  for select using (
    exists (
      select 1 from public.projects
      where projects.id = messages.project_id
        and (public.is_owner_client(projects.client_id) or public.is_admin())
    )
  );

create policy "messages_insert_own_or_admin" on public.messages
  for insert with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.projects
      where projects.id = messages.project_id
        and (public.is_owner_client(projects.client_id) or public.is_admin())
    )
  );

-- ------------------------------------------------------------------
-- project_files — client can view/download, only admin uploads
-- deliverables (client-submitted reference files go through order_files
-- or messages.attachment_url instead).
-- ------------------------------------------------------------------

create policy "project_files_select_own_or_admin" on public.project_files
  for select using (
    exists (
      select 1 from public.projects
      where projects.id = project_files.project_id
        and (public.is_owner_client(projects.client_id) or public.is_admin())
    )
  );

create policy "project_files_admin_write" on public.project_files
  for all using (public.is_admin()) with check (public.is_admin());

-- ------------------------------------------------------------------
-- notifications
-- ------------------------------------------------------------------

create policy "notifications_select_own" on public.notifications
  for select using (user_id = auth.uid() or public.is_admin());

create policy "notifications_update_own" on public.notifications
  for update using (user_id = auth.uid());

-- ------------------------------------------------------------------
-- email_logs — internal audit trail, never shown to clients
-- ------------------------------------------------------------------

create policy "email_logs_admin_only" on public.email_logs
  for all using (public.is_admin()) with check (public.is_admin());

-- ------------------------------------------------------------------
-- invoices / invoice_items — read-only for the owning client
-- ------------------------------------------------------------------

create policy "invoices_select_own_or_admin" on public.invoices
  for select using (public.is_owner_client(client_id) or public.is_admin());

create policy "invoices_admin_write" on public.invoices
  for all using (public.is_admin()) with check (public.is_admin());

create policy "invoice_items_select_own_or_admin" on public.invoice_items
  for select using (
    exists (
      select 1 from public.invoices
      where invoices.id = invoice_items.invoice_id
        and (public.is_owner_client(invoices.client_id) or public.is_admin())
    )
  );

create policy "invoice_items_admin_write" on public.invoice_items
  for all using (public.is_admin()) with check (public.is_admin());

-- ------------------------------------------------------------------
-- payments — client can submit a payment (proof of transfer) for their
-- own invoice; only admin can verify/reject it.
-- ------------------------------------------------------------------

create policy "payments_select_own_or_admin" on public.payments
  for select using (
    exists (
      select 1 from public.invoices
      where invoices.id = payments.invoice_id
        and (public.is_owner_client(invoices.client_id) or public.is_admin())
    )
  );

create policy "payments_insert_own" on public.payments
  for insert with check (
    exists (
      select 1 from public.invoices
      where invoices.id = payments.invoice_id
        and public.is_owner_client(invoices.client_id)
    )
  );

create policy "payments_update_admin_only" on public.payments
  for update using (public.is_admin());

-- ------------------------------------------------------------------
-- receipts — read-only, only ever written by the trigger in 0005
-- ------------------------------------------------------------------

create policy "receipts_select_own_or_admin" on public.receipts
  for select using (
    exists (
      select 1 from public.invoices
      where invoices.id = receipts.invoice_id
        and (public.is_owner_client(invoices.client_id) or public.is_admin())
    )
  );

create policy "receipts_admin_write" on public.receipts
  for all using (public.is_admin()) with check (public.is_admin());
