-- ============================================================================
-- Migration 0009: Protect created_at and last_seen_at in profiles
-- ----------------------------------------------------------------------------
-- REQUIREMENTS:
-- 1. `created_at`: either completely hidden or only able to view your own.
--    - Canonical registration timestamp already lives securely in `auth.users`
--      and is accessible to the logged-in user via `supabase.auth.getUser()`.
--    - Drop `created_at` from `public.profiles` so other users cannot see it.
--
-- 2. `last_seen_at`: only visible to people who are your accepted friends.
--    - Previously, `last_seen_at` lived on `public.profiles` which was world-
--      readable by any authenticated user.
--    - Move presence tracking into a dedicated `public.user_presence` table
--      protected by Row Level Security (RLS).
--    - Only the user themselves and users with an 'accepted' friendship in
--      `public.friends` can SELECT from `public.user_presence`.
--    - Update `ping_online()` to write to `public.user_presence`.
--    - Rebuild `friends_with_status` view to join `public.user_presence`.
--    - Drop `last_seen_at` from `public.profiles`.
-- ============================================================================

-- Step 1: Create dedicated user_presence table
create table if not exists public.user_presence (
    user_id uuid primary key references auth.users(id) on delete cascade,
    last_seen_at timestamptz default now()
);

-- Step 2: Backfill user_presence from profiles (if column exists)
do $$
begin
  if exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'last_seen_at'
  ) then
    insert into public.user_presence (user_id, last_seen_at)
    select id, coalesce(last_seen_at, now())
    from public.profiles
    on conflict (user_id) do nothing;
  end if;
end $$;

-- Step 3: Enable RLS on user_presence
alter table public.user_presence enable row level security;

-- READ: own presence OR presence of accepted friends only
drop policy if exists "read presence" on public.user_presence;
create policy "read presence" on public.user_presence
for select to authenticated
using (
    user_id = auth.uid()
    or exists (
        select 1 from public.friends f
        where f.status = 'accepted'
          and (
            (f.user_id = auth.uid() and f.friend_id = public.user_presence.user_id)
            or
            (f.friend_id = auth.uid() and f.user_id = public.user_presence.user_id)
          )
    )
);

-- WRITE: only own presence
drop policy if exists "update own presence" on public.user_presence;
create policy "update own presence" on public.user_presence
for all to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

grant select on public.user_presence to authenticated;

-- Step 4: Update ping_online() to write to user_presence
create or replace function public.ping_online()
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.user_presence (user_id, last_seen_at)
  values (auth.uid(), now())
  on conflict (user_id) do update set last_seen_at = now();
$$;

revoke execute on function public.ping_online() from public, anon;
grant execute on function public.ping_online() to authenticated;

-- Step 5: Drop old friends_with_status view (which references profiles.last_seen_at)
drop view if exists public.friends_with_status;

-- Step 6: Recreate friends_with_status view joining user_presence
create view public.friends_with_status with (security_invoker = true) as
select
    p.id,
    p.username,
    p.avatar_url,
    extract(epoch from (now() - up.last_seen_at))::integer as seconds_since_seen,
    f.status,
    (f.user_id = auth.uid()) as sent_by_me
from public.friends f
join public.profiles p
    on p.id = case when f.user_id = auth.uid() then f.friend_id else f.user_id end
left join public.user_presence up
    on up.user_id = p.id;

grant select on public.friends_with_status to authenticated;

-- Step 7: Update handle_new_user() trigger function
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  default_username text;
begin
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

  insert into public.user_presence (user_id, last_seen_at)
  values (
    new.id,
    now()
  )
  on conflict (user_id) do nothing;

  return new;
end;
$$;

-- Step 8: Safely drop last_seen_at and created_at from public.profiles
alter table public.profiles drop column if exists last_seen_at cascade;
alter table public.profiles drop column if exists created_at cascade;
