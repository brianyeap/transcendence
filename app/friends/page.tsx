"use client";

import { useEffect, useState } from "react";
import { SideNav } from "../components/duel/side-nav";
import { Avatar } from "../components/duel/avatar";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Users } from "lucide-react";

//  A friend counts as online if their last ping was less than 10 seconds ago.
//  The ping runs every 5 seconds, so 10 leaves room for one missed ping.
const ONLINE_WINDOW_SECONDS = 10;

//  How often this page re-checks the list (so the dots go grey by themselves).
const REFRESH_EVERY_MS = 5000;

type Friend = {
	id: string;
	username: string;
	//  How many seconds ago they last pinged. null = they have never pinged.
	//  The database works this out for us, so a wrong clock on this computer
	//  cannot make friends look offline.
	seconds_since_seen: number | null;
};

//  Turn a gap in seconds into short text like "12s ago" or "3m ago".
function agoText(seconds: number): string {
	if (seconds < 60) return `${seconds}s ago`;

	const minutes = Math.floor(seconds / 60);

	if (minutes < 60) return `${minutes}m ago`;

	const hours = Math.floor(minutes / 60);

	if (hours < 24) return `${hours}h ago`;

	return `${Math.floor(hours / 24)}d ago`;
}

export default function FriendsPage() {
	const [friends, setFriends] = useState<Friend[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const supabase = createSupabaseBrowserClient();
		let cancelled = false;

		async function loadFriends() {
			//  friends_with_status only ever returns OUR friends (the database
			//  rules take care of that), so there is nothing to filter here.
			const { data } = await supabase
				.from("friends_with_status")
				.select("id, username, seconds_since_seen")
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

	return (
		<SideNav>
			<div className="p-6 md:p-8 text-ink max-w-3xl mx-auto w-full">
				<div className="mb-6">
					<h1 className="text-2xl font-bold">Friends</h1>
					<p className="text-sm text-dim mt-1">
						Everyone you added after a match. Status updates every 5 seconds.
					</p>
				</div>

				{loading ? (
					<p className="text-sm text-dim">Loading friends...</p>
				) : friends.length === 0 ? (
					<div className="rounded-lg border bg-panel p-12 text-center">
						<Users className="w-8 h-8 text-dim mx-auto mb-3" />
						<p className="text-sm text-dim">
							No friends yet. Finish a match and add your opponent.
						</p>
					</div>
				) : (
					<div className="flex flex-col gap-2.5">
						{friends.map((friend) => (
							<FriendRow key={friend.id} friend={friend} />
						))}
					</div>
				)}
			</div>
		</SideNav>
	);
}

//  One line in the list: avatar, name, and the online dot.
function FriendRow({ friend }: { friend: Friend }) {
	const seconds = friend.seconds_since_seen;
	const online = seconds !== null && seconds < ONLINE_WINDOW_SECONDS;

	return (
		<div className="flex items-center gap-3 rounded-lg border border-line bg-panel p-4">
			<Avatar name={friend.username} />

			<div className="min-w-0 flex-1">
				<div className="text-sm font-semibold truncate">{friend.username}</div>
				<div className="text-xs text-dim mt-0.5">
					{online
						? "Online now"
						: seconds === null
							? "Never seen online"
							: `Last online ${agoText(seconds)}`}
				</div>
			</div>

			{/* Green dot when online, grey dot when not. animate-pulse is
			    Tailwind's built-in fade in and out. */}
			<span className="flex items-center gap-2 text-xs font-medium">
				<span
					className={`size-2 rounded-full ${online ? "animate-pulse bg-win" : "bg-faint"}`}
				/>
				<span className={online ? "text-win" : "text-dim"}>
					{online ? "Online" : "Offline"}
				</span>
			</span>
		</div>
	);
}
