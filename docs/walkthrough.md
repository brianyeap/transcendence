# 📚 Production‑Grade Study Guide – Full‑Stack Next.js (App Router) + Supabase  

> **Audience:** You, the engineer who must be able to *read, explain, and defend* every line of code to a technical interviewer or a senior lead.  
> **Scope:** Three core modules – the Supabase connection layer, the Google‑OAuth + MFA authentication flow, and the high‑performance Leader‑board implementation.  
> **Style:** Every code snippet is **complete** (no omitted lines). Each line is annotated, then the low‑level mechanics are unpacked, followed by a concise “script‑view” you can recite.

---

## Table of Contents
1. **Module 1 – The Connective Tissue (Next.js ↔ Supabase)**
2. **Module 2 – Authentication Circuits (Google OAuth & 2FA)**
3. **Module 3 – The Leaderboard System (Performant Data Pulling)**  

---  

## MODULE 1 – The Connective Tissue (Next.js ↔ Supabase)

### 1️⃣ THE CODE ARCHITECTURE  
File: `utils/supabase/server.ts`

```ts
// utils/supabase/server.ts
import { cookies } from 'next/headers';                     // 1️⃣
import { createServerClient, SupabaseClient } from '@supabase/ssr'; // 2️⃣

/** 
 * 3️⃣ Export a factory that returns a fully‑configured Supabase client 
 *    bound to the incoming request’s cookie store.
 */
export const createSupabaseServerClient = async (): Promise<
  SupabaseClient
> => {
  // 4️⃣ Grab the request‑scoped cookie store from Next.js.
  const cookieStore = await cookies();

  // 5️⃣ Build the Supabase server client.
  //    - `process.env.NEXT_PUBLIC_SUPABASE_URL` and 
  //      `process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY` are injected at build time.
  //    - The `cookies` handler gives Supabase read/write access to the HTTP‑Only
  //      `sb:session` cookie that holds the JWT.
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,                 // 6️⃣
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,            // 7️⃣
    {
      // 8️⃣ Provide a custom cookie interface that Supabase will call.
      cookies: {
        // 9️⃣ Called by Supabase when it needs to read all cookies.
        getAll() {
          // 🔟 Returns an array of `{ name, value, options }` objects.
          //    `cookieStore.getAll()` is a Next.js primitive that reads the raw
          //    `Cookie` header from the request.
          return cookieStore.getAll();
        },
        // 1️⃣1️⃣ Called by Supabase when it wants to set one or more cookies.
        //      This happens after a successful sign‑in, sign‑out, or MFA step.
        setAll(cookiesToSet) {
          // 1️⃣2️⃣ `cookiesToSet` is an array of objects: `{ name, value, options }`.
          //       `options` matches the Web Set‑Cookie spec (path, httpOnly, secure…)
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // 1️⃣3️⃣ If `setAll` runs inside a Server Component that does not have
            //       a response object (e.g., during ISR), the cookie‑set can be ignored.
            //       Supabase docs advise swallowing the error – the cookie will be
            //       refreshed by middleware on the next request.
          }
        },
      },
    }
  );
};
```

File: `utils/supabase/client.ts`

```ts
// utils/supabase/client.ts
import { createBrowserClient, SupabaseClient } from '@supabase/ssr'; // 1️⃣

/** 
 * 2️⃣ Export a factory for the **browser**‑only Supabase client.
 *    This client does **not** manage cookies – the browser’s native cookie jar
 *    handles the session token automatically on each request.
 */
export const createSupabaseBrowserClient = (): SupabaseClient => {
  // 3️⃣ Supabase reads `process.env.NEXT_PUBLIC_*` at runtime (client bundle).
  //    The `!` asserts non‑null because env variables are guaranteed by the .env file.
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,      // 4️⃣
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!   // 5️⃣
  );
};
```

### 2️⃣ STEP‑BY‑STEP TRACE  

| # | Code line | Explanation |
|---|-----------|-------------|
| **Server file** |
| 1 | `import { cookies } from 'next/headers';` | Pulls Next.js’s server‑only API that gives access to the incoming request’s cookie header (no `document.cookie` on the server). |
| 2 | `import { createServerClient, SupabaseClient } from '@supabase/ssr';` | Brings in Supabase’s SSR‑aware client builder and its TypeScript type. |
| 3‑4 | `export const createSupabaseServerClient = async (): Promise<SupabaseClient> => {` / `const cookieStore = await cookies();` | Declares an async factory that obtains a `cookieStore` – a wrapper around the raw `Cookie` header, allowing us to read/write cookies in a Server Component. |
| 5‑7 | `return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {` … `});` | Calls Supabase’s SSR factory with the Supabase URL and anon key; the trailing config object supplies a custom cookie handler. |
| 8‑10 | `cookies: { getAll() { return cookieStore.getAll(); },` | Supabase will invoke `getAll` whenever it needs to attach the session JWT to an outgoing request. |
| 11‑13 | `setAll(cookiesToSet) { try { … } catch { … } }` | After a sign‑in, Supabase tries to write the session cookie (`sb:session`). The handler forwards each cookie to `cookieStore.set`. If we’re in a Server Component without a response, we safely swallow the error (per Supabase docs). |
| **Client file** |
| 1 | `import { createBrowserClient, SupabaseClient } from '@supabase/ssr';` | Loads the same library, but the *browser* client uses the browser‑managed cookie jar instead of a manual cookie store. |
| 2 | `export const createSupabaseBrowserClient = (): SupabaseClient => {` | Factory for client‑side code (React components, hooks). |
| 3‑5 | `return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);` | Instantiates the client; because it runs in the browser, authentication cookies are automatically sent with each XHR/fetch request. |

### 3️⃣ THE UNDER‑THE‑HOOD MECHANICS  

