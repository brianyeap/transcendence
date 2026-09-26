# Follow-up: restrict `profiles.avatar_url` writes at the database level

**Status: NOT IMPLEMENTED. Analysis only — deliberately out of scope for the
avatar-upload fix.**

## Why this is needed

The avatar-upload work moved validation and the Storage write server-side, and
added a render-time hostname allowlist in `app/components/duel/avatar.tsx`. That
closes the hole for anything going through the new API route.

It does **not** close the column itself. `profiles.avatar_url` remains writable
by any authenticated user through PostgREST, because the relevant policy
constrains _which row_ may be updated, not _which columns_:

```sql
-- supabase/migrations/0000_baseline.sql:435
CREATE POLICY "update own profile" ON "public"."profiles"
  FOR UPDATE TO "authenticated"
  USING ("id" = auth.uid())
  WITH CHECK ("id" = auth.uid());
```

A user can therefore still do:

```js
supabase
  .from("profiles")
  .update({ avatar_url: "https://evil.example/track.gif" })
  .eq("id", myUserId);
```

…straight from the browser console, with no bypass of the UI required. The
render-time allowlist in `avatar.tsx` means it will now render as initials
instead of the remote image, so the practical impact is reduced — but the
malicious value still lands in the database, and any future render path that
does not go through the shared `<Avatar>` component (or that forgets the check)
reintroduces the original tracking-pixel / defacement problem.

There is also a second, overlapping set of policies in the baseline that make
this harder to reason about:

```sql
-- 0000_baseline.sql:455
CREATE POLICY "users_can_update_own_profile" ON "public"."profiles"
  FOR UPDATE USING ("auth"."uid"() = "id");
```

This one has **no `WITH CHECK` at all**, so it is even more permissive. Any
column-level fix has to account for both policies, and for the duplicate
INSERT/SELECT policies alongside them (`insert own profile` :384 vs
`users_can_insert_own_profile` :439; `read all profiles` :404 vs
`users_can_read_own_profile` :447).

## The hard part: same table, different columns

`profiles` is updated from the client for **two** legitimate reasons:

| Field        | Call site                                                                          | Must the client keep write access?           |
| ------------ | ---------------------------------------------------------------------------------- | -------------------------------------------- |
| `username`   | `app/settings/page.tsx` username edit path                                         | **Yes** — this is a normal user action       |
| `avatar_url` | previously `app/settings/page.tsx`; **now only** `app/api/profile/avatar/route.ts` | **No** — the server derives it and writes it |

Postgres RLS has **no column-level `WITH CHECK`**. Policies are row-level only.
So "allow `username` but deny `avatar_url`" cannot be expressed by editing the
policy expression. There are three viable approaches, in rough order of
preference.

### Option A — `REVOKE` the column privilege (recommended)

Postgres _does_ support column-level privileges, which is the clean primitive
for this:

```sql
revoke update (avatar_url) on public.profiles from authenticated;
revoke update (avatar_url) on public.profiles from anon;
```

Then keep `update own profile` as-is for the remaining columns.

**Why this is the best fit:**

- It expresses the requirement exactly: `username` stays writable, `avatar_url`
  does not.
- It applies regardless of which policy matches, so it fixes the
  `users_can_update_own_profile` gap at the same time.
- It is not bypassable from the client — privilege checks happen before RLS.

**The catch — the server route must keep working.** `service_role` bypasses RLS
but is still subject to privilege checks, so it needs to retain the column
privilege. `service_role` currently holds `GRANT ALL ON TABLE profiles`
(baseline :6xx), and `REVOKE ... FROM authenticated` does not touch it. **This
needs verifying against the live database rather than assumed**, because if
`service_role` inherits anything from `authenticated` in the live project the
route's write would start failing.

**Second catch — the route currently writes with the user-scoped client.**
`app/api/profile/avatar/route.ts` performs the `profiles` update through
`createSupabaseServerClient()` (the user's session, subject to RLS _and_ to
column privileges), not through the admin client. If Option A is applied as
written, **that write will fail** with a permission error. The route must be
changed to write `avatar_url` via `createSupabaseAdminClient()` in the same
change. That is a one-line swap, but the two must land together or avatar
uploads break.

### Option B — `BEFORE UPDATE` trigger

A trigger that compares `NEW.avatar_url` to `OLD.avatar_url` and raises unless
the caller is `service_role`:

```sql
create or replace function public.protect_avatar_url()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.avatar_url is distinct from old.avatar_url
     and current_setting('request.jwt.claims', true)::jsonb ->> 'role' <> 'service_role'
  then
    raise exception 'avatar_url can only be changed by the server';
  end if;
  return new;
end $$;
```

**Pros:** precise, allows `username` edits, no privilege juggling.
**Cons:** a trigger on a hot table; relies on reading the JWT role claim, which
is fiddly and easy to get subtly wrong; harder to review than a `REVOKE`. This
is the fallback if Option A's privilege interaction turns out to be unworkable.

### Option C — move avatars to their own table

A separate `profile_avatars(user_id, avatar_url)` table with service-role-only
writes, and `profiles` untouched.

**Pros:** cleanest separation, no policy gymnastics, `profiles` stops being a
mixed-trust table.
**Cons:** a schema migration plus changes to every read path that currently
selects `profiles.avatar_url` — that is at least `app/leaderboard/page.tsx`,
`app/profile/page.tsx`, `app/friends/page.tsx`, `app/components/duel/side-nav.tsx`,
`lib/match/socket-transport.ts`, and migration `0002_friend_requests.sql`'s
`friends_with_status` view. Too large to bundle with a security fix.

## Recommended plan

1. Change `app/api/profile/avatar/route.ts` to write `avatar_url` via
   `createSupabaseAdminClient()` instead of the user-scoped client.
2. Apply Option A (`REVOKE UPDATE (avatar_url)`).
3. Verify from a browser console that
   `supabase.from("profiles").update({ avatar_url: "https://evil.example/x.gif" })`
   now fails, and that the username edit path still succeeds.
4. Verify an avatar upload still succeeds end to end.
5. Confirm `service_role` retains the column privilege on the live database.

## Things to check before writing the migration

- The live `profiles` policies may differ from the baseline. Two overlapping
  UPDATE policies exist in `0000_baseline.sql`, which suggests the baseline was
  captured from a live database that had drifted. **Dump the live policies
  first** — the same problem noted in `0004_avatars_bucket_lockdown.sql`.
- `profiles.avatar_url` is still **not declared in `0000_baseline.sql`** at all
  (the code reads and writes it; the baseline never creates it). A column-level
  `REVOKE` on a column that the checked-in schema does not define is a warning
  sign that the live schema needs reconciling first. This is the schema-drift
  item already recorded in `handoff.md` §6.2 item 2.
- Whether any other client code writes `profiles` columns we would be
  implicitly locking down.

## Relationship to the work already done

| Layer                                                   | Status after the avatar-upload fix            |
| ------------------------------------------------------- | --------------------------------------------- |
| Bytes validated server-side (magic bytes + decode)      | **Done** — `app/api/profile/avatar/route.ts`  |
| Storage write restricted to `service_role`              | **Done** — `0004_avatars_bucket_lockdown.sql` |
| `avatar_url` derived server-side, not client input      | **Done** — same route                         |
| Render-time hostname allowlist                          | **Done** — `lib/avatar-url.ts` + `avatar.tsx` |
| `avatar_url` unwritable from the client at the DB level | **NOT DONE — this document**                  |
