"use client"

import { LiveMatchScreen } from "@/app/components/match/live-match-screen";
import { PreMatchScreen } from "@/app/components/match/pre-match-screen";
import { ResultScreen } from "@/app/components/match/result-screen";
import { subscribeRoom } from "@/lib/api/matches";
import { RoomState } from "@/lib/api/types";
import { useState, useEffect } from "react";

// A Match is one thing with a changing status, so it is one route. The server
// drives the status; this just renders whichever face of the Match is current,
// which is why the transitions need no navigation.
export function RoomView({ roomId }: { roomId: string }) {
	const [room, setRoom] = useState<RoomState | null>(null);
	useEffect(() => subscribeRoom(roomId, setRoom), [roomId]);

	if (!room) return <p className="p-6 text-[#9aa6b6]">Loading room…</p>;

	switch (room.status) {
		case "waiting":
		case "countdown":
			return <PreMatchScreen room={room} />;
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
