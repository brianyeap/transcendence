-- ============================================================================
-- Migration 0004: lock down the `avatars` storage bucket
-- ----------------------------------------------------------------------------
-- THE PROBLEM
-- Avatar uploads used to go straight from the browser to Supabase Storage
-- using the user's own session:
--
--     app/settings/page.tsx   supabase.storage.from("avatars").upload(...)
--
-- Nothing validated the bytes server-side, and whatever the client declared as
-- Content-Type was trusted. A user could skip the UI entirely and PUT
-- arbitrary content (for example an SVG with an inline script) into a bucket
-- served from our own trusted project origin.
--
-- The upload now goes through app/api/profile/avatar/route.ts, which verifies
-- magic bytes, fully decodes the image with sharp, re-encodes to a fixed
-- 256x256 JPEG, and writes with the service-role key. This migration removes
-- the ability for an ordinary authenticated client to write to the bucket at
-- all, so the route is the ONLY write path rather than merely the intended one.
--
-- ----------------------------------------------------------------------------
-- WHAT THE LIVE BUCKET POLICY WAS
--
-- NOT DETERMINED, and this is important for whoever reviews this migration.
--
-- There was no checked-in record of this bucket anywhere in the repository: a
-- search for `storage`, `bucket` or `avatars` across every .sql file returned
-- zero matches. The bucket and its policies existed only in the live Supabase
-- project, which this migration cannot read from here. The statements below
-- are therefore written to be safe against whatever the live state happens to
-- be, and the true prior state still needs to be dumped and recorded (see the
-- FOLLOW-UP note at the bottom).
--
-- Two things in the old code imply what the policy had to allow, but neither
-- proves it:
--   * the browser uploaded as `authenticated`, so `authenticated` must have
--     had INSERT (and UPDATE, because the call passed `upsert: true`);
--   * the path was the predictable `<user.id>/avatar.jpg`, and the client
--     chose it, so nothing prevented a user from writing to a path belonging
--     to somebody else unless the policy checked the path prefix.
--
-- If the live policy allowed cross-user writes, then any authenticated user
-- could overwrite any other user's avatar. That is the case this migration
-- closes, but it could not be confirmed from the repository and should be
-- verified against the live project.
-- ============================================================================


-- 1. Remove every client-facing write path on this bucket.
--
-- Storage policies live in storage.objects, and their names are not knowable
-- from here, so we drop by predicate rather than by name: every policy on
-- storage.objects that targets this bucket and grants INSERT, UPDATE or
-- DELETE is removed. SELECT policies are left alone — avatars are rendered to
-- other users, so reads must keep working.
--
-- Note this is deliberately belt-and-braces. It removes the policies, and
-- step 2 removes the underlying grants, so a policy that gets re-created by
-- mistake still cannot write without the privilege.
do $$
declare
    pol record;
begin
    for pol in
        select policyname
        from pg_policies
        where schemaname = 'storage'
          and tablename = 'objects'
          and cmd in ('INSERT', 'UPDATE', 'DELETE', 'ALL')
          and coalesce(qual, '') || coalesce(with_check, '') ilike '%avatars%'
    loop
        execute format('drop policy if exists %I on storage.objects', pol.policyname);
    end loop;
end $$;


-- 2. Revoke the write privileges themselves.
--
-- Policies are only half of the check: a policy can grant access but cannot
-- grant a privilege the role does not hold. Revoking here means even a
-- re-created permissive policy would not be enough.
revoke insert, update, delete, truncate on table storage.objects from authenticated;
revoke insert, update, delete, truncate on table storage.objects from anon;

-- service_role keeps full access. app/api/profile/avatar/route.ts uses it and
-- is the only writer from now on.


-- 3. Constrain the bucket itself, so the limits hold even if a future policy
--    or route regresses. These are enforced by the Storage API on every
--    upload, independent of application code.
update storage.buckets
set
    -- The route caps the request body at 5 MB before parsing; this is the
    -- backstop at the storage layer.
    file_size_limit = 5242880,
    -- Only raster formats we can actually re-encode. SVG is deliberately
    -- excluded: it is an active document format, not an image.
    allowed_mime_types = array['image/jpeg', 'image/png']
where id = 'avatars';


-- ============================================================================
-- FOLLOW-UP (not done here)
--
-- Two things remain open and are intentionally out of scope for this pass:
--
-- 1. profiles.avatar_url is still writable by the client. The RLS policy
--    "update own profile" (0000_baseline.sql:435) constrains the row, not the
--    column, so an authenticated user can still set avatar_url to any string
--    via PostgREST — the same class of problem this migration fixes for
--    Storage. A column-level fix needs to permit `username` writes (the edit
--    path at app/settings/page.tsx) while rejecting `avatar_url` writes from
--    the client. See the standalone write-up accompanying this change.
--
-- 2. The live bucket's prior policies were never recorded. Dump them and add
--    them as a comment or a preceding migration so the next person can see
--    what changed.
-- ============================================================================