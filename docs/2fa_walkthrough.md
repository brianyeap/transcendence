# Walkthrough: Supabase Native TOTP MFA/2FA Implementation

We have implemented native TOTP Multi-Factor Authentication (MFA / 2FA) into this Next.js App Router project using native Supabase Auth MFA APIs.

---

## 1. Assurance Level Concept: Supabase `aal1` vs `aal2`

- **`aal1` (Authenticator Assurance Level 1)**:
  The user has completed primary authentication (e.g. Google OAuth sign-in or email/password). The session JWT has an `aal` claim set to `"aal1"`.
- **`aal2` (Authenticator Assurance Level 2)**:
  The user has enrolled a TOTP factor and successfully verified a second-factor challenge (`mfa.challenge()` + `mfa.verify()`). Upon verification, Supabase re-issues the session token containing `"aal": "aal2"`.
- **MFA Enforcement**:
  When a user has enrolled a verified factor, `mfa.getAuthenticatorAssuranceLevel()` reports `nextLevel: 'aal2'`. If `currentLevel` is `'aal1'`, the user is intercepted and required to satisfy second-factor verification before accessing protected server routes, server actions, or database rows guarded by `aal2` RLS policies.

---

## 2. Changes Summary

| File | Purpose |
| --- | --- |
| [lib/auth/redirect.ts](file:///wsl.localhost/Ubuntu/home/zepos/coding_stuff/transcendence/lib/auth/redirect.ts) | Pure utility function `validateSafeRedirect` guarding against open-redirect vulnerabilities. |
| [lib/auth/mfa.ts](file:///wsl.localhost/Ubuntu/home/zepos/coding_stuff/transcendence/lib/auth/mfa.ts) | Server-side MFA guards: `getAuthAssuranceLevel`, `requireAuthWithMfa`, and `assertAal2Action`. |
| [app/auth/callback/route.ts](file:///wsl.localhost/Ubuntu/home/zepos/coding_stuff/transcendence/app/auth/callback/route.ts) | Exchanges OAuth code for session, queries `getAuthenticatorAssuranceLevel()`, redirects to `/auth/verify-mfa` if `aal1 -> aal2`, preserving safe `next`. |
| [app/login/page.tsx](file:///wsl.localhost/Ubuntu/home/zepos/coding_stuff/transcendence/app/login/page.tsx) | Passes safe `next` param in Google OAuth callback URL, and checks `aal2` requirement on password sign-in. |
| [app/auth/verify-mfa/page.tsx](file:///wsl.localhost/Ubuntu/home/zepos/coding_stuff/transcendence/app/auth/verify-mfa/page.tsx) | MFA challenge verification page: loads TOTP factors with `listFactors()`, triggers `challenge()`, verifies code via `verify()`, handles expired/invalid/network states. |
| [app/components/auth/mfa-settings.tsx](file:///wsl.localhost/Ubuntu/home/zepos/coding_stuff/transcendence/app/components/auth/mfa-settings.tsx) | Client component for settings: enrolls TOTP factor (`enroll`), renders QR code and manual secret, verifies enrollment (`challenge` + `verify`), lists active factors, allows secure factor removal (`unenroll`). |
| [app/settings/page.tsx](file:///wsl.localhost/Ubuntu/home/zepos/coding_stuff/transcendence/app/settings/page.tsx) | Protected via `requireAuthWithMfa("/settings")`; embeds `<MfaSettings />` in the Security card. |
| [app/api/user/security/route.ts](file:///wsl.localhost/Ubuntu/home/zepos/coding_stuff/transcendence/app/api/user/security/route.ts) | Sensitive API route demonstrating server-side `assertAal2Action()` protection (returns 403 when session is only `aal1`). |
| [supabase/mfa-rls-policy.sql](file:///wsl.localhost/Ubuntu/home/zepos/coding_stuff/transcendence/supabase/mfa-rls-policy.sql) | Example PostgreSQL RLS policies enforcing `(select auth.jwt()->>'aal') = 'aal2'`. |

---

## 3. Security Hardening

- **Zero Secret Exposure**: No service-role keys or sensitive credentials exist in client code.
- **No Sensitive Logging**: TOTP codes, QR URLs, factor secrets, OAuth tokens, and session credentials are never passed to `console.log`.
- **Open Redirect Protection**: Any `next` destination is strictly validated to ensure it starts with `/` and contains no protocol schemes or double slashes (`//`).
- **Server-Side Enforcement**: Server routes and actions reject requests with `403 Forbidden` if MFA is enrolled and the user has not satisfied `aal2`.

---

## 4. Verification Results

- **TypeScript Compilation**: Passed with 0 errors via `npx tsc --noEmit`.
- **ESLint**: Passed with 0 errors and 0 warnings across all modified and new MFA files via `npx eslint`.
- **Next.js Production Build**: Passed with 0 errors via `npm run build`.