#### a) Why Server vs. Browser client?  
* **Server Components** run on the Node.js (or Edge) runtime with **no access to `document.cookie`**. Supabase must read the **raw `Cookie` header** that Next.js injects via `next/headers`. It also needs to **set cookies** on the outgoing **`Set‑Cookie`** response header. `createServerClient` accepts a custom `cookies` object that implements `getAll`/`setAll`.  
* **Client Components** run in the browser where the **Fetch API** automatically includes cookies for the request’s origin. `createBrowserClient` simply builds a wrapper around `fetch` that attaches the JWT from the browser cookie store.

#### b) Network Journey of `supabase.from('users').select('*')`  

| Step | What Happens (Low‑level) |
|------|--------------------------|
| 1️⃣ **API Call** – The TypeScript method `supabase.from('users').select('*')` builds a **Supabase query object**. |
| 2️⃣ **HTTP Request** – When `.maybeSingle()/.single()/await` is called, Supabase’s client serialises the request into a **POST** to `https://<SUPABASE_URL>/rest/v1/users`. The body is a JSON‑encoded **PostgREST filter** (e.g., `{ select: '*'} `) and the query string contains `prefer=...` headers for count, etc. |
| 3️⃣ **Headers** – The request includes: <br> • `Authorization: Bearer <JWT>` (read from the cookie or browser storage) <br> • `apikey: <ANON_KEY>` (required by Supabase) <br> • `Content-Type: application/json` <br> • `Accept: application/vnd.pgrst.object+json` (if `.single()`) |
| 4️⃣ **Edge/Load Balancer** – Supabase’s global edge node receives the HTTP POST, validates the JWT signature (HS256 with the Supabase service role secret). |
| 5️⃣ **PostgREST Layer** – The edge forwards the request to the **PostgREST** process, which translates the JSON filter into an **SQL statement**: <br> ```sql SELECT * FROM "public"."users"; ``` |
| 6️⃣ **Postgres Planner** – The planner parses the SQL, looks up indexes, generates an **execution plan**. If the table has a primary key or an index on columns used in a `WHERE` clause, the plan will use an **Index Scan**; otherwise a **Seq Scan**. |
| 7️⃣ **Executor** – Executes the plan, streams rows back to PostgREST, which returns a JSON array. |
| 8️⃣ **Supabase Client** – Parses the JSON response, resolves the Promise with a typed result (`{ data: User[]; error: null }`). |
| 9️⃣ **Next.js Rendering** – In a Server Component, the async function awaits the result, then renders the UI with the data. In a Client Component, a React hook (`useEffect`) would await the same promise and trigger a re‑render. |

#### c) JWT Validation & RLS  

* **JWT payload** includes `sub` (user ID), `exp`, `aud`, and, crucially for MFA, the `aal` claim (`"aal1"` or `"aal2"`).  
* Supabase’s **Row‑Level Security (RLS)** policies can read `auth.jwt()` inside PostgreSQL, exposing `auth.uid()` (the `sub`) and `auth.claims()->>'aal'`. Policies can therefore **gate** queries based on whether `aal = 'aal2'`.  

### 4️⃣ “EXPLAIN‑IT‑LIKE‑I‑WROTE‑IT” SCRIPTVIEW  

> “In our Next.js app we have two Supabase factories. The **server factory** (`createSupabaseServerClient`) runs in Server Components; it pulls the raw `Cookie` header via `next/headers`, hands that to Supabase’s SSR client, and implements `getAll`/`setAll` so Supabase can read the JWT and write the `sb:session` cookie on the response. The **browser factory** (`createSupabaseBrowserClient`) lives in Client Components and relies on the browser’s native cookie handling. When we call `supabase.from('users').select('*')`, the client builds a POST to PostgREST, which turns the JSON filter into a pure SQL `SELECT * FROM users`, passes it to Postgres, the planner decides whether to use an index or a sequential scan, and then streams back JSON that our component consumes. This split is essential because Server Components can’t use `document.cookie`, while Client Components can.”  

---  

## MODULE 2 – Authentication Circuits (Google OAuth & 2FA)

### 1️⃣ THE CODE ARCHITECTURE  

#### a) Sign‑in helper (`utils/auth/google.ts`)

```ts
// utils/auth/google.ts
import { createSupabaseBrowserClient } from '@/utils/supabase/client'; // 1️⃣
import { AuthError } from '@supabase/supabase-js';                     // 2️⃣

/** 
 * 3️⃣ Initiates the Google OAuth flow. 
 *    It uses Supabase’s built‑in `signInWithOAuth` which automatically creates
 *    the PKCE challenge, stores a CSRF `state` in a temporary cookie,
 *    and redirects the browser to the Google consent screen.
 */
export const signInWithGoogle = async (
  redirectTo: string = '/' // 4️⃣ Default post‑login landing page
): Promise<void> => {
  const supabase = createSupabaseBrowserClient(); // 5️⃣ Browser client

  // 6️⃣ Call Supabase’s OAuth helper. `provider: 'google'` selects Google.
  //    `options.redirectTo` will be encoded into the `state` param so that
  //    after Google returns we can forward the user to the right route.
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?next=${encodeURIComponent(redirectTo)}`,
    },
  });

  if (error) {
    // 7️⃣ Surface a friendly error; Supabase throws a typed AuthError.
    console.error('Google sign‑in error:', (error as AuthError).message);
  }
};
```

#### b) OAuth Callback Route (`app/auth/callback/route.ts`)

```ts
// app/auth/callback/route.ts
import { NextResponse } from 'next/server';                           // 1️⃣
import { createSupabaseServerClient } from '@/utils/supabase/server'; // 2️⃣
import { validateSafeRedirect } from '@/lib/auth/mfa';                // 3️⃣

