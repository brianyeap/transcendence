/**
 * Username rules, in one place.
 *
 * WHY THIS FILE EXISTS
 * Usernames used to be written straight from the browser to PostgREST with no
 * server-side validation at all. The rules below are now enforced in three
 * independent layers, all of which read from this single source of truth:
 *
 *   1. app/api/profile/username/route.ts  — the real, authoritative check.
 *      Rejects invalid input BEFORE it ever reaches the database.
 *   2. The database CHECK constraint (migration 0010) — a backstop that holds
 *      even if a future route forgets to validate, or someone writes to
 *      PostgREST directly.
 *   3. app/settings/page.tsx — UX only. Shows the user an inline error before
 *      a round-trip. Deleting it would NOT weaken enforcement, because the
 *      route (1) and the constraint (2) both still apply.
 *
 * Keep the regex and the bounds here in sync with the migration. If you change
 * them, change the CHECK constraint too.
 */

/** Allowed characters: A-Z, a-z, 0-9, underscore, hyphen, space. */
export const USERNAME_PATTERN = /^[A-Za-z0-9_ -]+$/;

export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 20;

/**
 * Stable, language-neutral error codes. Routes return these instead of
 * human-readable English strings, and the client maps each one to a
 * translated message from messages/*.json. See lib/i18n/error-codes.ts.
 */
export type UsernameErrorCode =
  | "username_required"
  | "username_too_short"
  | "username_too_long"
  | "username_invalid_chars";

export type UsernameValidationResult =
  | { ok: true; username: string }
  | { ok: false; code: UsernameErrorCode };

/**
 * Validate a candidate username.
 *
 * The input is trimmed first, so leading/trailing whitespace is never stored
 * and never counts toward the length limit. The returned `username` is the
 * trimmed value that should actually be written.
 */
export function validateUsername(input: unknown): UsernameValidationResult {
  if (typeof input !== "string") {
    return { ok: false, code: "username_required" };
  }

  const username = input.trim();

  if (username.length === 0) {
    return { ok: false, code: "username_required" };
  }

  if (username.length < USERNAME_MIN_LENGTH) {
    return { ok: false, code: "username_too_short" };
  }

  if (username.length > USERNAME_MAX_LENGTH) {
    return { ok: false, code: "username_too_long" };
  }

  if (!USERNAME_PATTERN.test(username)) {
    return { ok: false, code: "username_invalid_chars" };
  }

  return { ok: true, username };
}