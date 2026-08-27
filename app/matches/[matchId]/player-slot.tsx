"use client";

import type React from "react";
import { Avatar } from "@/app/components/duel/avatar";
import type { PlayerRef } from "@/lib/match/types";

export function PlayerSlot({
	player,
	viewerUserId,
	emptyLabel = "Waiting for a player"
}: {
	player: PlayerRef | null;
	viewerUserId: string | null;
	emptyLabel?: string;
}): React.ReactElement {
	if (player === null) {
		return (
			<div>
				<span>
					?
				</span>
				<div>
					<p>{emptyLabel}</p>
					<p>Open seat</p>
					<p>This seat is open.</p>
				</div>
			</div>
		);
	}

	const isViewer = player.userId === viewerUserId;

	return (
		<div>
			<Avatar name={player.username} size="md" />
			<div>
				<p>
					<span>{player.username}</span>

					{isViewer ? (<span>You</span>) : null}
				</p>
				<p>Ready</p>
				<p>{isViewer ? "You are ready." : "This player is ready."}</p>
			</div>
		</div>
	);
}