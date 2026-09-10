/**
 * Validates a redirect URL to prevent Open Redirect vulnerabilities.
 * Ensures the target is a relative internal path starting with a single '/'
 * and does not contain protocol-relative slashes ('//'), backslashes, or scheme separators ('://').
 */
export function validateSafeRedirect(
  next: string | null | undefined,
  fallback = "/"
): string {
  if (!next || typeof next !== "string") {
    return fallback;
  }

  const trimmed = next.trim();

  // Must begin with a single '/' and not '//' or '/\' or '\'
  if (
    !trimmed.startsWith("/") ||
    trimmed.startsWith("//") ||
    trimmed.startsWith("/\\") ||
    trimmed.startsWith("\\")
  ) {
    return fallback;
  }

  // Must not contain scheme indicators or control characters
  if (
    trimmed.includes("://") ||
    trimmed.includes("\r") ||
    trimmed.includes("\n")
  ) {
    return fallback;
  }

  return trimmed;
}