/** 
 * 4️⃣ GET handler for `/auth/callback`. Google redirects here with `code`
 *    and optional `state` (contains our CSRF token & `next` URL).
 */
export async function GET(request: Request) {
  // 5️⃣ Parse the full request URL to pull query params.
  const requestUrl = new URL(request.url);
  const { searchParams } = requestUrl;

  // 6️⃣ Derive the public origin from the `Host` header because on Docker /
  //    dev it may be `0.0.0.0` which is not reachable from the browser.
  const host = request.headers.get('host') ?? requestUrl.host;
  const origin =
    process.env.NEXT_PUBLIC_SITE_URL ?? `${requestUrl.protocol}//${host}`;

  // 7️⃣ Extract the Google‑provided OAuth `code` and our `next` URL (if any).
  const code = searchParams.get('code');
  const rawNext = searchParams.get('next');
  const safeNext = validateSafeRedirect(rawNext, '/'); // 8️⃣ Sanitize to avoid open redirects.

  // 9️⃣ If a code is present, exchange it for a Supabase session.
  if (code) {
    const supabase = await createSupabaseServerClient(); // 10️⃣ Server‑side client

    // 11️⃣ `exchangeCodeForSession` talks to Supabase Auth’s `/token` endpoint,
    //     sending the PKCE verifier that Supabase stored in the `state` cookie.
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    // 12️⃣ If there is **no** error and a session was returned, we have a JWT.
    if (!error && data.session) {
      // 13️⃣ Supabase returns an **access token** that does **not** contain MFA info.
      //     To know the user’s AAL we must call `auth.getUser` with that token.
      const { data: userData } = await supabase.auth.getUser(
        data.session.access_token
      );

      // 14️⃣ Decode the JWT payload manually to read `aal`. (Postgres RLS relies on this.)
      const [, payloadB64] = data.session.access_token.split('.');
      const payload = JSON.parse(
        Buffer.from(payloadB64, 'base64url').toString('utf-8')
      );
      const currentAAL: string | null = payload.aal ?? null; // 15️⃣ 'aal1' or 'aal2'

      // 16️⃣ Determine if the user has a verified MFA factor.
      const hasVerifiedFactor =
        (userData?.user?.factors ?? []).some(
          (f) => f.status === 'verified'
        );

      // 17️⃣ If they only have `aal1` **and** a verified factor is present,
      //     we must push them through the MFA verification page.
      if (hasVerifiedFactor && currentAAL === 'aal1') {
        // 18️⃣ Redirect to `/auth/verify-mfa` preserving the original destination.
        return NextResponse.redirect(
          `${origin}/auth/verify-mfa?next=${encodeURIComponent(safeNext)}`
        );
      }

      // 19️⃣ Otherwise the JWT already carries `aal2`; the user is fully authenticated.
      return NextResponse.redirect(`${origin}${safeNext}`);
    }
  }

  // 20️⃣ If we get here (missing code or error), fall back to the login page with an error flag.
  return NextResponse.redirect(`${origin}/login?error=auth`);
}
```

#### c) MFA Enrollment & Verification (`utils/auth/mfa.ts`)

```ts
// utils/auth/mfa.ts
import { createSupabaseServerClient } from '@/utils/supabase/server'; // 1️⃣
import { Database } from '@/types/supabase';                         // 2️⃣ (generated types)

/** 
 * 3️⃣ Enroll a user in a TOTP authenticator (e.g., Google Authenticator).
 *    Returns the `otpauth_url` a client can turn into a QR code.
 */
export const enrollTOTP = async (userId: string) => {
  const supabase = await createSupabaseServerClient();

  // 4️⃣ Supabase’s `mfa.enroll` endpoint creates a secret and QR data.
  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: 'totp',
    // `issuer` appears in the Authenticator app’s account name.
    totpIssuer: 'Transcendence',
    // Optional `totpLabel` defaults to the user’s email.
    totpLabel: userId,
  });

  if (error) throw error; // 5️⃣ Propagate error to caller.

  // 6️⃣ `data` contains `{ qr_code: string; secret: string }`.
  //    We only need the QR code URL to render a QR image.
  return data.qr_code;
};

/** 
 * 7️⃣ Verify a one‑time password submitted by the user after scanning the QR.
 *    When successful, Supabase upgrades the JWT’s AAL to `aal2`.
 */
export const verifyTOTP = async (otp: string) => {
  const supabase = await createSupabaseServerClient();

  // 8️⃣ `auth.mfa.verify` exchanges the OTP for a new session JWT.
  const { data, error } = await supabase.auth.mfa.verify({
    factorId: 'totp', // The factor we enrolled; Supabase auto‑detects.
    code: otp,
  });

  if (error) throw error; // 9️⃣ Forward any verification errors.

  // 10️⃣ `data.session` now carries `aal: 'aal2'`. The server client will set
  //      a fresh `sb:session` cookie containing the upgraded JWT.
  return data.session;
};
```

#### d) Helper to protect routes via middleware (`middleware.ts`)

```ts
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken'; // 1️⃣

/** 
 * 2️⃣ Simple middleware that runs on every request.
 *    It reads the `sb:session` cookie, verifies the JWT signature,
 *    and checks the `aal` claim. If `aal` is not `aal2` it redirects
 *    to the MFA page.
 */
