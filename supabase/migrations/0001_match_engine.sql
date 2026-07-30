-- ============================================================================
-- Migration 0001: Match engine tables
-- ----------------------------------------------------------------------------
-- This adds everything the two-player trading match needs on top of the
-- existing `matches` table:
--   * extra columns on `matches`   (countdown time, final price, winner, duration)
--   * `match_players`              (one row per player: balance + open position)
--   * `match_candles`              (the BTC price ticks we stream, saved for history)
--   * `trades`                     (a log of every buy/sell order that was accepted)
--
-- How to run it: open the Supabase project -> SQL editor -> paste this file -> Run.
--
-- Notes for readers:
--   * We use plain `text` columns with CHECK constraints (e.g. status can only be
--     'waiting' | 'countdown' | 'active' | 'completed') instead of Postgres enums.
--     It reads more simply and is easier to change later.
--   * Money/price columns use `numeric` so we don't get floating-point rounding
--     errors in the database.
--   * The match engine (the socket server) writes to these tables using the
--     Supabase *service role* key, which bypasses Row Level Security (RLS).
--     Normal logged-in users can only READ rows for matches they are part of.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. Add the new columns to the existing `matches` table.
--    `if not exists` means running this twice will not error.
-- ----------------------------------------------------------------------------
alter table matches
  add column if not exists countdown_starts_at timestamptz, -- when the pre-match countdown began
  add column if not exists starts_at            timestamptz, -- when trading starts (countdown end)
  add column if not exists ends_at              timestamptz, -- when the match ends
  add column if not exists duration_seconds     integer,     -- how long trading lasts (e.g. 120)
  add column if not exists final_price          numeric,     -- last BTC price, used to settle positions
  add column if not exists winner_user_id       uuid;        -- the player with the most money at the end


-- ----------------------------------------------------------------------------
-- 2. `match_players`: one row per player in a match.
--    This holds the player's money and their single open position.
-- ----------------------------------------------------------------------------
create table if not exists match_players (
  id       uuid primary key default gen_random_uuid(),
  match_id uuid not null references matches(id) on delete cascade,
  user_id  uuid not null,

  -- Money the player can still spend to open new positions.
  available_balance numeric not null,

  -- Total profit/loss the player has "locked in" from closed positions.
  realized_pnl numeric not null default 0,

  -- The player's current open position.
  -- current_side: 'long' (betting price goes up), 'short' (down), or 'flat' (no position).
  current_side           text not null default 'flat'
    check (current_side in ('long', 'short', 'flat')),
  position_notional_usdt numeric not null default 0, -- USDT amount tied up in the open position
  average_entry_price    numeric,                    -- price the position was opened at (null if flat)

  -- Filled in only when the match ends.
  final_capital numeric,
  result        text check (result in ('win', 'loss', 'draw')),

  created_at timestamptz not null default now(),

  -- A player can only appear once per match.
  unique (match_id, user_id)
);


-- ----------------------------------------------------------------------------
-- 3. `match_candles`: every BTC price tick we stream during a match.
--    We save them so the chart can be replayed in match history later.
-- ----------------------------------------------------------------------------
create table if not exists match_candles (
  id       uuid primary key default gen_random_uuid(),
  match_id uuid not null references matches(id) on delete cascade,

  sequence  integer     not null, -- 1, 2, 3... the order of ticks within this match
  open_time timestamptz not null,

  -- For the live-stream version we only have a single price per tick,
  -- so open = high = low = close = that price.
  open  numeric not null,
  high  numeric not null,
  low   numeric not null,
  close numeric not null,

  unique (match_id, sequence)
);


-- ----------------------------------------------------------------------------
-- 4. `trades`: a log of every accepted buy/sell order.
-- ----------------------------------------------------------------------------
create table if not exists trades (
  id       uuid primary key default gen_random_uuid(),
  match_id uuid not null references matches(id) on delete cascade,
  user_id  uuid not null,

  side            text    not null check (side in ('long', 'short')), -- what the player asked for
  amount_usdt     numeric not null,                                   -- size of the order
  execution_price numeric not null,                                   -- BTC price when it was filled
  realized_pnl    numeric not null default 0,                         -- profit/loss this order locked in

  -- The player's position AFTER this trade was applied.
  resulting_side     text    not null check (resulting_side in ('long', 'short', 'flat')),
  resulting_notional numeric not null,

  candle_sequence integer,                              -- which price tick this filled on
  executed_at     timestamptz not null default now()
);


-- ----------------------------------------------------------------------------
-- 5. Helpful indexes for looking up rows by match / user.
-- ----------------------------------------------------------------------------
create index if not exists match_players_match_idx on match_players (match_id);
create index if not exists match_candles_match_idx on match_candles (match_id);
create index if not exists trades_match_idx         on trades (match_id);
create index if not exists trades_user_idx          on trades (user_id);


-- ----------------------------------------------------------------------------
-- 6. Row Level Security (RLS).
--    Turn RLS on for every new table, then allow a logged-in user to READ only
--    rows that belong to a match they are playing in.
--    We add NO insert/update/delete policies, so normal users cannot write to
--    these tables at all. Only the socket engine (service role key) can write.
-- ----------------------------------------------------------------------------
alter table match_players enable row level security;
alter table match_candles enable row level security;
alter table trades        enable row level security;

-- Read your own match_players rows (rows where you are the player).
-- (We drop first so this whole file can be safely run more than once.)
drop policy if exists "read own match_players" on match_players;
create policy "read own match_players"
  on match_players for select
  using (user_id = auth.uid());

-- Read candles for matches you are part of.
drop policy if exists "read candles for my matches" on match_candles;
create policy "read candles for my matches"
  on match_candles for select
  using (
    exists (
      select 1 from matches m
      where m.id = match_candles.match_id
        and (m.player_one_user_id = auth.uid() or m.player_two_user_id = auth.uid())
    )
  );

-- Read trades for matches you are part of.
drop policy if exists "read trades for my matches" on trades;
create policy "read trades for my matches"
  on trades for select
  using (
    exists (
      select 1 from matches m
      where m.id = trades.match_id
        and (m.player_one_user_id = auth.uid() or m.player_two_user_id = auth.uid())
    )
  );
