-- ============================================================
-- 0042: Nimia Creative Agent — uploaded_assets + order_id
--
-- Extends creative_agent_sessions (0041) for Priorities 5-7 of the
-- product brief (13 Agustus 2026): asset upload during the chat, the
-- polished Creative Brief view, and linking a confirmed session into
-- `orders` once the client clicks "Submit Order" / "Negotiate Price".
-- ============================================================

alter table public.creative_agent_sessions
  -- Files the visitor attached mid-conversation, uploaded straight to
  -- Cloudinary from the browser (same signed-upload pattern as
  -- modules/order/state/get-upload-signature-action.ts, just scoped by
  -- session_token instead of an authenticated user — see
  -- modules/creative-agent/state/get-creative-agent-upload-signature-
  -- action.ts). Shape: [{ name: text, url: text }, ...]. Deliberately its
  -- own column, not folded into structured_data — this is never something
  -- the AI writes, only the attach-asset route branch.
  add column uploaded_assets jsonb not null default '[]'::jsonb,

  -- Set once the confirmed brief actually becomes an order (client clicked
  -- Submit Order or Negotiate Price and was signed in) — see
  -- modules/creative-agent/state/submit-creative-agent-order-action.ts.
  -- Doubles as the idempotency guard: a second click (double-submit,
  -- browser back button, etc.) on an already-linked session returns the
  -- existing order instead of creating a duplicate one. Nullable/
  -- on-delete-set-null because an order being deleted should never cascade
  -- into silently deleting someone's chat history.
  add column order_id uuid references public.orders (id) on delete set null;

comment on column public.creative_agent_sessions.uploaded_assets is
  'Reference files the visitor attached mid-chat via the signed Cloudinary upload flow, [{name,url}, ...]. Never written by the AI.';
comment on column public.creative_agent_sessions.order_id is
  'Set once this session is submitted as a real order (Submit Order / Negotiate Price, requires sign-in). Also the idempotency guard against double-submission.';

create index creative_agent_sessions_order_id_idx
  on public.creative_agent_sessions (order_id)
  where order_id is not null;