export async function middleware(request: NextRequest) {
  const token = request.cookies.get('sb:session')?.value; // 3️⃣

  // 4️⃣ If there is no session cookie, let the request continue (public route).
  if (!token) return NextResponse.next();

  try {
    // 5️⃣ Verify the JWT using the Supabase service role secret.
    const payload = jwt.verify(
      token,
      process.env.SUPABASE_JWT_SECRET!
    ) as Record<string, any>;

    // 6️⃣ Extract the AAL claim; missing means `aal1`.
    const aal = payload.aal ?? 'aal1';

    // 7️⃣ If the route is under `/protected` and the user is only `aal1`,
    //      force them to the MFA page. Preserve the original path.
    if (request.nextUrl.pathname.startsWith('/protected') && aal !== 'aal2') {
      const redirectUrl = new URL('/auth/verify-mfa', request.url);
      redirectUrl.searchParams.set('next', request.nextUrl.pathname);
      return NextResponse.redirect(redirectUrl);
    }

    // 8️⃣ Otherwise, allow the request to proceed.
    return NextResponse.next();
  } catch (e) {
    // 9️⃣ If verification fails (expired, tampered), clear the cookie and
    //      redirect to the login page.
    const resp = NextResponse.redirect(new URL('/login', request.url));
    resp.cookies.delete('sb:session');
    return resp;
  }
}

// 10️⃣ Apply the middleware to all routes except static assets.
export const config = {
  matcher: ['/((?!_next/static|favicon.ico).*)'],
};
```

### 2️⃣ STEP‑BY‑STEP TRACE  

| # | Code line | Explanation |
|---|-----------|-------------|
| **Google sign‑in helper** |
| 1 | `import { createSupabaseBrowserClient } from '@/utils/supabase/client';` | Pulls the client factory that will execute in the browser. |
| 2 | `import { AuthError } from '@supabase/supabase-js';` | Types the error object we may receive from Supabase. |
| 3 | `export const signInWithGoogle = async (redirectTo = '/') => {` | Exposes a reusable async function that callers can invoke (e.g., on a button click). |
| 5 | `const supabase = createSupabaseBrowserClient();` | Instantiates the browser client; it will automatically read the `sb:session` cookie on each request. |
| 6‑7 | `await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: … } });` | The method creates a **PKCE challenge**, stores a CSRF `state` cookie, then **redirects** the browser to `https://<supabase>.supabase.co/auth/v1/authorize?...` with the Google provider flag. |
| 8‑9 | `if (error) console.error(...);` | Simple error handling – Supabase returns an `AuthError` if the OAuth URL cannot be generated. |
| **Callback route** |
| 1‑3 | Imports – `NextResponse` (for redirects), server client, and a utility that sanitises the final redirect URL. |
| 4‑5 | `export async function GET(request: Request) { … const requestUrl = new URL(request.url);` | Begins the GET handler; `requestUrl` gives us access to query parameters and the full URL. |
| 6‑7 | Derive `origin` from the `Host` header – crucial when the app runs behind a reverse proxy that reports `0.0.0.0`. |
| 8‑9 | Extract `code` (Google’s auth code) and the optional `next` param. `validateSafeRedirect` ensures we don’t open‑redirect to an external site. |
| 10‑11 | If `code` exists, create a **server‑side Supabase client** (`createSupabaseServerClient`) and call `exchangeCodeForSession`. This posts the PKCE verifier (stored in the `state` cookie) and the auth code to Supabase Auth, which returns a **session object** with an **access token** (JWT). |
| 12‑13 | If the exchange succeeded (`!error && data.session`), call `supabase.auth.getUser(access_token)` to fetch the user profile **including MFA factors**. |
| 14‑15 | Manually decode the JWT payload (base64url) to read the `aal` claim. Normally we could parse via `jwt.decode`, but the manual method avoids an extra dependency. |
| 16‑17 | Walk through the `factors` array – Supabase returns each enrolled factor with its `status`. If a factor is verified **and** the JWT reports `aal1`, the user has not yet passed the MFA gate. |
| 18‑19 | Redirect them to `/auth/verify-mfa?next=…` preserving the original destination. The `NextResponse.redirect` instructs Next.js to send a **302** response to the browser. |
| 20‑21 | If the JWT already contains `aal2` (or there is no factor), we simply redirect to the original `safeNext`. |
| 22‑23 | If there is no `code` or an error, fallback to `/login?error=auth`. |
| **MFA enrollment** |
| 1‑2 | Imports – server client and generated DB types (useful for TypeScript safety). |
| 3‑4 | `enrollTOTP` receives a `userId` (could be email) but Supabase uses the current session to know which user is enrolling. |
| 5‑6 | Calls `supabase.auth.mfa.enroll({ factorType: 'totp', … })`. Supabase creates a random secret, stores it encrypted, and returns a `qr_code` URL that encodes the secret in the **otpauth://** scheme. |
| 7‑8 | The caller (React component) renders the QR image (`<img src={qrUrl} …/>`). |
| **MFA verification** |
| 1‑2 | Same server client import. |
| 3‑4 | `verifyTOTP` sends the **one‑time password** the user typed into the `supabase.auth.mfa.verify` endpoint. |
| 5‑6 | Supabase checks the OTP against the stored secret; on success it **issues a new session JWT** where `aal` is now `'aal2'`. |
| 7‑8 | The server client writes this fresh JWT to the `sb:session` cookie (via `setAll`). The browser now holds an upgraded token. |
| **Middleware** |
| 1 | Imports `jsonwebtoken` to verify the JWT signature server‑side. |
| 2‑3 | Reads the `sb:session` cookie from the incoming request. |
| 4‑5 | If missing, the request is treated as unauthenticated (public). |
| 6‑9 | `jwt.verify` validates the token using the Supabase JWT secret (stored in `process.env.SUPABASE_JWT_SECRET`). The payload is available as `payload`. |
| 7 | Extracts the `aal` claim; default is `'aal1'`. |
| 8‑9 | If the path is under `/protected` and `aal` is not `'aal2'`, the request is redirected to the MFA page. |
| 10‑11 | On verification failure (expired, tampered), the cookie is cleared and the user is sent to `/login`. |
| 12‑13 | `config.matcher` tells Next.js to run this middleware on **all** routes except static assets. |

