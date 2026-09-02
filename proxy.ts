import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {  // onlyreads sb auth cookies
          return request.cookies.getAll(); 
        },
        setAll(cookiesToSet, headers) { // only called when supabase.auth.getClaims() refreshes the cookie
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));

          response = NextResponse.next({
            request,
          });

          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);               //copy refreshed cookies onto `response`
          });

          Object.entries(headers).forEach(([key, value]) => {
            response.headers.set(key, value);                         //no-cache headers, so a CDN never serves one user's session to another
          });
        },
      },
    }
  );

  await supabase.auth.getClaims(); // result thrown away, but this will refresh the cookie

  return response; //  NextResponse.next() type return
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"], // run it on all path except these
};
