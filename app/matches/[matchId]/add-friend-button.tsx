"use client";

import { useEffect, useState } from "react";
import { Check, UserPlus } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/app/components/duel/button";

//  Shown on the result screen after a match.
export function AddFriendButton({
	viewerUserId,
	opponentUserId,
	opponentName,
}: {
	viewerUserId: string;
	opponentUserId: string;
	opponentName: string;
}) {
	const [added, setAdded] = useState(false);   //  true once they are on our list
	const [busy, setBusy] = useState(false);     //  true while the insert is running

	//  They might already be a friend from an earlier match, so check first
	//  and show "Friend added" straight away instead of the button.
	useEffect(() => {
		const supabase = createSupabaseBrowserClient();
		let cancelled = false;

		async function checkAlreadyFriends() {
			const { data } = await supabase
				.from("friends")
				.select("friend_id")
				.eq("user_id", viewerUserId) // me
				.eq("friend_id", opponentUserId) // them
				.maybeSingle(); // true or false not an array 

			if (!cancelled && data) setAdded(true);
		}

		checkAlreadyFriends();
		return () => { cancelled = true; };
	}, [viewerUserId, opponentUserId]);

	async function addFriend() {
		setBusy(true);

		const supabase = createSupabaseBrowserClient();
		const { error } = await supabase
			.from("friends")
			.insert({ user_id: viewerUserId, friend_id: opponentUserId });

		//  Code 23505 means the row already exists so it's fine
		if (!error || error.code === "23505") setAdded(true);

		setBusy(false);
	}

	if (added) {
		return (
			<p className="mt-4 flex items-center justify-center gap-2 text-sm font-medium text-win">
				<Check className="size-4" aria-hidden />
				{opponentName} is on your friends list
			</p>
		);
	}

	return (
		<Button variant="quiet" onClick={addFriend} disabled={busy} className="mt-4 w-full">
			<UserPlus className="size-4" aria-hidden />
			{busy ? "Adding..." : `Add ${opponentName} as friend`}
		</Button>
	);
}