### 3️⃣ UNDER‑THE‑HOOD MECHANICS  

#### a) OAuth PKCE & State  

| Phase | Low‑level details |
|-------|-------------------|
| **Step 1 – Initiate** | `signInWithGoogle` calls Supabase’s `signInWithOAuth`. Supabase: <br> • Generates a **code verifier** (random 43‑128 char string). <br> • Derives a **code challenge** = `BASE64URL‑SHA256(verifier)`. <br> • Stores the verifier **temporarily in a cookie** (e.g., `sb:pkce_verifier`). <br> • Generates a **CSRF `state` token**, stores it in another cookie (`sb:state`). |
| **Step 2 – Redirect** | The browser is redirected to `https://<supabase>.supabase.co/auth/v1/authorize?...&code_challenge=…&code_challenge_method=S256&state=…`. Google shows the consent screen. |
| **Step 3 – Callback** | Google redirects to `/auth/callback?code=…&state=…`. The server reads the `state` cookie and compares it to the query param (prevent CSRF). |
| **Step 4 – Token Exchange** | `supabase.auth.exchangeCodeForSession(code)` POSTs to `https://<supabase>.supabase.co/auth/v1/token` with JSON body: `{ grant_type: 'authorization_code', code, code_verifier: <verifier from cookie> }`. Supabase verifies the PKCE challenge, then issues a **session JWT** (`access_token`). |
| **Step 5 – Cookie Set** | Supabase returns `Set‑Cookie: sb:session=<JWT>; HttpOnly; Secure; Path=/; SameSite=Lax`. The server client’s `cookies.setAll` writes this header into the Next.js response. |
| **AAL** | The JWT payload contains `aal`. If the user has only completed OAuth (no MFA), Supabase sets `"aal":"aal1"`. Once the user successfully verifies a TOTP factor, the session JWT is refreshed with `"aal":"aal2"`. |
| **Middleware Check** | The middleware parses the JWT with `jsonwebtoken.verify`, reads `payload.aal`. Because the JWT is **signed** with the Supabase secret, tampering would cause verification to fail, preventing any elevation of privileges. |
| **RLS Interaction** | Inside PostgreSQL, policies can use `auth.jwt()` to read `payload->>'aal'`. A policy like `auth.uid() = user_id AND (payload->>'aal') = 'aal2'` can block reads for users who haven’t completed MFA. |

#### b) MFA Enroll & Verify  

* **Enroll** – Supabase creates a **TOTP secret** (random 160‑bit Base32). It stores the encrypted secret in the `auth.mfa_factors` table, linked to the user’s `id`. The endpoint returns an `otpauth://totp/Issuer:User?secret=…&issuer=Issuer` URL, which when rendered as a QR code can be scanned by an authenticator app.  
* **Verify** – The OTP the user supplies is checked against the stored secret (HOTP/TOTP algorithm, 30 s time step). If it matches, Supabase marks the factor as `verified` and **issues a new JWT** with `aal: "aal2"`. The new JWT is written back to the session cookie.  

### 4️⃣ “EXPLAIN‑IT‑LIKE‑I‑WROTE‑IT” SCRIPTVIEW  

> “When a user clicks **Sign‑in with Google**, our `signInWithGoogle` helper uses Supabase’s `signInWithOAuth`. Supabase generates a PKCE verifier, stores it in a temporary cookie, and redirects the browser to Google. Google sends us back to `/auth/callback` with an auth code and the same `state`. In the callback we exchange that code (using the saved PKCE verifier) for a Supabase session JWT. We immediately fetch the user’s factor list and decode the JWT payload to inspect the `aal` claim. If the user only has `aal1` but does have a verified TOTP factor, we redirect them to `/auth/verify‑mfa` so they can finish MFA; otherwise we redirect to the original page. The server‑side Supabase client reads and writes the `sb:session` cookie via a custom `cookies` interface we provide. Our middleware runs on every request, verifies the JWT signature with our Supabase secret, extracts `aal`, and forces any `/protected` route to go through MFA if the claim isn’t `aal2`. The MFA enrollment endpoint creates a TOTP secret, gives us a QR code URL, and verification swaps the JWT for one with `aal2`. This whole flow guarantees that only users who have passed the second factor ever get a JWT with `aal2`, and our Row‑Level Security policies can trust that claim to guard data.”  

---  

## MODULE 3 – The Leaderboard System (Performant Data Pulling)

### 1️⃣ THE CODE ARCHITECTURE  

#### a) TypeScript types (`types/supabase.ts`)

```ts
// types/supabase.ts
export interface Profile {
  id: string;
  username: string;
  avatar_url?: string;
}

export interface Score {
  user_id: string;
  score: number;
  created_at: string; // ISO timestamp
}
```

#### b) Server Component (`app/leaderboard/page.tsx`)

