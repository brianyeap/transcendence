"use client";

// The heartbeat of a live Match.
//
// There is no price feed. Both players derive the same price from the same rule:
// how much match time has elapsed against the stored candle series. That rule
// lives in lib/api/pricing and is shared with the (future) server, so a trade
// priced here and a trade priced there agree.
//
// The clock is read through useSyncExternalStore rather than a useState/setInterval
// pair, because the wall clock IS an external mutable source. Calling Date.now()
// straight from a render is impure and React 19 rejects it.

import { useSyncExternalStore } from "react";
import { currentCandleIndex } from "@/lib/api/matches";
import type { Candle } from "@/lib/api/types";

/** How often the derived clock/price refresh. Fast enough to feel live. */
const TICK_MS = 250;

function subscribeToTick(onTick: () => void) {
  const id = setInterval(onTick, TICK_MS);
  return () => clearInterval(id);
}

// Quantised to the tick so the snapshot is STABLE between ticks. React re-reads
// getSnapshot on every render and would loop forever on a raw Date.now().
function nowSnapshot() {
  return Math.floor(Date.now() / TICK_MS) * TICK_MS;
}

// The server render has no meaningful clock; 0 keeps hydration deterministic.
function serverSnapshot() {
  return 0;
}

/** Wall-clock milliseconds, re-read on a fixed tick. */
export function useNow(): number {
  return useSyncExternalStore(subscribeToTick, nowSnapshot, serverSnapshot);
}

/** Whole seconds until an ISO timestamp, floored at 0. */
export function secondsUntil(iso: string | null, now: number): number {
  if (!iso || now === 0) return 0;
  return Math.max(0, Math.ceil((new Date(iso).getTime() - now) / 1000));
}

export type MatchClock = {
  /** Index of the candle that counts as "now", clamped to the dataset. */
  index: number;
  /** Close of the current candle — the price an order fills at. */
  price: number;
  /** Whole seconds until the Match ends, floored at 0. */
  remaining: number;
  /** True inside the final stretch, for the urgent treatment. */
  endingSoon: boolean;
};

export function useMatchClock(
  candles: Candle[],
  startsAt: string | null,
  endsAt: string | null
): MatchClock {
  const now = useNow();

  // Deliberately the shared helper rather than a local copy: the candle a trade
  // prices against must be chosen by exactly one rule across client and server.
  // `now` above is what re-renders us so this recomputes.
  const index = currentCandleIndex(candles, startsAt);
  const price = candles.length > 0 ? candles[index].close : 0;
  const remaining = secondsUntil(endsAt, now);

  return { index, price, remaining, endingSoon: remaining > 0 && remaining <= 15 };
}
