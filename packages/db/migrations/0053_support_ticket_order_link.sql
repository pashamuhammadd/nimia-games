-- ============================================================
-- 0053: Support ticket <-> order link — lets a support ticket record WHICH
-- order it's about, so the Discord thread name can reflect the order's own
-- reference/title instead of a generic ticket id, and so a client can open
-- a ticket about ONE SPECIFIC order from that order's own detail view
-- (OrderDetail.tsx), not just the general /dashboard/support form. See
-- project memory's discord_integration.md, 19 Agustus 2026 pass — per user
-- request: (1) every order needs its own "discuss on Discord" entry point,
-- (2) a client must connect Discord before a ticket is created, (3) the
-- Discord thread name must match the order's own name/reference.
--
-- Deliberately nullable + ON DELETE SET NULL — a ticket opened from the
-- general /dashboard/support form (no specific order in mind) is still a
-- fully valid ticket with no order attached, exactly like before this
-- migration.
-- ============================================================

alter table public.support_tickets
  add column order_id uuid references public.orders (id) on delete set null;

comment on column public.support_tickets.order_id is
  'Order this ticket is about, when opened via a "Discuss this order on Discord" button tied to a specific order (OrderDetail.tsx, or the post-submit confirmation screen''s "Discuss this brief on Discord" button). Null for a ticket opened from the general /dashboard/support form with no specific order in mind.';

-- Widen support_tickets_insert_own (0027) so a client can only ever link a
-- ticket to an order THEY own — same "kolom tidak dikunci" precaution as
-- every other client-writable FK in this schema (see e.g. 0026's/0027's own
-- SECURITY DEFINER functions). createSupportTicketAction (apps/app)
-- already re-verifies the order belongs to the caller server-side before
-- inserting; this is the defense-in-depth RLS backstop for that same rule.
drop policy if exists "support_tickets_insert_own" on public.support_tickets;

create policy "support_tickets_insert_own" on public.support_tickets
  for insert with check (
    public.is_owner_client(client_id)
    and (
      order_id is null
      or exists (
        select 1 from public.orders o
        where o.id = order_id and public.is_owner_client(o.client_id)
      )
    )
  );
