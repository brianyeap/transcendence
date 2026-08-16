"use client";

import type React from "react";
import { fmtClock } from "@/app/components/duel/format";
import { PlayerSlot } from "./player-slot";
import { useRemainingSeconds } from "./useRemainingSeconds";
import type { Match } from "@/lib/match/types";

const BARE_SECONDS_UNDER = 60;

export function CountdownScreen({match, viewerUserId, serverNow}: {
	match: Match;
	viewerUserId: string | null;
	serverNow: () => number;
}): React.ReactElement {
	const remaining = useRemainingSeconds(match.startsAt, serverNow);
	const starting = remaining === null || remaining === 0;

	return (
		<div>
			<div>
				<span>Both players in</span>
				<h1>{match.symbol} opens in</h1>
				<p>{starting ? "-" : remaining < BARE_SECONDS_UNDER ? remaining : fmtClock(remaining)}</p>
			</div>
		</div>
	)
}