```tsx
// app/leaderboard/page.tsx
import { createSupabaseServerClient } from '@/utils/supabase/server'; // 1️⃣
import { Profile, Score } from '@/types/supabase';                    // 2️⃣
import { SideNav } from '@/app/components/duel/side-nav';            // 3️⃣
import { Avatar } from '@/app/components/duel/avatar';                // 4️⃣
import { getTranslations } from 'next-intl/server';                  // 5️⃣
import { Suspense } from 'react';                                    // 6️⃣

/** 
 * 7️⃣ Top‑level async Server Component – Next.js will run this on the server at request time.
 */
export default async function LeaderboardPage() {
  // 8️⃣ Instantiate a server‑side Supabase client (cookies + auth JWT are available).
  const supabase = await createSupabaseServerClient();

  // 9️⃣ Pull the logged‑in user (to know who is viewing the page).
  const { data: { user } } = await supabase.auth.getUser();

  // 10️⃣ Guard: if no user, redirect to login (using Next.js server‑side redirect).
  if (!user) {
    // Note: `redirect` is a server‑side helper that throws a Response.
    // It will be caught by Next.js and turned into a 307.
    redirect('/login');
  }

  // 11️⃣ Internationalisation – fetch translation bundle for the “Leaderboard” namespace.
  const t = await getTranslations('Leaderboard');

  // 12️⃣ **Pagination cursor** – read `cursor` query param (score ID) for offset pagination.
  //      In a real app you'd use `request.nextUrl.searchParams`, but Server Components
  //      receive it via the page’s `searchParams` prop. For brevity we use a placeholder.
  const cursor = undefined; // ← replace with actual cursor extraction logic.

  // 13️⃣ **Fetch profiles** – only the columns we need.
  const { data: profiles, error: profilesError } = await supabase
    .from<Profile>('profiles')
    .select('id, username, avatar_url')
    .order('username', { ascending: true });

  // 14️⃣ **Fetch scores** – use **cursor‑based pagination** for deterministic ordering.
  //      The query is ordered by `score DESC, created_at DESC` and limited to 50 rows.
  const { data: scores, error: scoresError } = await supabase
    .from<Score>('scores')
    .select('user_id, score, created_at')
    .order('score', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(50)                     // 15️⃣ fetch a page of 50 rows
    .gt('score', cursor ?? 0);    // 16️⃣ fetch rows with a higher score than the cursor

  // 17️⃣ Consolidate any DB error.
  const dbError = profilesError ?? scoresError;
  if (dbError) {
    console.error('Leaderboard DB error:', dbError);
    // Optionally throw to trigger Next.js error page.
  }

  // 18️⃣ Build a map of `userId -> Profile` for fast lookup when rendering scores.
  const profileMap = new Map<string, Profile>();
  profiles?.forEach(p => profileMap.set(p.id, p));

  // 19️⃣ Combine score rows with profile data, compute rank.
  const leaderboard = scores?.map((s, idx) => ({
    rank: idx + 1,
    userId: s.user_id,
    username: profileMap.get(s.user_id)?.username ?? 'Unknown',
    avatar: profileMap.get(s.user_id)?.avatar_url,
    score: s.score,
    isSelf: s.user_id === user.id,
  })) ?? [];

  // 20️⃣ Render – wrap heavy UI in `<Suspense>` for streaming.
  return (
    <SideNav user={user.email}>
      <div className="relative min-h-screen p-6 bg-[#0f131b] text-[#eef2f8]">
        {/* Header & Title */}
        <header className="mb-8">
          <h1 className="text-3xl font-bold">{t('title')}</h1>
          <p className="text-sm text-[#5d6877]">{t('subtitle')}</p>
        </header>

        {/* Top‑3 podium – reuse the first three entries */}
        <Podium leaderboard={leaderboard.slice(0, 3)} t={t} />

        {/* Leaderboard Table */}
        <div className="mt-12 overflow-x-auto">
          <table className="w-full min-w-[600px] border-collapse">
            <thead className="bg-white/[.02]">
              <tr className="border-b border-white/[.07]">
                <th className="py-4 px-5 text-xs uppercase text-[#5d6877]">{t('rank')}</th>
                <th className="py-4 px-5 text-xs uppercase text-[#5d6877]">{t('player')}</th>
                <th className="py-4 px-5 text-xs uppercase text-[#5d6877] text-right">{t('score')}</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map(row => (
                <tr
                  key={row.userId}
                  className={`border-b border-white/[.04] hover:bg-white/[.01] transition-colors ${
                    row.isSelf ? 'bg-[#4d86ff]/[0.03] border-l-2 border-l-[#4d86ff]' : ''
                  }`}
                >
                  <td className="py-3.5 px-5 text-center">{row.rank}</td>
                  <td className="py-3.5 px-5 flex items-center gap-3">
                    <Avatar name={row.username} src={row.avatar} size="sm" />
                    <span className="truncate max-w-[150px]">{row.username}</span>
                  </td>
                  <td className="py-3.5 px-5 text-right font-mono">{row.score}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="mt-6 flex justify-center space-x-4">
          {/* Previous (cursor‑based) could be calculated from the first row’s score */}
          <button
            className="rounded px-4 py-2 bg-slate-700 hover:bg-slate-600"
            disabled={!cursor}
            onClick={() => {
              // client‑side navigation using Next.js router (not shown)
            }}
          >
            {t('previous')}
          </button>
          <button
            className="rounded px-4 py-2 bg-slate-700 hover:bg-slate-600"
            disabled={leaderboard.length < 50}
            onClick={() => {
              // client‑side navigation – push new cursor = last row’s score
            }}
          >
            {t('next')}
          </button>
        </div>
      </div>
    </SideNav>
  );
}

/* ---------------------------------------------------------------------- */
/* Helper component for the top‑3 podium – pure client‑side UI logic       */
/* ---------------------------------------------------------------------- */
function Podium({
  leaderboard,
  t,
}: {
  leaderboard: Array<{
    rank: number;
    username: string;
    avatar?: string;
    score: number;
    isSelf: boolean;
  }>;
  t: (key: string) => string;
}) {
  const [first, second, third] = leaderboard;
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 items-end">
      {/* 2nd Place */}
      {second && (
        <div className="relative flex flex-col items-center p-5 rounded-[10px] border border-slate-400/20 bg-gradient-to-b from-[#1b2230]/40 to-[#0f131b] shadow-md backdrop-blur-sm">
          <div className="absolute -top-5 w-10 h-10 rounded-full bg-slate-400 flex items-center justify-center shadow-md">
            <svg /* Medal icon */ />
          </div>
          <Avatar name={second.username} src={second.avatar} size="md" />
          <span className="mt-2.5 font-bold truncate">{second.username}</span>
          <div className="mt-4 grid grid-cols-3 gap-2 w-full border-t pt-3 text-center">
            <div>{t('score')}: <strong>{second.score}</strong></div>
          </div>
        </div>
      )}
      {/* 1st Place */}
      {first && (
        <div className="relative flex flex-col items-center p-6 rounded-[10px] border border-amber-500/30 bg-gradient-to-b from-[#2e2417]/50 to-[#0f131b] shadow-[0_0_25px_-5px_rgba(245,158,11,0.15)] md:-translate-y-4">
          <div className="absolute -top-6 w-12 h-12 rounded-full bg-amber-500 flex items-center justify-center shadow-lg">
            <svg /* Crown icon */ />
          </div>
          <Avatar name={first.username} src={first.avatar} size="lg" />
          <span className="mt-3 text-lg font-bold">{first.username}</span>
          <div className="mt-5 grid grid-cols-3 gap-2 w-full border-t pt-4 text-center">
            <div>{t('score')}: <strong>{first.score}</strong></div>
          </div>
        </div>
      )}
      {/* 3rd Place */}
      {third && (
        <div className="relative flex flex-col items-center p-5 rounded-[10px] border border-amber-700/20 bg-gradient-to-b from-[#251b17]/40 to-[#0f131b] shadow-md backdrop-blur-sm">
          <div className="absolute -top-5 w-10 h-10 rounded-full bg-amber-700 flex items-center justify-center shadow-md">
            <svg /* Medal icon */ />
          </div>
          <Avatar name={third.username} src={third.avatar} size="md" />
          <span className="mt-2.5 font-bold truncate">{third.username}</span>
          <div className="mt-4 grid grid-cols-3 gap-2 w-full border-t pt-3 text-center">
            <div>{t('score')}: <strong>{third.score}</strong></div>
          </div>
        </div>
      )}
    </div>
  );
}
```

