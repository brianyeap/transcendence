"use client";

import { useEffect, useReducer } from "react";

const TICK_MS = 250;

export function useRemainingSeconds(
	deadline: string | null,
	serverNow: () => number
): number | null {
	const [, forceRerender] = useReducer((count: number) => count + 1, 0);

	useEffect(() => {
		if (deadline === null) return;
	})
}