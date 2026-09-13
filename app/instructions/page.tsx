import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { HowToPlayScreen } from "./how-to-play";
import { SideNav } from "../components/duel/side-nav";

export default async function HowToPlayPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
	<SideNav>
		<div className="flex min-h-screen flex-col bg-[#090b10] text-[#eef2f8]">
			<HowToPlayScreen />
		</div>
	</SideNav>
  );
}