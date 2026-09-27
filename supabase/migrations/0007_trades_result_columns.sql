-- ============================================================================
-- Migration 0007: add the missing result columns to `trades`
-- ----------------------------------------------------------------------------
-- THE PROBLEM
-- The match engine (socket/server.js -> saveTrade) saves every trade with
-- three extra fields: realized_pnl, resulting_side and resulting_notional.
-- The `trades` table never had those columns, so every insert failed and
-- the table stayed empty (0 rows after 41 completed matches on 2026-09-27).
-- The error was ignored, so nobody noticed.
--
-- THE FIX
-- Add the three columns. They are nullable so older code (or a row written
-- before this migration) still fits. `if not exists` makes this safe to re-run.
-- ============================================================================

alter table public.trades
  -- Profit/loss this one trade locked in (0 when it only opened/added).
  add column if not exists realized_pnl numeric,
  -- The player's position AFTER the trade: 'long', 'short' or 'flat'.
  -- Uses the same type as match_players.current_side.
  add column if not exists resulting_side public.position_side,
  -- Size of the position AFTER the trade, in USDT (always positive).
  add column if not exists resulting_notional numeric;
