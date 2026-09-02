"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { SideNav } from "../components/duel/side-nav";
import { LogoutButton } from "../components/auth/logout-button";
import { Avatar } from "../components/duel/avatar";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { resizeImage } from "@/lib/avatar-upload";
import { User, Mail, Shield, Camera } from "lucide-react";

export default function SettingsPage() {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Basic user info
  const [userEmail, setUserEmail] = useState("");
  const [username, setUsername] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  // Avatar upload state
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pendingBlob, setPendingBlob] = useState<Blob | null>(null);
  const [statusMessage, setStatusMessage] = useState("");

  // Username edit state
  const [editingUsername, setEditingUsername] = useState(false);
  const [usernameInput, setUsernameInput] = useState("");

  // Load the logged-in user's data when the page opens
  useEffect(() => {
    loadUserData();
  }, []);

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

  // Step 1: user picks a photo file
  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setStatusMessage("Please choose an image file.");
      return;
    }

    setStatusMessage("");

    const resized = await resizeImage(file, 256);
    const localUrl = URL.createObjectURL(resized);

    setPreviewUrl(localUrl);
    setPendingBlob(resized);
  }

  // Step 2: user clicks Confirm to actually save the photo
  async function handleConfirmUpload() {
    if (!pendingBlob) return;

    setStatusMessage("Uploading...");

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const filePath = user.id + ".jpg";

    // ─────────────────────────────────────────────
    // ZEP: uploads the photo to the "avatars" bucket.
    // Needs a public bucket named "avatars" with a
    // policy so users can only overwrite their own
    // file (path = user id + ".jpg").
    // ─────────────────────────────────────────────
    const uploadResult = await supabase.storage
      .from("avatars")
      .upload(filePath, pendingBlob, { upsert: true, contentType: "image/jpeg" });

    if (uploadResult.error) {
      setStatusMessage("Upload failed. Try again.");
      return;
    }

    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(filePath);

    // ─────────────────────────────────────────────
    // ZEP: saves the photo's URL into profiles.avatar_url
    // for the logged-in user's row.
    // ─────────────────────────────────────────────
    await supabase
      .from("profiles")
      .update({ avatar_url: urlData.publicUrl })
      .eq("id", user.id);

    setAvatarUrl(urlData.publicUrl);
    setPreviewUrl(null);
    setPendingBlob(null);
    setStatusMessage("");
  }

  function handleCancelPreview() {
    setPreviewUrl(null);
    setPendingBlob(null);
    setStatusMessage("");
  }

  function handleStartEditUsername() {
    setUsernameInput(username);
    setEditingUsername(true);
  }

  async function handleSaveUsername() {
    const newName = usernameInput.trim();

    if (newName.length < 3) {
      setStatusMessage("Username needs at least 3 characters.");
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
        setStatusMessage("That username is already taken.");
      } else {
        setStatusMessage("Could not save username.");
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

        <div className="mb-8">
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-sm text-[#5d6877] mt-1">Manage your account details.</p>
        </div>

        <div className="rounded-[7px] border border-white/[.07] bg-[#0f131b] divide-y divide-white/[.05]">

          <div className="px-4 py-3 flex items-center gap-2">
            <User className="h-3.5 w-3.5 text-[#4d86ff]" />
            <span className="text-[11px] uppercase tracking-widest text-[#5d6877] font-semibold">Account</span>
          </div>

          {/* Avatar */}
          <div className="px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar name={username || userEmail} imageUrl={previewUrl ?? avatarUrl} size="lg" />
                <div className="text-sm font-semibold">
                  {previewUrl ? "Preview — confirm to save" : "Profile Picture"}
                </div>
              </div>

              {previewUrl ? (
                <div className="flex gap-2">
                  <button onClick={handleCancelPreview} className="text-xs px-3 py-2 rounded-[7px] border border-white/[.07] text-[#5d6877]">
                    Cancel
                  </button>
                  <button onClick={handleConfirmUpload} className="text-xs px-3 py-2 rounded-[7px] bg-[#4d86ff] text-white">
                    Confirm
                  </button>
                </div>
              ) : (
                <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 text-xs px-3 py-2 rounded-[7px] border border-white/[.07] text-[#5d6877]">
                  <Camera className="h-3.5 w-3.5" />
                  Change Photo
                </button>
              )}
            </div>

            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
          </div>

          {/* Email */}
          <div className="px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-[#5d6877]" />
              <div className="text-sm font-semibold">{userEmail}</div>
            </div>
            <span className="text-[10px] text-[#5d6877] border border-white/[.07] rounded px-2 py-0.5">Read only</span>
          </div>

          {/* Username */}
          <div className="px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <User className="h-4 w-4 text-[#5d6877]" />
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

            {editingUsername ? (
              <button onClick={handleSaveUsername} className="text-[10px] text-[#4d86ff]">Save</button>
            ) : (
              <button onClick={handleStartEditUsername} className="text-[10px] text-[#4d86ff]">Edit</button>
            )}
          </div>

        </div>

        {statusMessage && (
          <p className="mt-3 text-xs text-rose-400">{statusMessage}</p>
        )}

        <div className="mt-6 rounded-[7px] border border-white/[.07] bg-[#0f131b] divide-y divide-white/[.05]">
          <div className="px-4 py-3 flex items-center gap-2">
            <Shield className="h-3.5 w-3.5 text-[#4d86ff]" />
            <span className="text-[11px] uppercase tracking-widest text-[#5d6877] font-semibold">Security</span>
          </div>
          <div className="px-4 py-2">
            <LogoutButton />
          </div>
        </div>

      </div>
    </SideNav>
  );
}