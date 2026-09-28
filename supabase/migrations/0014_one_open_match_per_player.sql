-- 0014_one_open_match_per_player.sql
--
-- A player can be in only ONE open match at a time.
--
-- WHY
-- /api/rooms (create) and /api/rooms/join first COUNT the player's open
-- matches, then write. Two requests at the same moment can both count 0 and
-- both write, leaving the player in two matches at once. The API can't stop
-- that on its own; the database has to. (The "create your own waiting match"
-- policy also lets a logged-in player insert straight from the browser,
-- skipping the API, so this covers that too.)
--
-- HOW
-- A trigger runs just before a player is added to a match: a new room
-- (INSERT, player one) or someone joining (UPDATE that fills in player two).
-- It:
--   1. takes a lock named after that player, so two requests for the SAME
--      player run one after the other (other players are never slowed down)
--   2. looks for another match of theirs that is not completed
--   3. if there is one, refuses with error code 23505 ("unique_violation"),
--      which the API turns into "you are already in a game" (409)
--
-- "Open" = any status except 'completed' (waiting, countdown, active), the
-- same rule the API uses.

create or replace function public.enforce_one_open_match()
returns trigger
language plpgsql
security definer          -- see every match, whatever RLS lets the caller read
set search_path = public
as $$
declare
    new_player uuid;
begin
    -- A finished match never blocks anything.
    if new.status = 'completed' then
        return new;
    end if;

    -- Which player is this write adding?
    --   INSERT: the creator (player one).
    --   UPDATE: player two, but only when it was just filled in (a join).
    if tg_op = 'INSERT' then
        new_player := new.player_one_user_id;
    elsif new.player_two_user_id is distinct from old.player_two_user_id then
        new_player := new.player_two_user_id;
    end if;

    if new_player is null then
        return new;  -- nobody new in this match: nothing to check
    end if;

    -- 1. One request at a time per player. The lock is released by itself
    --    when the transaction ends. hashtext() turns the text into the number
    --    the lock function needs.
    -- prevents the rest of the code from running, it waits
    perform pg_advisory_xact_lock(hashtext('one_open_match:' || new_player::text));

    -- 2 + 3. Already in another open match? Refuse.
    -- 1 measn data isnt needed just returns 1 if exists, 0 if not
    -- <> means not equal to
    if exists (
        select 1
        from public.matches m
        where m.id <> new.id
          and m.status <> 'completed'
          and (m.player_one_user_id = new_player or m.player_two_user_id = new_player)
    ) then
        raise exception 'player % is already in an open match', new_player
            using errcode = '23505';
    end if;

    return new;
end;
$$;

drop trigger if exists one_open_match_per_player on public.matches;
create trigger one_open_match_per_player
    before insert or update of player_two_user_id on public.matches
    for each row execute function public.enforce_one_open_match();
