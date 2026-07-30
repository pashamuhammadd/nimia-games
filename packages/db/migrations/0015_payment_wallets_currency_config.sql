-- ============================================================
-- 0015: real wallet addresses + accepted-currency policy per network
--
-- Replaces the Phase 1 PLACEHOLDER addresses from 0013 with the founder's
-- actual wallets, adds the Solana/Cardano/TON rows 0013 left for later,
-- and encodes the founder's payment policy as data (not app code) so
-- the buyer-facing payment page (Phase 3, not yet built) has a single
-- source of truth to read from:
--
--   "Accept any network, never the project's own token. On each chain,
--   accept USD-pegged stablecoins at face value (no conversion), and
--   ALSO accept the chain's native coin — but a native-coin payment must
--   be converted to USD using a LIVE exchange rate at the moment the
--   invoice is generated, never treated as if it were already USD."
--
-- stablecoin_symbols — accepted 1:1, no rate lookup needed.
-- native_symbol + allow_native — the chain's own coin is accepted too;
--   whatever computes orders.payment_expected_amount for a native-coin
--   order MUST fetch a live rate (e.g. CoinGecko) for native_symbol and
--   divide final_price_usd by it. Never assume native_symbol == USD.
--
-- BUSD (originally requested alongside USDT/USDC for BSC) is deliberately
-- NOT seeded here: Binance/Paxos discontinued minting it back in 2023 and
-- phased out exchange support (converted balances to FDUSD), so it's not
-- a currency real buyers can still reliably acquire. If you'd rather
-- accept a modern BSC stablecoin alternative (e.g. FDUSD), add it with:
--   update public.payment_wallets set stablecoin_symbols = array['USDT','USDC','FDUSD'] where network = 'bsc';
-- Same idea applies to any other "dollar lain" you want to add later on
-- any network — just append to that network's stablecoin_symbols array.
--
-- IMPORTANT — run this AFTER 0014 has been committed on its own (this
-- file's INSERT for the 'ton' row needs that enum value to already exist).
-- ============================================================

alter table public.payment_wallets
  add column stablecoin_symbols text[] not null default '{}',
  add column native_symbol text,
  add column allow_native boolean not null default true;

-- Ethereum — EVM address; ERC-20 USDT/USDC accepted at face value, native
-- ETH accepted at live rate.
update public.payment_wallets
set address = '0x18725dc47ddcb3da8cae11d1c08d8b76f22f3aa3',
    stablecoin_symbols = array['USDT', 'USDC'],
    native_symbol = 'ETH',
    allow_native = true
where network = 'ethereum';

-- BSC — same EVM address as Ethereum (both chains share the 0x address
-- format); BEP-20 USDT/USDC accepted at face value, native BNB at live
-- rate. See note above re: BUSD.
update public.payment_wallets
set address = '0x18725dc47ddcb3da8cae11d1c08d8b76f22f3aa3',
    stablecoin_symbols = array['USDT', 'USDC'],
    native_symbol = 'BNB',
    allow_native = true
where network = 'bsc';

-- Tron — TRC-20 USDT accepted at face value, native TRX at live rate.
update public.payment_wallets
set address = 'TQtTFMTGtmDeyki3rcJejDki9s8YCfceXt',
    stablecoin_symbols = array['USDT'],
    native_symbol = 'TRX',
    allow_native = true
where network = 'tron';

-- Solana, Cardano, TON — new rows (0013 only seeded ethereum/bsc/tron).
insert into public.payment_wallets (network, address, is_active, stablecoin_symbols, native_symbol, allow_native)
values
  -- Solana — SPL USDT/USDC at face value, native SOL at live rate.
  ('solana', '5MMwK6gmjewbmdNt9iibFpeoHRGkRXq7FXszBdAFMQs6', true, array['USDT', 'USDC'], 'SOL', true),
  -- Cardano — no stablecoin seeded yet (nothing as universally liquid as
  -- USDT/USDC on this chain today); native ADA accepted at live rate.
  -- Add one later the same way as the BSC/FDUSD example above if needed.
  ('cardano', 'addr1vx7qluz2gxcs5cw9nm6kec8a7ycr27z8evflr7cfehrm88grkeuth', true, array[]::text[], 'ADA', true),
  -- TON — USDT (Tether issues natively on TON) at face value, native TON
  -- at live rate.
  ('ton', 'UQAPuGraB2dF_jA-ilFuhcy0ZEhsvieT6rWCpC9b8MuozY_9', true, array['USDT'], 'TON', true);
