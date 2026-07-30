-- ============================================================================
-- Migration 0002: Row Level Security policies for `profiles`
-- ----------------------------------------------------------------------------
-- The register flow (app/login/page.tsx) signs the user up and then inserts a
-- row into `profiles`. `profiles` has RLS turned on, but without an INSERT
-- policy Postgres blocks that insert with:
--     "new row violates row-level security policy for table profiles"
--
-- These policies let a logged-in user create / read / update ONLY their own
-- profile row (the row whose id matches their auth user id).
--
-- Safe to run more than once (each policy is dropped first).
-- ============================================================================

alter table profiles enable row level security;

-- Create your own profile row (id must be your own user id).
drop policy if exists "insert own profile" on profiles;
create policy "insert own profile"
  on profiles for insert to authenticated
  with check (id = auth.uid());

-- Read your own profile row.
drop policy if exists "read own profile" on profiles;
create policy "read own profile"
  on profiles for select to authenticated
  using (id = auth.uid());

-- Update your own profile row.
drop policy if exists "update own profile" on profiles;
create policy "update own profile"
  on profiles for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());
