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
			<HowToPlayScreen />
	</SideNav>
  );
}