import { SideNav } from "../components/duel/side-nav";
import { LogoutButton } from "../components/auth/logout-button";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { User, Mail, Shield } from "lucide-react";

export default async function SettingsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <SideNav user={user.email ?? "Unknown"}>
      <div className="p-8 text-[#eef3f8] max-w-2x1">

        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-2x1 font-bold">Settings</h1>
          <p className="text-sm text-[#5d6877] mt-1">Manage your account details.</p>
        </div>

        {/* Account section */}
        <div className="rounded-[7px] border border-white/[.07] bg-[#0f131b] divide-y divide-white/[.05]">

          {/* Section label */}
          <div className="px-4 py-3 flex items-center gap-2">
            <User className="h-3.5 w-3.5 text-[#4d86ff]" />
            <span className="text-[11px] uppercase tracking-widest text-[#5d6877] font-semibold">Account</span>
          </div>

          {/* Email row */}
          <div className="px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-[#5d6877]" />
              <div>
                <div className="text-[10px] uppercase tracking-wide text-[#5d6877] mb-0.5">Email</div>
                <div className="text-sm font-semibold">{user.email}</div>
              </div>
            </div>
            <span className="text-[10px] text-[#5d6877] border border-white/[.07] rounded px-2 py-0.5">Read only</span>
          </div>

          {/* Username row */}
          <div className="px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <User className="h-4 w-4 text-[#5d6877]" />
              <div>
                <div className="text-[10px] uppercase tracking-wide text-[#5d6877] mb-0.5">Username</div>
                <div className="text-sm font-semibold">{user.email?.split("@")[0] ?? "Unknown"}</div>
              </div>
            </div>
            <span className="text-[10px] text-[#5d6877] border border-white/[.07] rounded px-2 py-0.5">Edit coming soon</span>
          </div>

          {/* Security Section */}
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
      </div>
    </SideNav>
  )
}
