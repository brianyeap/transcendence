"use client"

import { LiveMatchScreen } from "@/app/components/match/live-match-screen";
import { ResultScreen } from "@/app/components/match/result-screen";
import { subscribeRoom } from "@/lib/api/mock"
import { RoomState } from "@/lib/api/types";
import { useState, useEffect } from "react";

export function RoomView({ roomId }: { roomId: string }) {
	const [room, setRoom] = useState<RoomState | null>(null);
	useEffect(() => subscribeRoom(roomId, setRoom), [roomId]);

	if (!room) return <p className="p-6 text-[#9aa6b6]">Loading room…</p>;

	switch (room.status) {
		case "waiting":
			return <WaitingView room={room} />;
		case "countdown":
			return <CountdownView room={room} />;
		case "active":
			return <LiveMatchScreen room={room} />;
		case "completed":
			return <ResultScreen room={room} />;
		default: {
			const _exhaustive: never = room.status;
			return _exhaustive;
		}
	}
}

// Tickets 06 and 07 replace these two. They are not blockers of ticket 14, so
// they stay as stubs for now — the live Match and its result are what ticket 14
// composes.
function WaitingView({ room }: { room: RoomState })   { return <p className="p-6">Waiting… {room.playerOne.username}</p>; }
function CountdownView({ room }: { room: RoomState }) { return <p className="p-6">Countdown… starts {room.startsAt}</p>; }