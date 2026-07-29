-- ============================================================
-- 0004: messages, project files, notifications, email logs
-- ============================================================

-- messages: per-project thread between the client and admin.
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  sender_id uuid not null references public.users (id) on delete cascade,
  body text not null,
  attachment_url text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

-- project_files: deliverables produced by the studio, and reference files
-- either side uploads. file_type distinguishes the two in the UI.
create table public.project_files (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  uploaded_by uuid references public.users (id) on delete set null,
  file_name text not null,
  file_url text not null,
  file_type public.project_file_type not null default 'deliverable',
  created_at timestamptz not null default now()
);

-- notifications: in-app notifications per user (order status changed,
-- new message, invoice ready, etc). `type` is a free-form string tag
-- (e.g. 'order_status', 'new_message', 'invoice_ready') so the UI can
-- route to the right icon/link without a rigid enum.
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

-- email_logs: audit trail of every Resend email sent (order created,
-- invoice sent, payment received, etc). Admin/internal only — not shown
-- to clients.
create table public.email_logs (
  id uuid primary key default gen_random_uuid(),
  recipient_email text not null,
  template text not null,
  event text not null,
  status text not null default 'sent',
  error_message text,
  sent_at timestamptz not null default now()
);
