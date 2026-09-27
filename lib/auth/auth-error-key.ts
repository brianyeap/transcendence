import { isAuthRetryableFetchError, type AuthError } from "@supabase/supabase-js";

/**
 * Turns a Supabase auth error into a key from the "AuthErrors" section of
 * messages/*.json, so the player sees it in their own language.
 *
 * Supabase's own `error.message` is always English, so we never show it.
 * Instead we look at `error.code`, which is a fixed id like
 * "invalid_credentials" that does not change with the language.
 */
export function authErrorKey(error: AuthError) {
  switch (error.code) {
    case "invalid_credentials":
      return "invalidCredentials";
    case "user_already_exists":
    case "email_exists":
      return "emailTaken";
    case "weak_password":
      return "weakPassword";
    case "email_not_confirmed":
      return "emailNotConfirmed";
    case "over_request_rate_limit":
    case "over_email_send_rate_limit":
      return "tooManyRequests";
    case "signup_disabled":
    case "email_provider_disabled":
      return "signupDisabled";
  }

  // The request never reached Supabase (offline, server down...).
  if (isAuthRetryableFetchError(error)) {
    return "network";
  }

  return "unknown";
}