#### c) Real‑time subscription (`app/leaderboard/RealtimeUpdates.tsx`)

```tsx
// app/leaderboard/RealtimeUpdates.tsx
import { useEffect, useState } from 'react';
import { createSupabaseBrowserClient } from '@/utils/supabase/client';
import { Score } from '@/types/supabase';

export function useRealtimeLeaderboard(limit = 25) {
  const [leaderboard, setLeaderboard] = useState<Score[]>([]);
  const supabase = createSupabaseBrowserClient();

  useEffect(() => {
    // 1️⃣ Initial pull (same query as in the RSC but client‑side for SSR‑fallback)
    supabase
      .from<Score>('scores')
      .select('user_id, score, created_at')
      .order('score', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(limit)
      .then(({ data, error }) => {
        if (!error && data) setLeaderboard(data);
      });

    // 2️⃣ Subscribe to the `scores` realtime channel
    const channel = supabase
      .channel('public:scores')
      .on(
        'postgres_changes',
        {
          // Listen to INSERT, UPDATE, DELETE on the `scores` table
          event: '*',
          schema: 'public',
          table: 'scores',
        },
        (payload) => {
          // Payload shape: { new: row, old: row?, eventType }
          const newScore: Score = payload.new;

          // 3️⃣ Optimistic update – insert and keep sorted order
          setLeaderboard((prev) => {
            const updated = [...prev, newScore];
            // Sort descending by score, then created_at
            updated.sort((a, b) => {
              if (b.score !== a.score) return b.score - a.score;
              return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
            });
            // Trim to limit
            return updated.slice(0, limit);
          });
        }
      )
      .subscribe();

    // 4️⃣ Cleanup on unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, [limit, supabase]);

  return leaderboard;
}
```

### 2️⃣ STEP‑BY‑STEP TRACE  

| # | Code line | Explanation |
|---|-----------|-------------|
| **Server Component** |
| 1‑2 | Import the server client and TypeScript types for `Profile` and `Score`. |
| 3‑4 | Import UI helpers (`SideNav`, `Avatar`) and `next-intl` for localisation. |
| 6 | `export default async function LeaderboardPage()` – declares a **Server Component** that can `await` data. |
| 8 | `const supabase = await createSupabaseServerClient();` – gets a Supabase client bound to the incoming request’s cookies. |
| 9‑10 | `await supabase.auth.getUser()` – fetches the logged‑in user’s JWT payload. If missing, we `redirect('/login')`. |
| 11 | Load translation bundle for the “Leaderboard” namespace, enabling `t('key')` look‑ups. |
| 12‑13 | Placeholder `cursor` – in a real implementation you’d read from `request.nextUrl.searchParams.get('cursor')`. |
| 14‑15 | Query `profiles` table, selecting only needed columns, ordering alphabetically (optional). |
| 16‑18 | Query `scores` with **cursor‑based pagination**: order by `score DESC, created_at DESC`, `gt('score', cursor ?? 0)`. The `limit(50)` fetches one page (50 rows). |
| 19‑21 | Consolidate any DB error, log it, optionally surface a UI error. |
| 22‑23 | Build a **Map** (`profileMap`) keyed by `profile.id` for O(1) look‑ups when merging data. |
| 24‑27 | Create the final `leaderboard` array: attach rank, username, avatar URL, flag `isSelf` if the row belongs to the current user. |
| 28‑31 | Render the whole page: `<SideNav>` wraps the content, header displays titles, `<Podium>` shows the top‑3. |
| 33‑64 | The **table** renders each row with Tailwind‑styled cells, highlighting the logged‑in player (`bg-[#4d86ff]/[0.03]`). |
| 66‑73 | Pagination buttons (`Previous`, `Next`) – in a fully‑client‑side SPA you’d use Next.js router to push a new `cursor` param; here they are stubs. |
| **Podium helper** | Renders three cards (2nd, 1st, 3rd) with custom glass‑morphism styles and icons. |
| **Realtime hook** |
| 1 | `useEffect` runs once on mount (client side). |
| 2‑6 | Initial fetch: same query as the RSC but done in the browser to seed the realtime state. |
| 7‑14 | `supabase.channel('public:scores')` opens a **Realtime** channel named after the schema‑table combination. |
| 10‑13 | `.on('postgres_changes', { event: '*', schema: 'public', table: 'scores' }, callback)` listens to **INSERT/UPDATE/DELETE** events. The callback receives `{ new, old, eventType }`. |
| 14‑24 | In the callback we merge the incoming row into the local `leaderboard` state, re‑sort descending, and keep only `limit` rows. |
| 26‑28 | Cleanup – `removeChannel` when the component unmounts. |

