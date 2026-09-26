/**
 * Validation for avatar URLs.
 *
 * `profiles.avatar_url` is a string that ends up rendered as an <img src=...>
 * in a dozen places. Historically the browser wrote whatever it liked into
 * that column, so an attacker could point it at an external tracking pixel
 * (or anything else) and have it render for every viewer.
 *
 * The write path now lives server-side in app/api/profile/avatar/route.ts,
 * which derives the URL from its own Storage response. This module is the
 * safety net for the read path: it is deliberately dependency-free and
 * imports nothing, so both the server route and client components can use it.
 *
 * NOTE: this file intentionally has no "use client" directive. It is a plain
 * module of pure functions. A "use client" directive here would poison it for
 * the route handler import.
 */

/** Hosts that are allowed to serve avatars. Populated from the env var. */
function trustedHostname(): string | null {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!raw) return null;

  try {
    // `new URL()` normalises a trailing slash, so a value like
    // "https://xyz.supabase.co/" and "https://xyz.supabase.co" both yield
    // the same hostname.
    return new URL(raw).hostname.toLowerCase();
  } catch {
    return null;
  }
}

/**
 * True only when `url` is an absolute https URL whose hostname is exactly our
 * Supabase project host.
 *
 * Rejected, in order:
 *   - null / undefined / empty / whitespace-only
 *   - relative URLs ("/foo.jpg") — we never store these, and resolving them
 *     against an unknown base is how allowlist checks get bypassed
 *   - malformed strings
 *   - any scheme other than https, which rules out `javascript:` and `data:`
 *   - any hostname that is not an exact match for the project host
 *
 * The hostname comparison is exact, not a suffix match, so
 * `evil-supabase.co` and `xyz.supabase.co.attacker.com` both fail.
 */
export function isTrustedAvatarUrl(url: string | null | undefined): boolean {
  if (typeof url !== "string") return false;

  const trimmed = url.trim();
  if (trimmed.length === 0) return false;

  // Reject protocol-relative URLs ("//evil.com/x.jpg") before parsing: they
  // parse successfully against a base and would otherwise be a bypass.
  if (trimmed.startsWith("//")) return false;

  const expectedHost = trustedHostname();
  if (!expectedHost) return false;

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return false;
  }

  if (parsed.protocol !== "https:") return false;

  return parsed.hostname.toLowerCase() === expectedHost;
}

/**
 * Returns the avatar URL if it passes isTrustedAvatarUrl, otherwise null.
 * Convenience for callers that just want "a URL I can safely render".
 */
export function trustedAvatarUrlOrNull(
  url: string | null | undefined
): string | null {
  return isTrustedAvatarUrl(url) ? (url as string).trim() : null;
}