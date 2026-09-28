-- 0013_match_settings_checks.sql
--
-- Database backstop for the create-match rules.
--
-- The rules live in lib/match/rules.ts. The create-match form checks them
-- (quick message) and /api/rooms checks them again (the real check).
-- But the "Users can create their own waiting matches" policy also lets a
-- logged-in player insert into `matches` straight from the browser, skipping
-- /api/rooms. These CHECKs make the database refuse bad values either way.
--
-- Keep these lists in sync with lib/match/rules.ts.

-- One very old row saved the market as 'BTC-USD'. Same market, new spelling.
update public.matches set symbol = 'BTC/USDT' where symbol = 'BTC-USD';

alter table public.matches
  -- Market: Bitcoin, Ethereum or Solana.
  add constraint matches_symbol_check
    check (symbol in ('BTC/USDT', 'ETH/USDT', 'SOL/USDT'));

-- The column default was 'BTCUSDT', which the check above would refuse.
alter table public.matches alter column symbol set default 'BTC/USDT';
