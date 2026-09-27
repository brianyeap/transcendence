-- ============================================================================
-- Migration 0005: create the `avatars` storage bucket
-- ----------------------------------------------------------------------------
-- THE PROBLEM
-- The `avatars` bucket was created by hand in the Supabase dashboard, so no
-- migration ever recorded it. On a brand-new Supabase project, running
-- 0000-0004 gave you every table but no bucket, and profile photo uploads
-- (app/api/profile/avatar/route.ts) failed.
--
-- 0004 does not help here: it only UPDATES the bucket
-- (`where id = 'avatars'`), and on a fresh project there is no row to update.
--
-- THE FIX
-- Create the bucket with the settings it ends up with once 0004 has run
-- (copied from the live project on 2026-09-27):
--
--   public             = true      avatar URLs are shown to other players,
--                                  and getPublicUrl() needs a public bucket
--   file_size_limit    = 5 MB      same cap as the upload route
--   allowed_mime_types = jpeg, png the route always re-encodes to JPEG
--
-- WHY THIS IS SAFE TO RUN ON THE LIVE PROJECT
-- `on conflict do nothing` means: if the bucket already exists, leave it
-- alone. So on the live project this migration changes nothing, and on a
-- fresh project it creates the bucket. Both end up the same.
--
-- WHAT ABOUT WRITE POLICIES?
-- None on purpose. Since 0004, only the server route writes to this bucket,
-- using the service-role key (which skips RLS). Browsers only read avatars
-- through the public URL, which needs no policy on a public bucket.
-- ============================================================================


-- 1. Create the bucket (or do nothing if it is already there).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
    'avatars',
    'avatars',
    true,
    5242880,                               -- 5 MB = 5 * 1024 * 1024 bytes
    array['image/jpeg', 'image/png']
)
on conflict (id) do nothing;


-- 2. The one storage policy the live project keeps after 0004:
--    a logged-in user can list/read objects inside their own folder.
--    Avatars are stored as `<user id>/avatar.jpg`, so storage.foldername(name)
--    gives ['<user id>'], and [1] is the first folder, the owner's id.
--
--    Postgres has no "create policy if not exists", so we drop it first.
--    That makes it safe to run this file more than once.
drop policy if exists "Users can read own avatar objects" on storage.objects;

create policy "Users can read own avatar objects"
    on storage.objects
    for select
    to authenticated
    using (
        bucket_id = 'avatars'
        and (storage.foldername(name))[1] = (select auth.uid())::text
    );
