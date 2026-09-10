import { NextResponse } from "next/server";
import { assertAal2Action } from "@/lib/auth/mfa";

/**
 * Sensitive Server Route Handler demonstrating server-side AAL2 enforcement.
 * Checks that the user has satisfied second-factor authentication before
 * permitting access to sensitive security actions or data.
 */
export async function GET() {
  try {
    const { user, aal } = await assertAal2Action();

    return NextResponse.json({
      status: "ok",
      userId: user.id,
      assuranceLevel: aal?.currentLevel,
      mfaVerified: aal?.currentLevel === "aal2",
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "UNAUTHORIZED";

    if (message === "AAL2_MFA_REQUIRED") {
      return NextResponse.json(
        {
          error: "Forbidden",
          message: "MFA authentication (AAL2) is required for this operation.",
          code: "AAL2_REQUIRED",
        },
        { status: 403 }
      );
    }

    return NextResponse.json(
      {
        error: "Unauthorized",
        message: "You must be signed in to perform this operation.",
      },
      { status: 401 }
    );
  }
}
