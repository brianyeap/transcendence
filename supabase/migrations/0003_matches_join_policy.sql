-- ============================================================================
-- Migration 0003: Allow a second player to JOIN an open room
-- ----------------------------------------------------------------------------
-- `matches` has RLS enabled with SELECT / INSERT / DELETE policies, but no
-- UPDATE policy. Joining a room is an UPDATE (it sets player_two_user_id and
-- moves the room into countdown), so without an UPDATE policy Postgres blocks
-- it and the update changes 0 rows -> the app shows "This room was just taken."
--
-- This policy lets a logged-in user update a room ONLY to join it as player two:
--   * `using`  (which existing rows they may update): the room must still be
--     open  -> status 'waiting', no player two yet, and not their own room.
--   * `with check` (what the row may become): they can only put THEMSELVES in
--     the player_two slot. They can't join a room on someone else's behalf, and
--     once a room has started (status is no longer 'waiting') this policy no
--     longer applies, so players can't tamper with a live match.
--
-- Safe to run more than once.
-- ============================================================================

drop policy if exists "join open room as player two" on matches;
create policy "join open room as player two"
  on matches for update to authenticated
  using (
    status = 'waiting'
    and player_two_user_id is null
    and player_one_user_id <> auth.uid()
  )
  with check (
    player_two_user_id = auth.uid()
  );
