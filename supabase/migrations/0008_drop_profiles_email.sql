-- ============================================================================
-- Migration 0008: Drop email column from public.profiles
-- ----------------------------------------------------------------------------
-- THE PROBLEM:
-- `public.profiles` contained an `email` column, and had an RLS policy:
--   "read all profiles" FOR SELECT TO authenticated USING (true);
-- Since RLS is row-level rather than column-level, any authenticated user
-- could read all columns of all profiles, effectively leaking every user's
-- email address to other players.
--
-- THE FIX:
-- 1. Canonical emails already live securely in Supabase's `auth.users` table
--    (which is not publicly readable; users access their own email via auth.getUser()).
-- 2. Drop the `email` column (and its UNIQUE constraint) from `public.profiles`.
-- 3. Update `handle_new_user()` trigger function to create profile rows with
--    only (id, username), avoiding any email insertion into `public.profiles`.
-- ============================================================================

-- 1. Drop the email column (automatically drops unique constraint profiles_email_key)
alter table public.profiles drop column if exists email cascade;

-- 2. Update the handle_new_user() trigger function
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  default_username text;
begin
  -- Resolve username from metadata or fall back to the email prefix from auth.users
  default_username := coalesce(
    new.raw_user_meta_data->>'username',
    new.raw_user_meta_data->>'name',
    new.raw_user_meta_data->>'full_name',
    split_part(new.email, '@', 1)
  );

  insert into public.profiles (id, username)
  values (
    new.id,
    default_username
  )
  on conflict (id) do update set
    username = coalesce(excluded.username, profiles.username);

  return new;
end;
$$;
