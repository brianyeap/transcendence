-- ============================================================================
-- Migration 0011: invite a friend to a private room
-- ----------------------------------------------------------------------------
-- A room can now be made FOR one friend (invited_user_id). Only the creator
-- and that friend can see it. null = a normal public room, same as before.
-- ============================================================================

-- 1. Who the room is for (null = anyone can join).
alter table public.matches
    add column if not exists invited_user_id uuid
    references auth.users(id) on delete cascade;

-- 2. READ: everyone sees public waiting rooms. An invite room is only seen by
--    the invited friend (here) and the creator ("Players can view their matches").
drop policy if exists read_waiting_matches on public.matches;
create policy read_waiting_matches on public.matches
    for select to authenticated
    using (status = 'waiting' and (invited_user_id is null or invited_user_id = auth.uid()));

-- 3. CREATE: same as before, plus you may only invite an accepted friend.
--    (So nobody can skip our API and spam invites to strangers.)
drop policy if exists "Users can create their own waiting matches" on public.matches;
create policy "Users can create their own waiting matches" on public.matches
    for insert to authenticated
    with check (
        player_one_user_id = auth.uid()
        and player_two_user_id is null
        and status = 'waiting'
        and (
            invited_user_id is null
            or exists (
                select 1 from public.friends f
                where f.status = 'accepted'
                  and ((f.user_id = auth.uid() and f.friend_id = matches.invited_user_id)
                    or (f.user_id = matches.invited_user_id and f.friend_id = auth.uid()))
            )
        )
    );

-- 4. Migration 0001 already removed this unsafe policy, but it was back on
--    the live database. Nothing uses it, so drop it again.
drop policy if exists "join open room as player two" on public.matches;

-- 5. Realtime: lets the invited friend's browser hear about the new room
--    (Realtime still applies the READ policy above).
alter publication supabase_realtime add table public.matches;
