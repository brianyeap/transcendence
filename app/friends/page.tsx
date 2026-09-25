"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { SideNav } from "../components/duel/side-nav";
import { Avatar } from "../components/duel/avatar";
import { Button } from "../components/duel/button";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Users } from "lucide-react";

//  A friend counts as online if their last ping was less than 10 seconds ago.
//  The ping runs every 5 seconds, so 10 leaves room for one missed ping.
const ONLINE_WINDOW_SECONDS = 10;

//  How often this page re-checks the list (so the dots go grey by themselves).
const REFRESH_EVERY_MS = 5000;

//  One row from friends_with_status. It can be a real friend OR a request
//  that hasn't been accepted yet - "status" tells us which.
type Friend = {
	id: string;       //  the OTHER person's id (never ours)
	username: string;
	avatar_url: string | null;   //  null if they never uploaded a picture
	//  How many seconds ago they last pinged. null = they have never pinged.
	//  The database works this out for us, so a wrong clock on this computer
	//  cannot make friends look offline.
	seconds_since_seen: number | null;
	status: "pending" | "accepted";
	sent_by_me: boolean;   //  true = I sent the request, false = they sent it
};

//  Turn a gap in seconds into short text like "12s ago" or "3m ago".
function agoText(
	seconds: number,
	t: (key: string, values?: Record<string, string | number>) => string,
): string {
	if (seconds < 60) return t("secondsAgo", { seconds });

	const minutes = Math.floor(seconds / 60);

	if (minutes < 60) return t("minutesAgo", { minutes });

	const hours = Math.floor(minutes / 60);

	if (hours < 24) return t("hoursAgo", { hours });

	return t("daysAgo", { days: Math.floor(hours / 24) });
}

export default function FriendsPage() {
	const t = useTranslations("Friends");
	const [friends, setFriends] = useState<Friend[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const supabase = createSupabaseBrowserClient();
		let cancelled = false;

		async function loadFriends() {
			//  friends_with_status only ever returns rows WE are part of (the
			//  database rules take care of that), so there is nothing to filter here.
			const { data } = await supabase
				.from("friends_with_status")
				.select("id, username, avatar_url, seconds_since_seen, status, sent_by_me")
				.order("seconds_since_seen", { ascending: true, nullsFirst: false });

			//  The page may have been closed while we were waiting.
			if (cancelled) return;

			setFriends(data ?? []);
			setLoading(false);
		}

		//  Load once straight away, then keep the list fresh. The repeat is
		//  skipped while the tab is in the background, because nobody is
		//  looking at it - the listener below reloads when they come back.
		loadFriends();

		const timer = setInterval(() => {
			if (document.visibilityState === "hidden") return;
			loadFriends();
		}, REFRESH_EVERY_MS);

		document.addEventListener("visibilitychange", loadFriends);

		return () => {          // cleanup
			cancelled = true;
			clearInterval(timer);
			document.removeEventListener("visibilitychange", loadFriends);
		};
	}, []);

	//  Accept a request someone sent us. The database flips it to 'accepted';
	//  we flip our copy too so the screen updates without waiting for a reload.
	async function accept(friend: Friend) {
		const supabase = createSupabaseBrowserClient();
		await supabase.rpc("accept_friend_request", { requester: friend.id });

		setFriends((list) =>
			list.map((f) => (f.id === friend.id ? { ...f, status: "accepted" } : f)),
		);
	}

	//  Remove a friend, decline their request, or cancel ours - all three just
	//  delete the row between us. Then drop them from the screen.
	async function remove(friend: Friend) {
		const supabase = createSupabaseBrowserClient();
		await supabase.rpc("remove_friend", { other: friend.id });

		setFriends((list) => list.filter((f) => f.id !== friend.id));
	}

	//  Split the one list into the three groups we show.
	const incoming = friends.filter((f) => f.status === "pending" && !f.sent_by_me);
	const sent = friends.filter((f) => f.status === "pending" && f.sent_by_me);
	const accepted = friends.filter((f) => f.status === "accepted");

	return (
		<SideNav>
			<div className="p-6 md:p-8 text-ink max-w-3xl mx-auto w-full">
				<div className="mb-6">
					<h1 className="text-2xl font-bold">{t("title")}</h1>
					<p className="text-sm text-dim mt-1">
						{t("description")}
					</p>
				</div>

				{loading ? (
					<p className="text-sm text-dim">{t("loading")}</p>
				) : (
					<div className="flex flex-col gap-8">
						{/* Requests other players sent us - only shown if there are any. */}
						{incoming.length > 0 && (
							<section>
								<h2 className="text-sm font-semibold text-dim mb-3">{t("friendRequests")}</h2>
								<div className="flex flex-col gap-2.5">
									{incoming.map((friend) => (
										<RequestRow key={friend.id} friend={friend}>
											<Button onClick={() => accept(friend)}>{t("accept")}</Button>
											<Button variant="quiet" onClick={() => remove(friend)}>
												{t("decline")}
											</Button>
										</RequestRow>
									))}
								</div>
							</section>
						)}

						{/* Our actual friends. */}
						<section>
							{accepted.length === 0 ? (
								<div className="rounded-lg border bg-panel p-12 text-center">
									<Users className="w-8 h-8 text-dim mx-auto mb-3" />
									<p className="text-sm text-dim">
										{t("noFriends")}
									</p>
								</div>
							) : (
								<div className="flex flex-col gap-2.5">
									{accepted.map((friend) => (
										<FriendRow
											key={friend.id}
											friend={friend}
											onRemove={() => remove(friend)}
										/>
									))}
								</div>
							)}
						</section>

						{/* Requests we sent that are still waiting - only shown if there are any. */}
						{sent.length > 0 && (
							<section>
								<h2 className="text-sm font-semibold text-dim mb-3">{t("sentRequests")}</h2>
								<div className="flex flex-col gap-2.5">
									{sent.map((friend) => (
										<RequestRow key={friend.id} friend={friend}>
											<Button variant="quiet" onClick={() => remove(friend)}>
												{t("cancel")}
											</Button>
										</RequestRow>
									))}
								</div>
							</section>
						)}
					</div>
				)}
			</div>
		</SideNav>
	);
}

