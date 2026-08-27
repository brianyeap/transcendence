"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { SideNav } from "../components/duel/side-nav";
import { LogoutButton } from "../components/auth/logout-button";
import { Avatar } from "../components/duel/avatar";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { resizeImage } from "@/lib/avatar-upload";
import { User, Mail, Shield, Camera, Languages } from "lucide-react";
import { useTranslations } from "next-intl";

export default function SettingsPage() {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const t = useTranslations("Settings");

  const [locale, setLocale] = useState("en");

  const [userEmail, setUserEmail] = useState<string>(" ");
  const [username, setUsername] = useState<string>(" ");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pendingBlob, setPendingBlob] = useState<Blob | null>(null);
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
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setUploadError("Please select an image file.");
      return;
    }

    setUploadError(null);

    try {
      const resizedBlob = await resizeImage(file, 256);
      const localPreviewUrl = URL.createObjectURL(resizedBlob);
      setPreviewUrl(localPreviewUrl);
      setPendingBlob(resizedBlob);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to process image";
      setUploadError(message);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleConfirmUpload = async () => {
    if (!pendingBlob) return;

    setUploading(true);
    setUploadError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const filePath = `${user.id}.jpg`;

      const { error: storageError } = await supabase.storage
        .from("avatars")
        .upload(filePath, pendingBlob, {
          upsert: true,
          contentType: "image/jpeg",
        });

      if (storageError) throw storageError;

      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: urlData.publicUrl })
        .eq("id", user.id);

      if (updateError) throw updateError;

      setAvatarUrl(urlData.publicUrl);
      setPreviewUrl(null);
      setPendingBlob(null);

    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Upload failed";
      setUploadError(message);
    } finally {
      setUploading(false);
    }
  };

  const handleCancelPreview = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setPendingBlob(null);
    setUploadError(null);
  };

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
                <div className="text-sm font-semibold">{username}</div>
              </div>
            </div>
            <span className="text-[10px] text-[#5d6877] border border-white/[.07] rounded px-2 py-0.5">{t("editComingSoon")}</span>
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
        <div className="mt-6 rounded-[7px] border border-white/[.07] bg-[#0f131b] divide-y divide-white/[.05]">
          <div className="px-4 py-3 flex items-center gap-2">
            <Shield className="h-3.5 w-3.5 text-[#4d86ff]" />
            <span className="text-[11px] uppercase tracking-widest text-[#5d6877] font-semibold">{t("security")}</span>
          </div>
          <div className="px-4 py-2">
            <LogoutButton />
          </div>
        </div>

      </div>
    </SideNav>
  );
}