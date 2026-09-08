import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { validateSafeRedirect } from "./redirect";

export { validateSafeRedirect };

/**
 * Retrieves the current session user and Authenticator Assurance Level (AAL)
 * from the server-side Supabase client.
 */
export async function getAuthAssuranceLevel() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      user: null,
      currentLevel: null,
      nextLevel: null,
      currentAuthenticationMethods: [],
      error: userError,
    };
  }

  const { data: aalData, error: aalError } =
    await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

  return {
    user,
    currentLevel: aalData?.currentLevel ?? null,
    nextLevel: aalData?.nextLevel ?? null,
    currentAuthenticationMethods: aalData?.currentAuthenticationMethods ?? [],
    error: aalError,
  };
}

/**
 * Server-side guard for protected pages and layouts.
 * - Redirects unauthenticated users to /login
 * - If user has enrolled MFA (nextLevel === 'aal2') but session is only at 'aal1',
 *   redirects to /auth/verify-mfa to challenge for the second factor.
 */
export async function requireAuthWithMfa(redirectTo = "/") {
  const safeNext = validateSafeRedirect(redirectTo);
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect(`/login?next=${encodeURIComponent(safeNext)}`);
  }

  const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

  // If user has a verified factor (nextLevel === 'aal2') but current session has not satisfied it (aal1)
  if (aalData?.currentLevel === "aal1" && aalData?.nextLevel === "aal2") {
    redirect(`/auth/verify-mfa?next=${encodeURIComponent(safeNext)}`);
  }

  return { user, supabase, aal: aalData };
}

/**
 * Guard for sensitive Server Actions and API Route Handlers.
 * Ensures the caller is authenticated and, if enrolled in MFA, has verified aal2.
 */
export async function assertAal2Action() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("UNAUTHORIZED");
  }

  const { data: aalData, error: aalError } =
    await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

  if (aalError) {
    throw new Error("FAILED_TO_CHECK_ASSURANCE_LEVEL");
  }

  // If user has MFA enabled and current session is not aal2
  if (aalData?.nextLevel === "aal2" && aalData?.currentLevel !== "aal2") {
    throw new Error("AAL2_MFA_REQUIRED");
  }

  return { user, supabase, aal: aalData };
}
