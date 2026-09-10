import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { validateSafeRedirect } from "@/lib/auth/mfa";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const rawNext = searchParams.get("next");
  const safeNext = validateSafeRedirect(rawNext, "/");

  if (code) {
    const supabase = await createSupabaseServerClient();

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Check Authenticator Assurance Level (AAL)
      const { data: aalData } =
        await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

      // If user has a verified MFA factor (nextLevel === 'aal2')
      // but current session only has 1st factor (currentLevel === 'aal1')
      if (aalData?.currentLevel === "aal1" && aalData?.nextLevel === "aal2") {
        return NextResponse.redirect(
          `${origin}/auth/verify-mfa?next=${encodeURIComponent(safeNext)}`
        );
      }

      return NextResponse.redirect(`${origin}${safeNext}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}