import { SideNav } from "./components/duel/side-nav";
import { LobbyScreen } from "./components/duel/lobby-screen";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .maybeSingle();

  const displayName =
    profile?.username ||
    (typeof user.user_metadata.username === "string" ? user.user_metadata.username : null) ||
    user.email?.split("@")[0] ||
    "Trader";
    
  return (
    <SideNav user={displayName}>
      <LobbyScreen />
    </SideNav>
  );
}