-- ============================================================
-- 0014: extend crypto_network with 'ton'
--
-- The founder's real wallet set includes a TON address alongside the
-- original Phase 1 trio (Ethereum/BSC/Tron) and the Phase 2 additions
-- already anticipated in 0013's comments (Solana/Cardano). TON was not
-- one of the 5 values in that original enum, so it needs its own
-- ALTER TYPE before 0015 can insert a payment_wallets row for it.
--
-- IMPORTANT — run this BY ITSELF (its own "Run" in the SQL editor),
-- separately from 0015, which references 'ton'. Same restriction as
-- 0011/0012: Postgres will not let a transaction reference an enum value
-- it just added in that same transaction.
-- ============================================================

alter type public.crypto_network add value 'ton';
