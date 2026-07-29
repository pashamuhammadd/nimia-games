-- ============================================================
-- 0005: invoices, invoice items, payments, receipts, and the
-- INV-YYYYMMDD-#### / RCT-YYYYMMDD-#### auto numbering
-- ============================================================

-- Per (date, prefix) atomic counter, so numbering is safe even if two
-- invoices are created at the same instant.
create table public.document_counters (
  doc_date date not null,
  doc_prefix text not null,
  last_number integer not null default 0,
  primary key (doc_date, doc_prefix)
);

create or replace function public.next_document_number(prefix text)
returns text
language plpgsql
as $$
declare
  today date := current_date;
  seq integer;
begin
  insert into public.document_counters (doc_date, doc_prefix, last_number)
  values (today, prefix, 1)
  on conflict (doc_date, doc_prefix)
  do update set last_number = public.document_counters.last_number + 1
  returning last_number into seq;

  return prefix || '-' || to_char(today, 'YYYYMMDD') || '-' || lpad(seq::text, 4, '0');
end;
$$;

-- invoices ---------------------------------------------------------------
create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_number text not null unique default public.next_document_number('INV'),
  client_id uuid not null references public.clients (id) on delete cascade,
  project_id uuid references public.projects (id) on delete set null,
  status public.invoice_status not null default 'draft',
  issue_date date not null default current_date,
  due_date date,
  subtotal numeric(12, 2) not null default 0,
  discount numeric(12, 2) not null default 0,
  tax numeric(12, 2) not null default 0,
  total numeric(12, 2) not null default 0,
  payment_method text,
  notes text,
  pdf_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_invoices_updated_at
  before update on public.invoices
  for each row execute function public.set_updated_at();

create table public.invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices (id) on delete cascade,
  description text not null,
  qty numeric(10, 2) not null default 1,
  unit_price numeric(12, 2) not null default 0,
  subtotal numeric(12, 2) generated always as (qty * unit_price) stored
);

-- payments -----------------------------------------------------------------
-- A client can submit a payment record (with proof) which starts as
-- 'pending'; only an admin can flip it to 'verified' or 'rejected'.
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices (id) on delete cascade,
  amount numeric(12, 2) not null,
  method text,
  proof_url text,
  status public.payment_status not null default 'pending',
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

-- receipts -------------------------------------------------------------------
-- Never inserted directly by the app — created automatically by the
-- trigger below when a payment is marked 'verified' ("Mark as Paid").
create table public.receipts (
  id uuid primary key default gen_random_uuid(),
  receipt_number text not null unique default public.next_document_number('RCT'),
  invoice_id uuid not null references public.invoices (id) on delete cascade,
  payment_id uuid not null references public.payments (id) on delete cascade,
  pdf_url text,
  created_at timestamptz not null default now()
);

create or replace function public.handle_payment_verified()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'verified' and old.status is distinct from 'verified' then
    insert into public.receipts (invoice_id, payment_id)
    values (new.invoice_id, new.id);

    update public.invoices
    set status = 'paid'
    where id = new.invoice_id;
  end if;
  return new;
end;
$$;

-- This trigger only fires on UPDATE, so referencing OLD here is always
-- safe (unlike the INSERT-or-UPDATE trigger in 0003).
create trigger payments_after_verified
  after update on public.payments
  for each row execute function public.handle_payment_verified();