//  One line in the list: avatar, name, the online dot and a Remove button.
function FriendRow({ friend, onRemove }: { friend: Friend; onRemove: () => void }) {
	const t = useTranslations("Friends");
	const seconds = friend.seconds_since_seen;
	const online = seconds !== null && seconds < ONLINE_WINDOW_SECONDS;

	//  Ask first, so one misclick doesn't lose a friend.
	function confirmRemove() {
		if (window.confirm(t("removeConfirmation", { username: friend.username }))) onRemove();
	}

	return (
		<div className="flex items-center gap-3 rounded-lg border border-line bg-panel p-4">
			<Avatar name={friend.username} imageUrl={friend.avatar_url} />

			<div className="min-w-0 flex-1">
				<div className="text-sm font-semibold truncate">{friend.username}</div>
				<div className="text-xs text-dim mt-0.5">
					{online
						? t("onlineNow")
						: seconds === null
							? t("neverSeenOnline")
							: t("lastOnline", { time: agoText(seconds, t) })}
				</div>
			</div>

			{/* Green dot when online, grey dot when not. animate-pulse is
			    Tailwind's built-in fade in and out. */}
			<span className="flex items-center gap-2 text-xs font-medium">
				<span
					className={`size-2 rounded-full ${online ? "animate-pulse bg-win" : "bg-faint"}`}
				/>
				<span className={online ? "text-win" : "text-dim"}>
					{online ? t("online") : t("offline")}
				</span>
			</span>

			<Button variant="danger" onClick={confirmRemove}>
				{t("remove")}
			</Button>
		</div>
	);
}

//  A request row: avatar and name, plus whatever buttons we pass in
//  (Accept/Decline for incoming requests, Cancel for ones we sent).
function RequestRow({ friend, children }: { friend: Friend; children: React.ReactNode }) {
	return (
		<div className="flex items-center gap-3 rounded-lg border border-line bg-panel p-4">
			<Avatar name={friend.username} imageUrl={friend.avatar_url} />

			<div className="min-w-0 flex-1 text-sm font-semibold truncate">
				{friend.username}
			</div>

			<div className="flex gap-2">{children}</div>
		</div>
	);
}