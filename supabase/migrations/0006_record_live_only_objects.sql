-- ============================================================================
-- Migration 0006: record two objects that only existed on the live project
-- ----------------------------------------------------------------------------
-- THE PROBLEM
-- Comparing the live database with 0000-0005 (on 2026-09-27) found two things
-- that were created by hand and never written into a migration. A fresh
-- Supabase project built from this folder was missing both:
--
--   1. handle_new_user() + the `on_auth_user_created` trigger on auth.users.
--      This creates the profiles row when someone signs up. Email sign-up
--      also upserts from app/login/page.tsx, but Google OAuth sign-up does
--      not, so without the trigger Google users end up with no profile.
--
--   2. The "Authenticated users can read completed matches" policy.
--      The leaderboard counts wins across ALL players' finished matches.
--      Without this policy you could only see your own matches.
--
-- THE FIX
-- Both are copied exactly from the live project. Everything below is safe to
-- re-run, so on the live project this migration changes nothing.
-- ============================================================================


-- 1. Create a profile row for every new auth user.
--
-- SECURITY DEFINER: runs as the function owner (postgres), because the
-- signing-up user has no session yet and could not pass the profiles RLS.
-- `set search_path` pins lookups to public, the standard guard for
-- SECURITY DEFINER functions.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  default_username text;
begin
  -- Resolve username from metadata or fall back to the email prefix
  default_username := coalesce(
    new.raw_user_meta_data->>'username',
    new.raw_user_meta_data->>'name',
    new.raw_user_meta_data->>'full_name',
    split_part(new.email, '@', 1)
  );

  insert into public.profiles (id, email, username)
  values (
    new.id,
    new.email,
    default_username
  )
  on conflict (id) do update set
    email = excluded.email,
    username = coalesce(excluded.username, profiles.username);

  return new;
end;
$$;

-- Run it after each insert into auth.users (i.e. each sign-up).
-- Dropped first because Postgres has no "create trigger if not exists".
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
    after insert on auth.users
    for each row
    execute function public.handle_new_user();


-- 2. Any logged-in user can read finished matches (used by the leaderboard).
--    Waiting / in-progress matches stay covered by the baseline policies.
drop policy if exists "Authenticated users can read completed matches" on public.matches;

create policy "Authenticated users can read completed matches"
    on public.matches
    for select
    to authenticated
    using (status = 'completed'::public.match_status);
