/**
 * Password rules, in one place.
 *
 * 1. The sign-up form (app/login/page.tsx) checks them, so the player gets a
 *    message straight away.
 * 2. Supabase Auth checks them again on the server, because sign-up requests
 *    go straight from the browser to Supabase. Set in the Supabase dashboard:
 *    Authentication -> Sign In / Providers -> Email:
 *      - Minimum password length: 8
 *      - Password requirements: "Letters and digits"
 *    Supabase then refuses weak passwords with the "weak_password" error.
 *
 * Keep the numbers here and in the dashboard the same.
 */

export const PASSWORD_MIN_LENGTH = 8;
// Supabase refuses passwords longer than 72 characters.
export const PASSWORD_MAX_LENGTH = 72;

/** True when the password follows all the rules above. */
export function isValidPassword(password: string) {
  const hasLetter = /[A-Za-z]/.test(password);
  const hasDigit = /[0-9]/.test(password);

  return (
    password.length >= PASSWORD_MIN_LENGTH &&
    password.length <= PASSWORD_MAX_LENGTH &&
    hasLetter &&
    hasDigit
  );
}
