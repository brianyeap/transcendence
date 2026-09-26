"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { SideNav } from "../components/duel/side-nav";
import { LogoutButton } from "../components/auth/logout-button";
import { Avatar } from "../components/duel/avatar";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { resizeImage } from "@/lib/avatar-upload";
import { User, Mail, Shield, Camera, Languages, FileText, Scale, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { MfaSettings } from "../components/auth/mfa-settings";
import Link from "next/link";

export default function SettingsPage() {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const t = useTranslations("Settings");

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
  async function handleConfirmUpload() {
    if (!pendingFile) return;

    setUploading(true);
    setUploadError(null);
    setStatusMessage(t("uploading"));

    try {
      const formData = new FormData();
      formData.append("file", pendingFile);

      const response = await fetch("/api/profile/avatar", {
        method: "POST",
        body: formData,
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        setUploadError(payload?.error || t("uploadFailed"));
        setStatusMessage("");
        return;
      }

      setAvatarUrl(payload?.avatarUrl ?? null);
      setPreviewUrl(null);
      setPendingFile(null);
      setUploadError(null);
      setStatusMessage("");
    } catch {
      setUploadError(t("uploadFailed"));
      setStatusMessage("");
    } finally {
      setUploading(false);
    }
  }

  function handleCancelPreview() {
    setPreviewUrl(null);
    setPendingFile(null);
    setStatusMessage("");
  }

  function handleStartEditUsername() {
    setUsernameInput(username);
    setEditingUsername(true);
  }

  async function handleSaveUsername() {
    const newName = usernameInput.trim();

    if (newName.length < 3) {
      setStatusMessage(t("usernameMinLength"));
      return;
    }

    if (newName === username) {
      setEditingUsername(false);
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // ─────────────────────────────────────────────
    // ZEP: updates profiles.username for this user.
    // Username is UNIQUE in the schema, so this can
    // fail with error code 23505 if already taken.
    // ─────────────────────────────────────────────
    const result = await supabase
      .from("profiles")
      .update({ username: newName })
      .eq("id", user.id);

    if (result.error) {
      if (result.error.code === "23505") {
        setStatusMessage(t("usernameTaken"));
      } else {
        setStatusMessage(t("usernameSaveFailed"));
      }
      return;
    }

    setUsername(newName);
    setEditingUsername(false);
    setStatusMessage("");
  }

  return (
    <SideNav user={username || userEmail}>
      <div className="p-8 text-[#eef2f8] max-w-2xl">

        {/* Page header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          <p className="text-sm text-[#5d6877] mt-1">{t("subtitle")}</p>
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
                <Avatar
                  name={username || userEmail}
                  imageUrl={previewUrl ?? avatarUrl}
                  size="lg"
                />
                <div>
                  <div className="text-[10px] uppercase tracking-wide text-[#5d6877] mb-0.5">
                    {t("profilePhoto")}
                  </div>
                  <div className="text-sm font-semibold">
                    {previewUrl
                      ? t("previewConfirm")
                      : avatarUrl
                        ? t("customPhoto")
                        : t("usingInitials")}
                  </div>
                </div>
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
                    className="text-xs font-semibold px-3 py-2 rounded-[7px] bg-[#4d86ff] text-white hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {uploading ? t("saving") : t("confirm")}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-[7px] border border-white/[.07] text-[#5d6877] hover:text-[#eef2f8] hover:border-white/[.14] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Camera className="h-3.5 w-3.5" />
                  {t("changePhoto")}
                </button>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
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
            <span className="text-[10px] text-[#5d6877] border border-white/[.07] rounded px-2 py-0.5">{t("readOnly")}</span>
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
        {statusMessage && (
          <p className="mt-3 text-xs text-rose-400">{statusMessage}</p>
        )}

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