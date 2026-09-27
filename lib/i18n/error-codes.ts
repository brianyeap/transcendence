/**
 * Server-to-client localized error mapping.
 *
 * Backend routes do NOT return human-readable English strings anymore. They
 * return a stable machine-readable `code`, and the client turns that code into
 * a translated string using next-intl. This is what makes an error render in
 * the user's selected language instead of always English.
 *
 * Keys live under the "ApiErrors" namespace in messages/{en,ms,zh-CN}.json.
 *
 * Usage in a client component:
 *   const t = useTranslations("ApiErrors");
 *   const message = t(messageKeyFor(payload?.code) ?? "generic");
 */

/** Maps an API error code to its key inside the "ApiErrors" message namespace. */
const ERROR_CODE_TO_KEY: Record<string, string> = {
  // ---- shared ----------------------------------------------------------
  not_authenticated: "notAuthenticated",
  invalid_request: "invalidRequest",
  generic: "generic",

  // ---- avatar POST / DELETE -------------------------------------------
  file_too_large: "fileTooLarge",
  expected_multipart: "expectedMultipart",
  could_not_read_upload: "couldNotReadUpload",
  no_file: "noFile",
  empty_file: "emptyFile",
  invalid_format: "invalidFormat",
  unreadable_image: "unreadableImage",
  storage_failed: "storageFailed",
  url_resolve_failed: "urlResolveFailed",
  profile_save_failed: "profileSaveFailed",
  storage_delete_failed: "storageDeleteFailed",
  profile_delete_failed: "profileDeleteFailed",

  // ---- username --------------------------------------------------------
  username_required: "usernameRequired",
  username_too_short: "usernameTooShort",
  username_too_long: "usernameTooLong",
  username_invalid_chars: "usernameInvalidChars",
  username_taken: "usernameTaken",
  username_save_failed: "usernameSaveFailed",
};

/**
 * Resolve an API error code to a message key inside the "ApiErrors" namespace.
 * Returns null when the code is missing or unknown, so the caller can fall back
 * to a generic message rather than rendering a raw code to the user.
 */
export function messageKeyFor(code: unknown): string | null {
  if (typeof code !== "string") return null;
  return ERROR_CODE_TO_KEY[code] ?? null;
}
