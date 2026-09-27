-- ============================================================================
-- Migration 0012: Check usernames on signup (handle_new_user trigger)
-- ----------------------------------------------------------------------------
-- THE PROBLEM
-- When someone signs up, Supabase inserts a row into auth.users, and the
-- handle_new_user() trigger copies a username into public.profiles. That
-- trigger never checked the name, so anyone calling Supabase directly (skipping
-- the register page) could sign up as "ab", "bad@name!" or a 40-char name.
--
-- THE RULE (same as lib/validation/username.ts and migration 0010)
--   3-20 characters, only A-Z a-z 0-9 _ - and space:  ^[A-Za-z0-9_ -]{3,20}$
--
-- WHAT THIS TRIGGER NOW DOES
-- There are two kinds of signup, and they are treated differently:
--
--   1. Email signup (register page). The player TYPED a username, and it is
--      sent as metadata `username`. If it breaks the rule, the whole signup is
--      rejected. We never silently change a name the player chose.
--
--   2. Google signup (or no username at all). The player did not choose a
--      name, so we build one from Google's name or the email prefix and CLEAN
--      it so it always fits the rule:
--        - remove characters that are not allowed
--        - cut it to 20 characters
--        - if almost nothing is left (e.g. a name in Chinese), use "player"
--        - if the name is already taken, add "_" + 6 chars of the user id
--      This way a Google login never fails because of its name.
--
-- ORDER WHEN APPLYING TO THE LIVE DATABASE
-- Apply THIS file first, then 0010_username_format_check.sql. 0010 adds the
-- CHECK constraint on profiles.username; if it went in first, the OLD trigger
-- would still try to save long Google names and those signups would fail.
-- ============================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  typed_username text;  -- the name the player typed on the register page
  clean_username text;  -- the name we will actually save
begin
  typed_username := btrim(new.raw_user_meta_data->>'username');

  if typed_username is not null then
    -- ---- 1. Email signup: the player chose a name, so it must be valid ----
    if typed_username !~ '^[A-Za-z0-9_ -]{3,20}$' then
      -- errcode 23514 = check_violation. Raising here cancels the insert into
      -- auth.users, so the account is never created.
      raise exception 'Invalid username: must be 3-20 characters of A-Z a-z 0-9 _ - or space'
        using errcode = '23514';
    end if;

    clean_username := typed_username;
  else
    -- ---- 2. Google / no name: build a valid name ourselves ---------------
    clean_username := coalesce(
      new.raw_user_meta_data->>'name',
      new.raw_user_meta_data->>'full_name',
      split_part(new.email, '@', 1),
      ''
    );

    -- Remove every character that is not allowed.
    clean_username := regexp_replace(clean_username, '[^A-Za-z0-9_ -]', '', 'g');

    -- Cut to 20 characters, then trim spaces from both ends (trimming after the
    -- cut so the name cannot end with a space).
    clean_username := btrim(left(btrim(clean_username), 20));

    -- Too short after cleaning (e.g. a name written only in Chinese).
    if length(clean_username) < 3 then
      clean_username := 'player';
    end if;

    -- Name already used by someone else? Add part of the user id to make it
    -- unique: 13 chars of name + "_" + 6 chars of id = 20 chars max.
    if exists (
      select 1 from public.profiles
      where username = clean_username and id <> new.id
    ) then
      clean_username := rtrim(left(clean_username, 13))
        || '_' || left(replace(new.id::text, '-', ''), 6);
    end if;
  end if;

  insert into public.profiles (id, username)
  values (new.id, clean_username)
  on conflict (id) do update set
    username = coalesce(excluded.username, profiles.username);

  -- Unchanged from before: every new user gets a presence row.
  insert into public.user_presence (user_id, last_seen_at)
  values (new.id, now())
  on conflict (user_id) do nothing;

  return new;
end;
$$;
