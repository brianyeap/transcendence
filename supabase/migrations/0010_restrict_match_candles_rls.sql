-- ============================================================================
-- Migration 0010: Restrict match_candles RLS to match participants
-- ----------------------------------------------------------------------------
-- THE PROBLEM:
-- Two conflicting SELECT policies previously existed on `public.match_candles`:
-- 1. `authenticated_users_can_read_match_candles`: `(auth.role() = 'authenticated')`
-- 2. `read candles for my matches`: checks if user is player_one or player_two
--
-- In PostgreSQL, multiple permissive policies for the same action (SELECT) are
-- evaluated with logical OR. The broad `authenticated_users_can_read_match_candles`
-- evaluated to TRUE for every logged-in user, overriding the restrictive policy
-- and allowing any authenticated user to dump candles from all matches.
--
-- THE FIX:
-- 1. Drop the leaky `authenticated_users_can_read_match_candles` policy.
-- 2. Ensure `read candles for my matches` is the sole SELECT policy for authenticated users.
-- 3. Revoke permissions from `anon` role on `public.match_candles`.
-- ============================================================================

-- Step 1: Drop the overly permissive policy
drop policy if exists "authenticated_users_can_read_match_candles" on public.match_candles;
drop policy if exists authenticated_users_can_read_match_candles on public.match_candles;

-- Step 2: Ensure RLS is enabled on match_candles
alter table public.match_candles enable row level security;

-- Step 3: Ensure only match participants can read candles
drop policy if exists "read candles for my matches" on public.match_candles;

create policy "read candles for my matches"
    on public.match_candles
    for select
    to authenticated
    using (
        exists (
            select 1
            from public.matches m
            where m.id = match_candles.match_id
              and (m.player_one_user_id = auth.uid()
                   or m.player_two_user_id = auth.uid())
        )
    );

-- Step 4: Revoke unnecessary permissions from unauthenticated users
revoke all on table public.match_candles from anon;
grant select on table public.match_candles to authenticated;
