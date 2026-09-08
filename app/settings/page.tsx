import { SideNav } from "../components/duel/side-nav";
import { LogoutButton } from "../components/auth/logout-button";
import { MfaSettings } from "../components/auth/mfa-settings";
import { requireAuthWithMfa } from "@/lib/auth/mfa";
import { User, Mail, Shield } from "lucide-react";

export default async function SettingsPage() {
  const { user } = await requireAuthWithMfa("/settings");

  return (
    <SideNav user={user.email ?? "Unknown"}>
      <div className="max-w-2xl p-8 text-[#eef3f8]">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="mt-1 text-sm text-[#5d6877]">Manage your account details and security.</p>
        </div>

        {/* Account section */}
        <div className="divide-y divide-white/[.05] rounded-[7px] border border-white/[.07] bg-[#0f131b]">
          {/* Section label */}
          <div className="flex items-center gap-2 px-4 py-3">
            <User className="h-3.5 w-3.5 text-[#4d86ff]" />
            <span className="text-[11px] font-semibold uppercase tracking-widest text-[#5d6877]">
              Account
            </span>
          </div>

          {/* Email row */}
          <div className="flex items-center justify-between px-4 py-4">
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-[#5d6877]" />
              <div>
                <div className="mb-0.5 text-[10px] uppercase tracking-wide text-[#5d6877]">
                  Email
                </div>
                <div className="text-sm font-semibold">{user.email}</div>
              </div>
            </div>
            <span className="rounded border border-white/[.07] px-2 py-0.5 text-[10px] text-[#5d6877]">
              Read only
            </span>
          </div>

          {/* Username row */}
          <div className="flex items-center justify-between px-4 py-4">
            <div className="flex items-center gap-3">
              <User className="h-4 w-4 text-[#5d6877]" />
              <div>
                <div className="mb-0.5 text-[10px] uppercase tracking-wide text-[#5d6877]">
                  Username
                </div>
                <div className="text-sm font-semibold">
                  {user.email?.split("@")[0] ?? "Unknown"}
                </div>
              </div>
            </div>
            <span className="rounded border border-white/[.07] px-2 py-0.5 text-[10px] text-[#5d6877]">
              Edit coming soon
            </span>
          </div>
        </div>

        {/* Security Section */}
        <div className="mt-6 divide-y divide-white/[.05] rounded-[7px] border border-white/[.07] bg-[#0f131b]">
          <div className="flex items-center gap-2 px-4 py-3">
            <Shield className="h-3.5 w-3.5 text-[#4d86ff]" />
            <span className="text-[11px] font-semibold uppercase tracking-widest text-[#5d6877]">
              Security
            </span>
          </div>

          {/* MFA Management Flow */}
          <MfaSettings />

          {/* Logout button */}
          <div className="px-4 py-2">
            <LogoutButton />
          </div>
        </div>
      </div>
    </SideNav>
  );
}
