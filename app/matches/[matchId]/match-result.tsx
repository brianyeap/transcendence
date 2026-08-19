"use client";

import type React from "react";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { MatchResultCard, type MatchResultData } from "./match-result-card";
import type { Match, PlayerState } from "@/lib/match/types";

export function MatchResult({
	match,
	ended,
	player,
	price,
	viewerUserId
}: {
	match: Match;
	ended: MatchResultData | null;
	player: PlayerState | null;
	price: number | null;
	viewerUserId: string | null;
}): React.ReactElement {
	const result = ended ?? deriveResult(match, player, price, viewerUserId);

	if (result === null || viewerUserId === null) {
		return <ResultUnavailable match={match} />;
	}

	return (
		<div>
			<p>Final Result</p>
			<MatchResultCard
				result={result}
				match={match}
				viewerUserId={viewerUserId}
				headingLevel={1}
			/>
		</div>
	);
}

function deriveResult(
	match: Match,
	player: PlayerState | null,
	price: number | null,
	viewerUserId: string | null
): MatchResultData | null {
	if (player === null || viewerUserId === null)
		return null;

	return {
		finalPrice: price,
		winnerUserId: deriveWinner(match, player, viewerUserId),
		yourFinalCapital: player.capital,
		opponentFinalCapital: player.opponentCapital
	};
}

const UNKNOWN_OPPONENT_ID = "unknown-opponent";

function deriveWinner(match: Match, player: PlayerState, viewerUserId:string): string | null {
	const gap = Math.round(player.capital) - Math.round(player.opponentCapital);
	if (gap === 0)
		return null;
	if (gap > 0)
		return viewerUserId;

	const opponent = match.playerOne.userId === viewerUserId ? match.playerTwo : match.playerOne;
	return opponent?.userId ?? UNKNOWN_OPPONENT_ID;
}

function ResultUnavailable({ match }: { match: Match }) {
	return (
		<div>
			<h1>Match is over!</h1>
			<p>The final figures are not available on this screen. You can find the match summary in the full record.</p>
			<div>
				<Link href={`/history/${match.id}`}>
					View match summary
				</Link>
				<Link href="/">
					<ArrowLeft />
					Back to games
				</Link>
			</div>
		</div>
	)
}