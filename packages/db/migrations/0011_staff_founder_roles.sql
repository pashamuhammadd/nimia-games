-- ============================================================
-- 0011: extend user_role with 'staff' and 'founder'
--
-- Tahap 5 roles (see docs/ARCHITECTURE.md, "Rancangan Arsitektur Tahap 5",
-- section 1): the old flat 'admin' role is being split in two:
--   - staff   — day-to-day order/negotiation/payment-verification work,
--               can NOT see the finance page.
--   - founder — everything staff can do, PLUS the finance page
--               (/finance in apps/admin). Exactly one account today
--               (yours), but kept as its own enum value from day one so
--               adding a second staff member later never needs another
--               role migration.
-- The old 'admin' enum value is intentionally left in place (dropping an
-- enum value that might still be referenced is unsafe/non-trivial in
-- Postgres) — no new row should ever be created with role = 'admin' again,
-- but any that exist keep working, since is_admin() is redefined in 0013
-- to mean "admin OR staff OR founder".
--
-- IMPORTANT — run this file BY ITSELF (its own "Run" in the SQL editor),
-- separately from 0012 and 0013. Postgres does not allow a newly-added
-- enum value to be referenced in the same transaction that added it —
-- pasting this together with a later file that USES 'staff'/'founder'
-- will fail with "unsafe use of new value of enum type".
-- ============================================================

alter type public.user_role add value 'staff';
alter type public.user_role add value 'founder';
