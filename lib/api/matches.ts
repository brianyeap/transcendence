// THE SEAM. This is the only file your components import to talk to "the backend".
//
// Today every function delegates to the in-memory mock. When the real endpoints
// exist, flip NEXT_PUBLIC_USE_MOCKS=false and the `fetch(...)` branches take over.
// The return shapes are identical either way, so no component has to change.
//
// Keep this file free of game logic — it is pure plumbing.

"use client";

import type {
  Candle,
  CreateRoomInput,
  MatchResult,
  PlayerState,
  RoomState,
  Scores,
  Side,
} from "./types";
import * as mock from "./mock";

/** Mocks are ON by default. Set NEXT_PUBLIC_USE_MOCKS=false to go live. */
export const USE_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS !== "false";

async function asJson<T>(res: Response): Promise<T> {
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body.error ?? `Request failed (${res.status}).`);
  }
  return body as T;
}

export async function createRoom(input: CreateRoomInput): Promise<RoomState> {
  if (USE_MOCKS) return mock.createRoom(input);
  return asJson(
    await fetch("/api/rooms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    })
  );
}

export async function getRoom(id: string): Promise<RoomState> {
  if (USE_MOCKS) return mock.getRoom(id);
  return asJson(await fetch(`/api/rooms/${id}`, { cache: "no-store" }));
}

export async function joinRoom(id: string): Promise<RoomState> {
  if (USE_MOCKS) return mock.joinRoom(id);
  return asJson(await fetch(`/api/rooms/${id}/join`, { method: "POST" }));
}

/**
 * Subscribe to a room's state changes. Returns an unsubscribe function.
 * The callback fires immediately with the current state, then again on each
 * change (opponent joins, countdown starts, match starts/ends).
 */
export function subscribeRoom(
  id: string,
  onChange: (room: RoomState) => void
): () => void {
  if (USE_MOCKS) return mock.subscribeRoom(id, onChange);
  // REAL: subscribe to the row via Supabase Realtime, then re-fetch the full
  // shape (Realtime gives you the raw row; getRoom returns the joined shape).
  //
  //   const supabase = createSupabaseBrowserClient();
  //   const channel = supabase
  //     .channel(`room-${id}`)
  //     .on("postgres_changes",
  //       { event: "UPDATE", schema: "public", table: "matches", filter: `id=eq.${id}` },
  //       () => getRoom(id).then(onChange))
  //     .subscribe();
  //   getRoom(id).then(onChange);
  //   return () => { supabase.removeChannel(channel); };
  throw new Error("Realtime not wired yet — keep NEXT_PUBLIC_USE_MOCKS on.");
}

/** Shape returned by match-UI's real market route (`GET /api/market/candles`). */
type MarketCandle = {
  time: number; // unix seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
};

/**
 * Candles are "real-first": they come from match-UI's REAL market route when it
 * is present, and fall back to the mock series when it isn't (404 / offline).
 * Whatever we get is pushed into the mock so trades, scores and the result all
 * price off the SAME series the chart shows. This is the one seam wired to real
 * data today; everything else still honors USE_MOCKS.
 */
export async function getCandles(id: string): Promise<Candle[]> {
  try {
    const res = await fetch("/api/market/candles", { cache: "no-store" });
    if (res.ok) {
      const body = (await res.json()) as { candles?: MarketCandle[] };
      if (Array.isArray(body.candles) && body.candles.length > 0) {
        const candles: Candle[] = body.candles.map((c, i) => ({
          sequence: i,
          openTime: c.time, // match-UI uses `time` (unix seconds); we call it openTime
          open: Number(c.open),
          high: Number(c.high),
          low: Number(c.low),
          close: Number(c.close),
        }));
        mock.setCandles(id, candles); // keep trade/score/result in sync with the chart
        return candles;
      }
    }
  } catch {
    // route not merged yet, or web/socket offline — fall back to the mock series
  }
  return mock.getCandles(id);
}

export async function submitTrade(
  id: string,
  side: Side,
  amount: number
): Promise<PlayerState> {
  if (USE_MOCKS) return mock.submitTrade(id, side, amount);
  return asJson(
    await fetch(`/api/matches/${id}/trade`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ side, amount }),
    })
  );
}

export async function getMyPlayerState(id: string): Promise<PlayerState> {
  if (USE_MOCKS) return mock.getMyPlayerState(id);
  return asJson(await fetch(`/api/matches/${id}/me`, { cache: "no-store" }));
}

export async function getScores(id: string): Promise<Scores> {
  if (USE_MOCKS) return mock.getScores(id);
  return asJson(await fetch(`/api/matches/${id}/scores`, { cache: "no-store" }));
}

export async function getResult(id: string): Promise<MatchResult> {
  if (USE_MOCKS) return mock.getResult(id);
  return asJson(await fetch(`/api/matches/${id}/result`, { cache: "no-store" }));
}

// Pure helpers the UI needs (which candle is "now", current price, seconds left).
export { priceAtElapsed, currentCandleIndex, elapsedSeconds } from "./pricing";
// While mocking, use this to tell "me" from "opponent". In the real app you'd
// compare against the Supabase auth user id instead.
export { MOCK_ME } from "./mock";
