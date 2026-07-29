-- ============================================================
-- 0010: drop the em dash from `services.description` for "Custom Project"
--
-- 0009 translated all descriptions to English but left one em dash in the
-- "Custom Project" row. Small follow-up fix, safe to re-run any number of
-- times.
-- ============================================================

update public.services
set description = 'Custom project outside the categories above. Discuss the details via this form.'
where name = 'Custom Project';
