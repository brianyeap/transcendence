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
    const id = window.setInterval(forceRerender, TICK_MS);
    return () => window.clearInterval(id);
  }, [deadline]);

  if (deadline === null) return null;
  const deadlineMs = new Date(deadline).getTime();
  if (Number.isNaN(deadlineMs)) return null;
  return Math.max(0, Math.ceil((deadlineMs - serverNow()) / 1000));
}
