import { createSupabaseServerClient } from "@/lib/supabase/server";
import { validateUsername } from "@/lib/validation/username";

/**
 * PATCH /api/profile/username
 *
 * The ONLY place a username change is validated and written.
 *
 * WHY THIS EXISTS
 * The username edit used to go straight from the browser to PostgREST:
 *   supabase.from("profiles").update({ username }).eq("id", user.id)
 * Nothing validated it. `file.type`-style client checks are advisory — an
 * attacker could skip the UI entirely and PATCH the profiles table with an
 * empty, 500-character, or arbitrary-unicode username.
 *
 * This route is the enforcement point. It:
 *   - authenticates from the session cookie, never from the request body
 *   - rejects non-string / empty / wrong-length / wrong-character input BEFORE
 *     it reaches the database (validateUsername, shared with the DB constraint)
 *   - writes with the user-scoped client, so the existing "update own profile"
 *     RLS policy still applies — the id in the WHERE clause is the verified
 *     session user, never anything from the request
 *
 * ERROR CONTRACT
 * Errors are returned as a stable machine-readable `code`, not a human string.
 * The client maps the code to a translated message. See lib/i18n/error-codes.ts
 * and the "ApiErrors" section of messages/*.json.
 */

type UsernameRequest = {
  username?: unknown;
};

export async function PATCH(request: Request) {
  // ---- 1. authenticate from the session, never from the body -------------
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return Response.json({ code: "not_authenticated" }, { status: 401 });
  }

  // ---- 2. parse the body -------------------------------------------------
  let body: UsernameRequest;
  try {
    body = await request.json();
  } catch {
    return Response.json({ code: "invalid_request" }, { status: 400 });
  }

  // ---- 3. validate BEFORE touching the database --------------------------
  const result = validateUsername(body.username);
  if (!result.ok) {
    return Response.json({ code: result.code }, { status: 400 });
  }

  // ---- 4. write with the user-scoped client ------------------------------
  // `.eq("id", user.id)` pins the row to the verified session user, so a
  // caller can only ever rename themselves.
  const { error } = await supabase
    .from("profiles")
    .update({ username: result.username })
    .eq("id", user.id);

  if (error) {
    // 23505 = unique_violation. `profiles.username` is UNIQUE, so this is the
    // "someone already has that name" case.
    if (error.code === "23505") {
      return Response.json({ code: "username_taken" }, { status: 409 });
    }

    // 23514 = check_violation. This is the NOT VALID CHECK constraint from
    // migration 0010 firing as a backstop — most likely on a row whose CURRENT
    // username still violates the rule (e.g. a legacy >20-char name), because
    // a NOT VALID constraint still blocks updates to such a row.
    if (error.code === "23514") {
      return Response.json({ code: "username_invalid_chars" }, { status: 400 });
    }

    return Response.json({ code: "username_save_failed" }, { status: 500 });
  }

  return Response.json({ username: result.username });
}