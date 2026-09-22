import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { validateSafeRedirect } from "@/lib/auth/mfa";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const { searchParams } = requestUrl;

  // When the server listens on 0.0.0.0, request.url contains that non-routable
  // address. Reconstruct a browser-reachable origin from the Host header instead.
  const host = request.headers.get("host") ?? requestUrl.host;
  const origin =
    process.env.NEXT_PUBLIC_SITE_URL ??
    `${requestUrl.protocol}//${host}`;

  const code = searchParams.get("code");
  const rawNext = searchParams.get("next");
  const safeNext = validateSafeRedirect(rawNext, "/");

  if (code) {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.session) {
      // Pass the access token directly so getUser() makes a live /user request
      // rather than reading from the cookie-stored session. The token response
      // from the OAuth exchange does NOT include the user's MFA factors, so
      // any AAL check that relies on session.user.factors will incorrectly
      // conclude nextLevel === "aal1" and silently skip the MFA gate.
      const { data: userData } = await supabase.auth.getUser(
        data.session.access_token
      );

      // Decode the current AAL from the freshly-issued JWT.
      const [, payloadB64] = data.session.access_token.split(".");
      const payload = JSON.parse(
        Buffer.from(payloadB64, "base64url").toString("utf-8")
      );
      const currentLevel: string | null = payload.aal ?? null;

      const hasVerifiedFactor = (userData?.user?.factors ?? []).some(
        (f) => f.status === "verified"
      );

      if (hasVerifiedFactor && currentLevel === "aal1") {
        return NextResponse.redirect(
          `${origin}/auth/verify-mfa?next=${encodeURIComponent(safeNext)}`
        );
      }

      return NextResponse.redirect(`${origin}${safeNext}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
