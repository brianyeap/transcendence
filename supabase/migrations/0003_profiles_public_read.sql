-- ============================================================================
-- Migration 0003: Let any logged-in user read other players' usernames
-- ----------------------------------------------------------------------------
-- Migration 0002 only allows reading YOUR OWN profile row. That means the
-- rooms list can't show the creator's name for other people's rooms, so it
-- falls back to showing a chunk of their user id instead.
--
-- Usernames are public-facing (they label rooms in the lobby), so this policy
-- lets any authenticated user read every profile row. The stricter "read own
-- profile" policy from 0002 becomes redundant, so we drop it.
--
-- Safe to run more than once.
-- ============================================================================

alter table profiles enable row level security;

-- Remove the "own row only" read policy so it doesn't restrict the new one.
drop policy if exists "read own profile" on profiles;

-- Any logged-in user can read any profile row (usernames are public).
drop policy if exists "read all profiles" on profiles;
create policy "read all profiles"
  on profiles for select to authenticated
  using (true);
