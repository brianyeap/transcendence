"use client";

import type React from "react";
import { ArrowLeft, Loader } from "lucide-react";
import { Match } from "@/lib/match/types";
import Link from "next/link";
import { fmtUSD } from "@/app/components/duel/format";
import { PlayerSlot } from "./player-slot";

export function WaitingRoom({
	match,
	viewerUserId
}: {
	match: Match;
	viewerUserId: string | null;
}): React.ReactElement {
	return (
		<div>
			<div>
				<span>
					<Loader />
					Open
				</span>
				<h1>
					Waiting for opponent
				</h1>
			</div>

			<div>
				<PlayerSlot player={match.playerOne} viewerUserId={viewerUserId} />
				vs
				<PlayerSlot player={match.playerTwo} viewerUserId={viewerUserId} />
			</div>

			<MatchSettings match={match} />

			<div>
				<Link href="/">
					<ArrowLeft className="size-4" />
					Return to Lobby
				</Link>
				<p>
					The match stays open while you are away. Return from the lobby at any time.
				</p>
			</div>
		</div>
	);
}

function MatchSettings({ match }: { match: Match }) {
	return (
		<div>
			<div>
				<p>
					Market
				</p>
				<p>
					{match.symbol}
				</p>
			</div>
			<div>
				<p>
					Starting capital
				</p>
				<p>
					{fmtUSD(Math.round(match.startingCapital))}
				</p>
				<p>Each player</p>
			</div>
		</div>
	);
}