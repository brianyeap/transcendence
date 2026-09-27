"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import toast from "react-hot-toast";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

//  Shows "Brian challenged you [Accept] [Ignore]" when a friend creates a
//  room for me. Lives in SideNav, so it works on every page with the menu.
export function useInviteToast() {
	const router = useRouter();
	const t = useTranslations("Invite");

	useEffect(() => {
		const supabase = createSupabaseBrowserClient();
		let channel: RealtimeChannel | null = null;
		let stopped = false;

		supabase.auth.getUser().then(({ data: { user } }) => {
			if (!user || stopped) return;

			//  Listen for new rooms where I am the invited friend.
			channel = supabase
				.channel("my-invites")
				.on(
					"postgres_changes",
					{ event: "INSERT", schema: "public", table: "matches", filter: `invited_user_id=eq.${user.id}` },
					async (payload) => {
						const roomId = payload.new.id;

						//  Who sent it?
						const { data: sender } = await supabase
							.from("profiles")
							.select("username")
							.eq("id", payload.new.player_one_user_id)
							.maybeSingle();

						//  Accept = join the room (the server checks it is really for me).
						async function accept(toastId: string) {
							toast.dismiss(toastId);
							const response = await fetch("/api/rooms/join", {
								method: "POST",
								headers: { "Content-Type": "application/json" },
								body: JSON.stringify({ roomId }),
							});
							const result = await response.json();

							if (!response.ok) {
								toast.error(result.error ?? t("couldNotJoin"));
								return;
							}
							router.push(`/matches/${roomId}`);
						}

						//  Stays on screen until I click a button.
						toast(
							(tt) => (
								<div className="flex flex-col gap-2">
									<span>{t("challengedYou", { username: sender?.username ?? t("aFriend") })}</span>
									<div className="flex gap-2">
										<button onClick={() => accept(tt.id)} className="rounded bg-[#4d86ff] px-3 py-1 text-sm font-semibold text-white">
											{t("accept")}
										</button>
										<button onClick={() => toast.dismiss(tt.id)} className="rounded bg-white/10 px-3 py-1 text-sm">
											{t("ignore")}
										</button>
									</div>
								</div>
							),
							{ duration: Infinity }
						);
					}
				)
				.subscribe();
		});

		//  Stop listening when the page goes away.
		return () => {
			stopped = true;
			if (channel) supabase.removeChannel(channel);
		};
	}, [router, t]);
}
