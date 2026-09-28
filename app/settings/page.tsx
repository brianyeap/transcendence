"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { SideNav } from "../components/duel/side-nav";
import { LogoutButton } from "../components/auth/logout-button";
import { Avatar } from "../components/duel/avatar";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { resizeImage, AVATAR_MIME_TYPES, AVATAR_MAX_BYTES } from "@/lib/avatar-upload";
import { messageKeyFor } from "@/lib/i18n/error-codes";
import {
  USERNAME_MIN_LENGTH,
  USERNAME_MAX_LENGTH,
  USERNAME_PATTERN,
} from "@/lib/validation/username";
import { User, Mail, Shield, Camera, Languages, FileText, Scale, ChevronRight, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { MfaSettings } from "../components/auth/mfa-settings";
import Link from "next/link";

export default function SettingsPage() {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const t = useTranslations("Settings");
  const tErrors = useTranslations("ApiErrors");

  const [locale, setLocale] = useState("en");

  const [userEmail, setUserEmail] = useState<string>(" ");
  const [username, setUsername] = useState<string>(" ");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  // Avatar upload state
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  // The ORIGINAL file the user picked, sent as-is to the API route, which does
  // its own decode and re-encode. Distinct from the preview blob.
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  // True while a remove request is in flight, so the button can disable itself.
  const [removing, setRemoving] = useState(false);
  const handleLanguageChange = (locale: string) => {
    document.cookie = `locale=${locale}; path=/`;
    window.location.reload();
  };

  const getCurrentLocale = () => {
    return document.cookie
      .split("; ")
      .find((row) => row.startsWith("locale="))
      ?.split("=")[1] ?? "en";
  };
  const [statusMessage, setStatusMessage] = useState("");

  // Username edit state
  const [editingUsername, setEditingUsername] = useState(false);
  const [usernameInput, setUsernameInput] = useState("");

  // Load the logged-in user's data when the page opens
  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      setLocale(getCurrentLocale());

      setUserEmail(user.email ?? "");

      const { data: profile } = await supabase
        .from("profiles")
        .select("username, avatar_url")
        .eq("id", user.id)
        .single();

      if (profile) {
        setUsername(profile.username ?? user.email?.split("@")[0] ?? "");
        setAvatarUrl(profile.avatar_url ?? null);
      }
    };

    fetchUser();
    loadUserData();
  }, [t]);

  async function loadUserData() {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    setUserEmail(user.email ?? "");

    // ─────────────────────────────────────────────
    // ZEP: reads username + avatar_url from profiles
    // table, filtered to the logged-in user's row.
    // ─────────────────────────────────────────────
    const { data: profile } = await supabase
      .from("profiles")
      .select("username, avatar_url")
      .eq("id", user.id)
      .single();

    if (profile) {
      setUsername(profile.username ?? user.email?.split("@")[0] ?? "");
      setAvatarUrl(profile.avatar_url ?? null);
    }
  }

  // Step 1: user picks a photo file.
  //
  // The type check below is UX ONLY — it gives the user a quick, local
  // "that's not an image" message. It is NOT a security control: file.type is
  // a client-supplied string, and this whole function can be skipped from the
  // console. Real validation (magic bytes + full decode) and the re-encode
  // happen server-side in app/api/profile/avatar/route.ts.
  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setStatusMessage(t("chooseImageFile"));
      return;
    }

    // Same list the server accepts, so the user hears "wrong format" now
    // instead of after pressing Save.
    if (!AVATAR_MIME_TYPES.includes(file.type)) {
      setStatusMessage(tErrors("invalidFormat"));
      return;
    }

    // Too big? Say so now instead of uploading it first.
    // The server checks the same 5 MB limit again.
    if (file.size > AVATAR_MAX_BYTES) {
      setStatusMessage(tErrors("fileTooLarge"));
      return;
    }

    setStatusMessage("");

    // Preview only. This blob is never uploaded — the ORIGINAL file is sent
    // to the API route, which does its own decode and re-encode.
    const resized = await resizeImage(file, 256);
    const localUrl = URL.createObjectURL(resized);

    setPreviewUrl(localUrl);
    setPendingFile(file);
  }

  // Step 2: user clicks Confirm to actually save the photo.
  //
  // The browser no longer talks to Storage and no longer writes avatar_url.
  // It posts the original file to our own route, which validates it and
  // returns the URL it derived itself.
  //
  // toast.promise reports the three states. The rejection carries the
  // TRANSLATED message (not the raw server code), so the `error` callback can
  // surface it unchanged and we keep the i18n mapping we already had.
  async function handleConfirmUpload() {
    if (!pendingFile) return;

    // Captured here, not read inside the promise: by the time the request
    // settles this state may already be cleared, and `pendingFile` is what we
    // are actually uploading.
    const file = pendingFile;

    setUploading(true);
    setUploadError(null);

    const upload = async () => {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/profile/avatar", {
        method: "POST",
        body: formData,
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        const key = messageKeyFor(payload?.code);
        throw new Error(key ? tErrors(key) : t("uploadFailed"));
      }

      setAvatarUrl(payload?.avatarUrl ?? null);
      setPreviewUrl(null);
      setPendingFile(null);
      setUploadError(null);

      return t("uploadingDone");
    };

    try {
      await toast.promise(upload(), {
        loading: t("saving"),
        success: (message) => message,
        error: (err) =>
          err instanceof Error ? err.message : t("uploadFailed"),
      });
    } catch {
      // toast.promise re-throws the rejection so we can also keep the inline
      // error text that already renders under the avatar row.
      setUploadError(t("uploadFailed"));
    } finally {
      setUploading(false);
    }
  }

  function handleCancelPreview() {
    setPreviewUrl(null);
    setPendingFile(null);
    setStatusMessage("");
  }

  // Remove the stored avatar and return to the initials fallback.
  //
  // The browser does not touch profiles.avatar_url or Storage directly: it
  // calls the authenticated DELETE on our own route, which clears the column
  // server-side. On success we drop the local copy so the <Avatar> immediately
  // re-renders with initials, with no reload.
  async function handleRemovePhoto() {
    if (removing) return;

    setRemoving(true);
    setUploadError(null);
    setStatusMessage("");

    try {
      const response = await fetch("/api/profile/avatar", {
        method: "DELETE",
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        // Leave avatarUrl as it was: the photo is still there, so showing
        // initials would misrepresent the server state.
        const key = messageKeyFor(payload?.code);
        setUploadError(key ? tErrors(key) : t("removeFailed"));
        return;
      }

      setAvatarUrl(null);
      setPreviewUrl(null);
      setPendingFile(null);
      setUploadError(null);
    } catch {
      setUploadError(t("removeFailed"));
    } finally {
      setRemoving(false);
    }
  }

  function handleStartEditUsername() {
    setUsernameInput(username);
    setEditingUsername(true);
  }

  async function handleSaveUsername() {
    const newName = usernameInput.trim();

    // ---- UX-only checks. ---------------------------------------------------
    // These give the user a fast, inline error before any round-trip. They are
    // NOT a security control: this function can be skipped from the console.
    // The authoritative checks live in app/api/profile/username/route.ts (which
    // rejects invalid input before it reaches the DB) and in the NOT VALID
    // CHECK constraint from migration 0010. Deleting the block below would not
    // weaken enforcement at all.
    if (newName.length < USERNAME_MIN_LENGTH) {
      setStatusMessage(t("usernameMinLength"));
      return;
    }

    if (newName.length > USERNAME_MAX_LENGTH) {
      setStatusMessage(t("usernameMaxLength"));
      return;
    }

    if (!USERNAME_PATTERN.test(newName)) {
      setStatusMessage(t("usernameInvalidChars"));
      return;
    }

    if (newName === username) {
      setEditingUsername(false);
      setStatusMessage("");
      return;
    }

    setStatusMessage(t("saving"));

    // The browser no longer writes profiles.username directly. It calls our
    // own route, which authenticates from the session, validates server-side,
    // and only then writes. The route returns a machine-readable error CODE,
    // which we translate here so the message follows the user's language.
    try {
      const response = await fetch("/api/profile/username", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: newName }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        const key = messageKeyFor(payload?.code);
        setStatusMessage(key ? tErrors(key) : t("usernameSaveFailed"));
        return;
      }

      setUsername(payload?.username ?? newName);
      setEditingUsername(false);
      setStatusMessage("");
    } catch {
      setStatusMessage(t("usernameSaveFailed"));
    }
  }

  return (
    <SideNav user={username || userEmail}>
      <div className="mx-auto w-full min-w-0 max-w-6xl p-4 text-[#eef2f8] md:px-7 md:py-8">

        {/* Page header */}
        <div className="-mx-4 mb-6 border-b border-line px-4 pb-4 md:-mx-7 md:mb-8 md:px-7">
          <div className="mb-2 flex items-center gap-2">
            <div className="h-6 w-1 rounded-full bg-gradient-to-b from-blue-400 to-emerald-400" />
            <span className="text-[11px] font-medium uppercase tracking-[0.2em] text-dim">{t("eyebrow")}</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-ink">{t("title")}</h1>
          <p className="mt-1 text-sm text-muted">{t("subtitle")}</p>
        </div>

        {/* Account section */}
        <div className="rounded-[7px] border border-white/[.07] bg-[#0f131b] divide-y divide-white/[.05]">

          {/* Section label */}
          <div className="px-4 py-3 flex items-center gap-2">
            <User className="h-3.5 w-3.5 text-[#4d86ff]" />
            <span className="text-[11px] uppercase tracking-widest text-[#5d6877] font-semibold">{t("account")}</span>
          </div>

          {/* Avatar row */}
          <div className="px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {/*
                 * The local preview is rendered as a plain <img> ON PURPOSE.
                 *
                 * `previewUrl` is a blob: URL created by URL.createObjectURL()
                 * a few lines up. It is generated locally from the file the user
                 * just picked, never leaves the browser, is never persisted, and
                 * is never seen by anyone else — so it is always safe to render.
                 *
                 * It must NOT go through <Avatar>, because <Avatar> applies
                 * isTrustedAvatarUrl() and a blob: URL has an empty hostname
                 * (protocol is "blob:", not "https:"), so it would fail the
                 * allowlist and fall back to initials.
                 *
                 * The allowlist is deliberately still applied to `avatarUrl`
                 * below — that value comes from the database and is the real
                 * attack surface. Keep the two paths separate.
                 */}
                {previewUrl ? (
				<img
				  src={previewUrl}
				  alt=""
				  className="size-11 shrink-0 rounded-[30%] object-cover shadow-[inset_0_1px_0_rgba(255,255,255,.18)]"
				/>
				) : (
				  <Avatar
					name={username || userEmail}
					imageUrl={avatarUrl}
					size="lg"
				  />
				)}
			  </div>

              {previewUrl ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCancelPreview}
                    className="text-xs font-semibold px-3 py-2 rounded-[7px] border border-white/[.07] text-[#5d6877] hover:text-[#eef2f8] hover:border-white/[.14] transition-colors"
                  >
                    {t("cancel")}
                  </button>
                  <button
                    onClick={handleConfirmUpload}
                    disabled={uploading}
                    className="flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-[7px] bg-[#4d86ff] text-white hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {/* Indeterminate spinner: an SVG ring that spins. We use
                        fetch(), which gives no upload progress events, so a
                        filling bar here would be a lie — this just says "busy". */}
                    {uploading && (
                      <svg
                        className="h-3.5 w-3.5 animate-spin"
                        viewBox="0 0 24 24"
                        fill="none"
                        aria-hidden="true"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-90"
                          fill="currentColor"
                          d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4z"
                        />
                      </svg>
                    )}
                    {uploading ? t("saving") : t("confirm")}
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading || removing}
                    className="flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-[7px] border border-white/[.07] text-[#5d6877] hover:text-[#eef2f8] hover:border-white/[.14] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Camera className="h-3.5 w-3.5" />
                    {t("changePhoto")}
                  </button>
                  {/* Only offered when a custom photo is actually set — there is
                      nothing to remove when the user is already on initials. */}
                  {avatarUrl && (
                    <button
                      onClick={handleRemovePhoto}
                      disabled={uploading || removing}
                      className="flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-[7px] border border-white/[.07] text-[#f6485d] hover:bg-[#f6485d]/10 hover:border-[#f6485d]/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      {removing ? t("removingPhoto") : t("removePhoto")}
                    </button>
                  )}
                </div>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept={AVATAR_MIME_TYPES.join(",")}
              className="hidden"
              onChange={handleFileChange}
            />

            {uploadError && (
              <div className="mt-2 text-xs text-rose-400">
                {uploadError}
              </div>
            )}
          </div>

          {/* Email row */}
          <div className="px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-[#5d6877]" />
              <div>
                <div className="text-[10px] uppercase tracking-wide text-[#5d6877] mb-0.5">{t("email")}</div>
                <div className="text-sm font-semibold">{userEmail}</div>
              </div>
            </div>
          </div>

          {/* Username row */}
          <div className="px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <User className="h-4 w-4 text-[#5d6877]" />
              <div>
                <div className="text-[10px] uppercase tracking-wide text-[#5d6877] mb-0.5">{t("username")}</div>
                {editingUsername ? (
                  <input
                    value={usernameInput}
                    onChange={(e) => setUsernameInput(e.target.value)}
                    autoFocus
                    className="bg-transparent border-b border-[#4d86ff] text-sm font-semibold outline-none"
                  />
                ) : (
                  <div className="text-sm font-semibold">{username}</div>
                )}
              </div>
            </div>

            {editingUsername ? (
              <button onClick={handleSaveUsername} className="text-[10px] text-[#4d86ff]">{t("save")}</button>
            ) : (
              <button onClick={handleStartEditUsername} className="text-[10px] text-[#4d86ff]">{t("edit")}</button>
            )}
          </div>
        </div>
        {statusMessage && (
          <p className="mt-3 text-xs text-rose-400">{statusMessage}</p>
        )}

        {/* Language section */}
        <div className="mt-6 rounded-[7px] border border-white/[.07] bg-[#0f131b] divide-y divide-white/[.05]">
          <div className="px-4 py-3 flex items-center gap-2">
            <Languages className="h-3.5 w-3.5 text-[#4d86ff]" />
            <span className="text-[11px] uppercase tracking-widest text-[#5d6877] font-semibold">
              {t("language")}
            </span>
          </div>

          <div className="px-4 py-4 flex items-center justify-between">
            <div>
              <div className="text-[10px] uppercase tracking-wide text-[#5d6877] mb-0.5">
                {t("language")}
              </div>
              <div className="text-sm font-semibold">
                {t("chooseLanguage")}
              </div>
            </div>

            <select
              value={locale}
              onChange={(e) => {
                const newLocale = e.target.value;

                setLocale(newLocale);

                document.cookie = `locale=${newLocale}; path=/`;

                window.location.reload();
              }}
              className="bg-[#151a23] border border-white/[.07] rounded-[7px] px-3 py-2 text-sm text-[#eef2f8] outline-none cursor-pointer hover:border-white/[.14] transition-colors"
            >
              <option value="en">English</option>
              <option value="ms">Malay</option>
              <option value="zh-CN">Chinese (Simplified)</option>
            </select>
          </div>
        </div>

        {/* Security section */}
        
        <div className="mt-6 rounded-[7px] border border-white/[.07] bg-[#0f131b] divide-y divide-white/[.05]">
          <div className="px-4 py-3 flex items-center gap-2">
            <Shield className="h-3.5 w-3.5 text-[#4d86ff]" />
            <span className="text-[11px] uppercase tracking-widest text-[#5d6877] font-semibold">{t("security")}</span>
          </div>

          <Link
            href="/terms-services"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-4 flex items-center justify-between hover:bg-white/[.02] transition-colors"
          >
            <div className="flex items-center gap-3">
              <FileText className="h-4 w-4 text-[#5d6877]" />
              <span className="text-sm font-semibold">{t("termsOfServices")}</span>
            </div>
            <ChevronRight className="h-4 w-4 text-[#5d6877]" />
          </Link>

          <Link
            href="/privacy-policy"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-4 flex items-center justify-between hover:bg-white/[.02] transition-colors"
          >
            <div className="flex items-center gap-3">
              <Shield className="h-4 w-4 text-[#5d6877]" />
              <span className="text-sm font-semibold">{t("privacyPolicy")}</span>
            </div>
            <ChevronRight className="h-4 w-4 text-[#5d6877]" />
          </Link>

          {/* MFA Management Flow */}
          <MfaSettings />

          <div className="px-4 py-2">
            <LogoutButton />
          </div>
        </div>

      </div>
    </SideNav>
  );
}
