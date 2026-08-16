-- ============================================================
-- 0046: Animation Validation — order_files.is_character_reference
--
-- Fase 5 of the 16 Agustus 2026 Order/Payment/Invoice/Creative Agent
-- refactor (see FASE0-AUDIT.md's Implementation Order, item 5). The audit's
-- section E ("Animation Requirements") found the Animation category
-- (data/categories/animation.ts, id: "animation") had zero server-side
-- validation anywhere: Script was a missing field entirely, Character
-- Images had no tagging mechanism to even distinguish them from any other
-- uploaded file, and Deadline was optional everywhere despite being
-- effectively mandatory for an animation brief.
--
-- This migration is the one schema change that work needs: a way to tell,
-- per row, whether an `order_files` upload was submitted through the
-- dedicated "Character Reference Images" zone (client/types code calls this
-- `characterReferenceFiles`, kept separate in wizard state from the
-- generic `files` array) rather than the general attachments zone.
--
-- Additive/backward-compatible only, per this repo's standing migration
-- policy: existing rows default to false (they were all uploaded before
-- this distinction existed, through the generic zone), nothing is dropped
-- or renamed, and every other order_files consumer (order detail views,
-- admin file lists) keeps working unchanged since it can simply ignore the
-- new column.
--
-- Scope note (see FASE0-AUDIT.md discussion + this session's research):
-- deliberately does NOT touch the "packages"/Bundle order flow. Bundle
-- orders use `BundleCategory` ("web3"/"game"/"website",
-- data/bundle-packages.ts), a completely different taxonomy from
-- `CategoryDefinition.id` ("animation" etc.) with no "animation" bundle
-- category — there is nothing in that flow this validation could target.
-- ============================================================

alter table public.order_files
  add column if not exists is_character_reference boolean not null default false;

comment on column public.order_files.is_character_reference is
  'True when this file was uploaded through the Animation-only "Character Reference Images" zone (see apps/app/modules/order/components/upload-section.tsx + use-order-wizard.ts''s characterReferenceFiles state), as opposed to the generic attachments zone. Always false for non-Animation orders and for every order_files row created before 0046.';
