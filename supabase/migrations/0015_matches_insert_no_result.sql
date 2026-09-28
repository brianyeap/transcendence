-- 0015_matches_insert_no_result.sql
--
-- Stop a player from planting a match result straight from the browser.
--
-- The "Users can create their own waiting matches" policy only checked
-- player_one_user_id, player_two_user_id, status and invited_user_id. It never
-- looked at winner_user_id, final_price or the timing columns. So a logged-in
-- player could POST to /rest/v1/matches (skipping /api/rooms) and insert a
-- `waiting` row that already named themselves the winner, with ends_at set in
-- the past. closeStaleMatches() (socket/server.js) then flipped that expired
-- row to `completed` without clearing the winner, and it counted as a real win
-- on the leaderboard.
--
-- Only the match engine (service role, which bypasses RLS) is ever allowed to
-- write a result. A player creating a room must insert a clean, empty match.

-- 1. Recreate the INSERT policy so a new match cannot carry any result or
--    timing values. Everything the old policy checked is kept; the new lines
--    force the result/timing columns to be empty on insert.
drop policy if exists "Users can create their own waiting matches" on public.matches;

create policy "Users can create their own waiting matches"
  on public.matches
  for insert
  to authenticated
  with check (
    player_one_user_id = auth.uid()
    and player_two_user_id is null
    and status = 'waiting'::public.match_status
    -- A fresh room has no result and hasn't started yet. Only the engine
    -- (service role) may set these later.
    and winner_user_id is null
    and final_price is null
    and starts_at is null
    and ends_at is null
    and countdown_starts_at is null
    -- A private room may only invite an accepted friend (unchanged).
    and (
      invited_user_id is null
      or exists (
        select 1
        from public.friends f
        where f.status = 'accepted'
          and (
            (f.user_id = auth.uid() and f.friend_id = matches.invited_user_id)
            or (f.user_id = matches.invited_user_id and f.friend_id = auth.uid())
          )
      )
    )
  );

-- 2. Defence in depth: even if a policy were ever loosened by mistake, the
--    database itself refuses a `waiting` row that carries a result or timing.
--    A waiting match has no winner, no price and no clock yet; those are only
--    filled once the engine moves the match past `waiting`.
--    NOT VALID: don't scan existing rows (there shouldn't be any offenders),
--    but enforce this on every new insert and update.
alter table public.matches
  add constraint matches_waiting_has_no_result
    check (
      status <> 'waiting'::public.match_status
      or (
        winner_user_id is null
        and final_price is null
        and starts_at is null
        and ends_at is null
        and countdown_starts_at is null
      )
    ) not valid;
