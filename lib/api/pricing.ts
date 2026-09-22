// Pure, shared price helpers. These encode the ONE rule that keeps both players
// in sync without a streaming server: "the current price is derived from how much
// match time has elapsed against the stored candle dataset."
//
// The mock uses these; the real backend uses the same rule server-side when it
// prices a trade; and the UI uses them to know which candle to show as "now".

import type { Candle } from "./types";

/** Whole seconds elapsed since the match started (0 before it starts). */
export function elapsedSeconds(startsAtIso: string | null): number {
  if (!startsAtIso) return 0;
  return Math.floor((Date.now() - new Date(startsAtIso).getTime()) / 1000);
}

/** Index of the candle that is "current" right now, clamped to the dataset. */
export function currentCandleIndex(
  candles: Candle[],
  startsAtIso: string | null
): number {
  if (candles.length === 0) return 0;
  const elapsed = elapsedSeconds(startsAtIso);
  return Math.min(Math.max(elapsed, 0), candles.length - 1);
}

/** The current price = close of the current candle. */
export function priceAtElapsed(
  candles: Candle[],
  startsAtIso: string | null
): number {
  if (candles.length === 0) return 0;
  return candles[currentCandleIndex(candles, startsAtIso)].close;
}