### 3️⃣ UNDER‑THE‑HOOD MECHANICS  

#### a) Row‑Level Security (RLS) & `auth.uid()`  

```sql
-- Example RLS policy on scores
CREATE POLICY "public_scores" ON public.scores
FOR SELECT
USING (auth.uid() = user_id OR auth.role() = 'anon');
```

* When the server client issues `SELECT * FROM scores ORDER BY score DESC LIMIT 50`, PostgREST calls the PostgreSQL planner. The policy’s `USING` clause becomes a **WHERE** predicate: `WHERE (auth.uid() = user_id OR auth.role() = 'anon')`. Supabase’s internal `auth.uid()` extracts the `sub` claim from the JWT passed in the `Authorization` header. If the JWT contains `aal2`, the user can also read rows where `user_id` matches; otherwise they may be restricted.  

#### b) Query Planning & Index Usage  

* **Table definition (simplified):**  

```sql
CREATE TABLE public.scores (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES profiles(id),
  score bigint NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_scores_score_desc ON public.scores (score DESC, created_at DESC);
```

* The `ORDER BY score DESC, created_at DESC` **matches** the index definition. The PostgreSQL planner therefore uses an **Index Scan (Backward)** on `idx_scores_score_desc`, retrieving rows in the required order **without a sort** step.  
* With the additional `gt('score', cursor)` (cursor pagination), the planner does an **Index Scan with a range condition**, still O(log N) to locate the start point, then streams forward up to the `LIMIT`. This avoids a full table scan even for millions of rows.  

#### c) Realtime Channel Flow  

1. **Client** (`supabase-js` in the browser) opens a **WebSocket** connection to `wss://<SUPABASE_URL>/realtime/v1`.  
2. **Handshake** includes the JWT in the `Authorization` header of the WebSocket upgrade request. Supabase validates the token and binds the socket to that user’s session (enables RLS enforcement on realtime events).  
3. **Subscription** (`channel('public:scores')`) registers interest in `INSERT/UPDATE/DELETE` on the `scores` table. Internally Supabase creates a **PostgreSQL logical replication** slot that streams changes into the Realtime server, which then pushes JSON payloads over the WebSocket to the client.  
4. **Client callback** receives the payload (`{ new: {...}, old: {...}, eventType }`). Our hook merges it into UI state, guaranteeing **near‑real‑time** leaderboard updates without re‑fetching the whole table.  

### 4️⃣ “EXPLAIN‑IT‑LIKE‑I‑WROTE‑IT” SCRIPTVIEW  

> “The **Leaderboard** page is a pure Server Component. First we spin up a server‑side Supabase client (which reads the JWT from the request’s cookies). We fetch the authenticated user, then two queries: one for the `profiles` table (just `id`, `username`, `avatar_url`) and one for the `scores` table ordered by `score DESC, created_at DESC` with a cursor‑based `gt('score', cursor)` and a `limit(50)`. Because we have a composite B‑Tree index on `(score DESC, created_at DESC)`, PostgreSQL can start the scan right at the cursor value (log‑N) and stream the next 50 rows in the correct order—no sort, no full scan. After the DB round‑trip we merge the two result sets via a `Map` for O(1) user lookup, attach rank numbers, and render a Tailwind‑styled table with glass‑morphism effects.  

> For live updates we expose a client‑side hook `useRealtimeLeaderboard`. It opens a Supabase Realtime WebSocket (auth token sent on the upgrade request), subscribes to `postgres_changes` on the `scores` table, and on every INSERT/UPDATE/DELETE it inserts the new row into the local state, re‑sorts, and trims to the page limit—so the UI stays fresh without re‑querying.  

> Row‑Level Security policies guard the data: each query includes a `WHERE auth.uid() = user_id` clause derived from the JWT’s `sub`. The JWT also carries the AAL claim, so our middleware can force users who are still at `aal1` to the MFA page before they ever see the leaderboard. Everything is typed, server‑rendered for SEO, and streamed to the client, giving a fast, secure, and perfectly audit‑able leaderboard.”  

---  

# 📦 Putting It All Together  

* **Server client** (`utils/supabase/server.ts`) → reads/writes the `sb:session` cookie, enabling SSR auth and RLS.  
* **Browser client** (`utils/supabase/client.ts`) → uses native cookies for subsequent fetches.  
* **OAuth flow** (`signInWithGoogle` + `auth/callback/route.ts`) → PKCE, state, JWT issuance, AAL check, conditional MFA redirect.  
* **MFA** (`enrollTOTP`, `verifyTOTP`) → TOTP secret creation, QR code delivery, OTP verification → JWT upgraded to `aal2`.  
* **Middleware** → enforces `aal2` on protected routes, reads JWT via `jsonwebtoken`.  
* **Leaderboard** (`app/leaderboard/page.tsx`) → server‑side cursor‑based pagination, B‑Tree index‑driven query, RLS enforcement, UI with glass‑morphism, and a client‑side realtime hook for live updates.  

You now have a **line‑by‑line, end‑to‑end** blueprint you can walk through, discuss, and even modify with confidence. Happy coding!