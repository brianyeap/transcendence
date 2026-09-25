"use client";

import { useEffect, useState } from "react";
import { Check, Clock, UserPlus } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/app/components/duel/button";

//  Where we stand with the opponent:
//    "none"     - nothing between us yet
//    "sent"     - I sent them a request, waiting for them
//    "incoming" - they sent me a request, I can accept it
//    "friends"  - accepted, we are friends
type FriendState = "none" | "sent" | "incoming" | "friends";

//  Ask the database where we stand with this opponent.
async function fetchFriendState(opponentUserId: string): Promise<FriendState> {
	const supabase = createSupabaseBrowserClient();

	//  friends_with_status only has rows we are part of, and "id" is always
	//  the OTHER person - so looking up the opponent's id finds our row.
	const { data } = await supabase
		.from("friends_with_status")
		.select("status, sent_by_me")
		.eq("id", opponentUserId)
		.maybeSingle(); // one row or null, not an array

	if (!data) return "none";
	if (data.status === "accepted") return "friends";
	if (data.sent_by_me) return "sent";
	return "incoming";
}

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
	const [state, setState] = useState<FriendState>("none");
	const [busy, setBusy] = useState(false);     //  true while a request is running

	//  Check once when the screen opens - they might already be a friend,
	//  or have sent us a request, from an earlier match.
	useEffect(() => {
		let cancelled = false;

		fetchFriendState(opponentUserId).then((result) => {
			if (!cancelled) setState(result);
		});

		return () => { cancelled = true; };
	}, [opponentUserId]);

	//  Send them a friend request.
	async function sendRequest() {
		setBusy(true);

		const supabase = createSupabaseBrowserClient();
		//  If they sent us one at the same moment, this fails because only one
		//  row per pair is allowed. That's fine - the check below will then
		//  show their request so we can accept it.
		await supabase
			.from("friends")
			.insert({ user_id: viewerUserId, friend_id: opponentUserId });

		setState(await fetchFriendState(opponentUserId));
		setBusy(false);
	}

	//  Accept the request they sent us.
	async function acceptRequest() {
		setBusy(true);

		const supabase = createSupabaseBrowserClient();
		await supabase.rpc("accept_friend_request", { requester: opponentUserId });

		setState(await fetchFriendState(opponentUserId));
		setBusy(false);
	}

	if (state === "friends") {
		return (
			<p className="mt-4 flex items-center justify-center gap-2 text-sm font-medium text-win">
				<Check className="size-4" aria-hidden />
				{t("friendAdded", { opponent: opponentName })}
			</p>
		);
	}

	if (state === "sent") {
		return (
			<p className="mt-4 flex items-center justify-center gap-2 text-sm font-medium text-dim">
				<Clock className="size-4" aria-hidden />
				Friend request sent to {opponentName}
			</p>
		);
	}

	if (state === "incoming") {
		return (
			<Button onClick={acceptRequest} disabled={busy} className="mt-4 w-full">
				<Check className="size-4" aria-hidden />
				{busy ? "Accepting..." : `Accept ${opponentName}'s friend request`}
			</Button>
		);
	}

	return (
		<Button variant="quiet" onClick={sendRequest} disabled={busy} className="mt-4 w-full">
			<UserPlus className="size-4" aria-hidden />
			{busy ? "Sending..." : `Add ${opponentName} as friend`}
		</Button>
	);
}
