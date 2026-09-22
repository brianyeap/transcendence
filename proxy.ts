import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = ["/login", "/terms-services", "/privacy-policy", "/auth/callback"];

function isPublicPaths(pathname: string) {
	return PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

export async function proxy(request: NextRequest)
{
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
						response.cookies.set(name, value, options);
					});

					if (headers) {
						Object.entries(headers).forEach(([key, value]) => {
							response.headers.set(key, value);
						});
					}
				},
			},
		}
	);

	const { data: { user } } = await supabase.auth.getUser();

	if (!user && !isPublicPaths(request.nextUrl.pathname))
	{
		const url = request.nextUrl.clone();
		url.pathname = "/login";
		return NextResponse.redirect(url);
	}

	return response;
}

export const config = {
	// Exclude static assets and the auth callback (PKCE code exchange must
	// run before any session exists — intercepting it causes redirect loops).
	matcher: ["/((?!_next/static|_next/image|favicon.ico|auth/callback|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
