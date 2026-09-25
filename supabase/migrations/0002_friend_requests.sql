-- ============================================================================
-- Migration 0002: friend requests
-- ----------------------------------------------------------------------------
-- BEFORE
-- Pressing "Add friend" put the other player straight onto your list, and
-- only YOUR list - friendship went one way. Nobody could remove a friend.
--
-- AFTER
-- - "Add friend" sends a REQUEST (a row with status = 'pending').
-- - The other player accepts it (status becomes 'accepted') and from then on
--   you appear on EACH OTHER's lists.
-- - Either player can delete the row. That one action covers declining a
--   request, cancelling one you sent, and removing a friend.
--
-- One row = one friendship between two people:
--     user_id   = the person who sent the request
--     friend_id = the person who was asked
-- ============================================================================


-- 1. Every row gets a status. New rows start as 'pending'.
alter table public.friends
    add column if not exists status text not null default 'pending'
    check (status in ('pending', 'accepted'));

-- Everyone already on somebody's list keeps them - no one loses a friend.
update public.friends set status = 'accepted';


-- 2. Under the old rules A could add B AND B could add A, giving two rows for
--    the same pair. Now that one row is shared by both people, keep only one.
delete from public.friends f
using public.friends g
where f.user_id = g.friend_id
  and f.friend_id = g.user_id
  and f.user_id > f.friend_id;   -- just a way to pick one of the two to delete

-- And stop it happening again: only one row per pair, whichever way round.
-- (least/greatest put the two ids in the same order every time.)
create unique index if not exists friends_one_row_per_pair
    on public.friends (least(user_id, friend_id), greatest(user_id, friend_id));


-- 3. Who can do what (row level security).

-- READ: you can see any row you are part of, on either side.
drop policy if exists "read own friends" on public.friends;
create policy "read friendships I am in" on public.friends
    for select to authenticated
    using (user_id = auth.uid() or friend_id = auth.uid());

-- SEND: you can only send a request as yourself, never to yourself, and it
-- must start as 'pending' (so nobody can insert an 'accepted' row directly).
drop policy if exists "add own friends" on public.friends;
create policy "send friend requests" on public.friends
    for insert to authenticated
    with check (user_id = auth.uid() and friend_id <> auth.uid() and status = 'pending');

-- DELETE: either person in the row can remove it.
create policy "remove friendships I am in" on public.friends
    for delete to authenticated
    using (user_id = auth.uid() or friend_id = auth.uid());

-- There is deliberately NO update policy. Accepting goes through the
-- function below, so nobody can edit any other column of a row.


-- 4. Accept a request that someone sent to you.
--    "security definer" runs it as the table owner (skipping row level
--    security), so the WHERE clause is the whole safety check: it only
--    touches a pending row that was sent TO the person calling it.
create or replace function public.accept_friend_request(requester uuid)
returns void
language sql
security definer
set search_path = public
as $$
    update friends
    set status = 'accepted'
    where user_id = requester
      and friend_id = auth.uid()
      and status = 'pending';
$$;

revoke execute on function public.accept_friend_request(uuid) from public, anon;
grant execute on function public.accept_friend_request(uuid) to authenticated;


-- 5. Remove a friend / decline a request / cancel a request you sent.
--    All three are "delete the row between me and them". This one runs as
--    the caller, so the delete policy above still applies.
create or replace function public.remove_friend(other uuid)
returns void
language sql
security invoker
set search_path = public
as $$
    delete from friends
    where (user_id = auth.uid() and friend_id = other)
       or (user_id = other and friend_id = auth.uid());
$$;

revoke execute on function public.remove_friend(uuid) from public, anon;
grant execute on function public.remove_friend(uuid) to authenticated;


-- 6. Rebuild the view the friends page reads.
--    For each row I am in, it shows the OTHER person, plus:
--      status      - 'pending' or 'accepted'
--      sent_by_me  - true if I sent the request, false if they sent it to me
--    avatar_url now comes straight from the view, so the page no longer
--    needs the profiles(avatar_url) join.
--    The columns change, so the old view has to be dropped first.
drop view if exists public.friends_with_status;

create view public.friends_with_status with (security_invoker = true) as
select
    p.id,
    p.username,
    p.avatar_url,
    extract(epoch from (now() - p.last_seen_at))::integer as seconds_since_seen,
    f.status,
    (f.user_id = auth.uid()) as sent_by_me
from public.friends f
join public.profiles p
    -- "the other person": if I sent it, that is friend_id, otherwise user_id
    on p.id = case when f.user_id = auth.uid() then f.friend_id else f.user_id end;

-- security_invoker = true means the view uses the READ policy above, so it
-- only ever returns rows the logged-in player is part of.

grant select on public.friends_with_status to authenticated;
