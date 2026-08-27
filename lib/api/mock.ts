// In-memory mock backend for the trading match flow.
//
// This exists ONLY so the frontend can be built and tested with no real backend.
// It fakes the whole room/match lifecycle with timers:
//
//   waiting --(opponent "joins" after a few s)--> countdown --(startsAt)-->
//   active --(endsAt)--> completed
//
// Everything here is throwaway. The game math (PnL, settlement, winner) is
// deliberately simplistic and is NOT the real rules — the real server owns that
// (see docs/prd/trading-game/prd.md section 6). State is kept in a module-level
// Map, so it survives client-side navigation but is wiped on a hard refresh.

import type {
  Candle,
  CreateRoomInput,
  MatchResult,
  Player,
  PlayerResult,
  PlayerState,
  RoomState,
  Scores,
  Side,
} from "./types";
import { elapsedSeconds, priceAtElapsed } from "./pricing";

/** The "current user" while mocking. In the real app this is the Supabase user. */
export const MOCK_ME: Player = { userId: "mock-me", username: "you" };
const MOCK_OPP: Player = { userId: "mock-opp", username: "bot_opponent" };

const COUNTDOWN_MS = 10_000; // 10s countdown, matches the PRD
const OPP_JOIN_MS = 4_000; // pretend an opponent joins 4s after you open a waiting room
const DEFAULT_SYMBOL = "BTC/USDT";
const DEFAULT_CAPITAL = 10_000;
const DEFAULT_DURATION = 120;

type MockMatch = {
  room: RoomState;
  candles: Candle[];
  me: PlayerState;
  listeners: Set<(room: RoomState) => void>;
  timers: ReturnType<typeof setTimeout>[];
  driverStarted: boolean;
};

const store = new Map<string, MockMatch>();

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function freshPlayerState(startingCapital: number): PlayerState {
  return {
    userId: MOCK_ME.userId,
    availableBalance: startingCapital,
    reservedBalance: 0,
    netSide: "flat",
    netAmount: 0,
    averageEntryPrice: null,
    realizedPnl: 0,
  };
}

/** A synthetic random-walk candle series, one candle per second of the match. */
function generateCandles(count: number, startsAtMs: number): Candle[] {
  const candles: Candle[] = [];
  let price = 60000 + Math.random() * 5000;
  const startSec = Math.floor(startsAtMs / 1000);
  for (let i = 0; i < count; i++) {
    const open = price;
    const close = open * (1 + (Math.random() - 0.5) * 0.004);
    const high = Math.max(open, close) * (1 + Math.random() * 0.0015);
    const low = Math.min(open, close) * (1 - Math.random() * 0.0015);
    candles.push({
      sequence: i,
      openTime: startSec + i,
      open: round2(open),
      high: round2(high),
      low: round2(low),
      close: round2(close),
    });
    price = close;
  }
  return candles;
}

function emit(m: MockMatch): void {
  for (const cb of m.listeners) cb(m.room);
}

function ensureCandles(m: MockMatch): void {
  if (m.candles.length === 0 && m.room.startsAt) {
    m.candles = generateCandles(
      m.room.durationSeconds,
      new Date(m.room.startsAt).getTime()
    );
  }
}

/**
 * Drives the state machine with timers so the room page reacts to "the opponent
 * joined" and "the match started" with no backend. Idempotent per match.
 */
function ensureDriver(m: MockMatch): void {
  if (m.driverStarted) return;
  m.driverStarted = true;

  const at = (fn: () => void, whenMs: number) => {
    m.timers.push(setTimeout(fn, Math.max(0, whenMs - Date.now())));
  };

  const toCompleted = () => {
    if (m.room.status === "completed") return;
    ensureCandles(m);
    m.room = { ...m.room, status: "completed" };
    emit(m);
  };

  const toActive = () => {
    if (m.room.status !== "countdown") return;
    ensureCandles(m);
    m.room = { ...m.room, status: "active" };
    emit(m);
    if (m.room.endsAt) at(toCompleted, new Date(m.room.endsAt).getTime());
  };

  const toCountdown = () => {
    if (m.room.status !== "waiting") return;
    const startsAt = new Date(Date.now() + COUNTDOWN_MS);
    const endsAt = new Date(startsAt.getTime() + m.room.durationSeconds * 1000);
    m.room = {
      ...m.room,
      status: "countdown",
      playerTwo: MOCK_OPP,
      startsAt: startsAt.toISOString(),
      endsAt: endsAt.toISOString(),
    };
    emit(m);
    at(toActive, startsAt.getTime());
    at(toCompleted, endsAt.getTime());
  };

  // Schedule whatever transitions still lie ahead of where we are now.
  switch (m.room.status) {
    case "waiting":
      at(toCountdown, Date.now() + OPP_JOIN_MS);
      break;
    case "countdown":
      if (m.room.startsAt) at(toActive, new Date(m.room.startsAt).getTime());
      if (m.room.endsAt) at(toCompleted, new Date(m.room.endsAt).getTime());
      break;
    case "active":
      ensureCandles(m);
      if (m.room.endsAt) at(toCompleted, new Date(m.room.endsAt).getTime());
      break;
  }
}

function makeMatch(room: RoomState): MockMatch {
  const m: MockMatch = {
    room,
    candles: [],
    me: freshPlayerState(room.startingCapital),
    listeners: new Set(),
    timers: [],
    driverStarted: false,
  };
  store.set(room.id, m);
  return m;
}

function requireMatch(id: string): MockMatch {
  const existing = store.get(id);
  if (existing) return existing;
  // Deep-linked / refreshed onto a room we don't remember: fabricate a plausible
  // waiting room you own, so the page still works.
  return makeMatch({
    id,
    status: "waiting",
    symbol: DEFAULT_SYMBOL,
    startingCapital: DEFAULT_CAPITAL,
    durationSeconds: DEFAULT_DURATION,
    startsAt: null,
    endsAt: null,
    playerOne: MOCK_ME,
    playerTwo: null,
  });
}

// ---------- operations (each mirrors a seam function in matches.ts) ----------

export function createRoom(input: CreateRoomInput): Promise<RoomState> {
  const room: RoomState = {
    id: crypto.randomUUID(),
    status: "waiting",
    symbol: input.symbol ?? DEFAULT_SYMBOL,
    startingCapital: input.startingCapital,
    durationSeconds: input.durationSeconds,
    startsAt: null,
    endsAt: null,
    playerOne: MOCK_ME,
    playerTwo: null,
  };
  makeMatch(room);
  return Promise.resolve(room);
}

export function getRoom(id: string): Promise<RoomState> {
  return Promise.resolve(requireMatch(id).room);
}

export function joinRoom(id: string): Promise<RoomState> {
  // Models "you joined someone else's room": you are player two and the
  // countdown starts immediately.
  const existing = store.get(id);
  const durationSeconds = existing?.room.durationSeconds ?? DEFAULT_DURATION;
  const startingCapital = existing?.room.startingCapital ?? DEFAULT_CAPITAL;
  const symbol = existing?.room.symbol ?? DEFAULT_SYMBOL;
  const startsAt = new Date(Date.now() + COUNTDOWN_MS);
  const endsAt = new Date(startsAt.getTime() + durationSeconds * 1000);
  const room: RoomState = {
    id,
    status: "countdown",
    symbol,
    startingCapital,
    durationSeconds,
    startsAt: startsAt.toISOString(),
    endsAt: endsAt.toISOString(),
    playerOne: MOCK_OPP,
    playerTwo: MOCK_ME,
  };
  const m = existing ?? makeMatch(room);
  m.room = room;
  m.me = freshPlayerState(startingCapital);
  emit(m);
  return Promise.resolve(room);
}

export function subscribeRoom(
  id: string,
  onChange: (room: RoomState) => void
): () => void {
  const m = requireMatch(id);
  m.listeners.add(onChange);
  onChange(m.room); // push current state immediately
  ensureDriver(m); // start/continue the lifecycle
  return () => {
    m.listeners.delete(onChange);
  };
}

export function getCandles(id: string): Promise<Candle[]> {
  const m = requireMatch(id);
  ensureCandles(m);
  return Promise.resolve(m.candles);
}

/**
 * Inject a candle series (e.g. real market data from match-UI's route) so that
 * trades, scores and the result all price off the SAME series the chart shows.
 */
export function setCandles(id: string, candles: Candle[]): void {
  const m = requireMatch(id);
  if (candles.length) m.candles = candles;
}

export function getMyPlayerState(id: string): Promise<PlayerState> {
  return Promise.resolve({ ...requireMatch(id).me });
}

export function submitTrade(
  id: string,
  side: Side,
  amount: number
): Promise<PlayerState> {
  const m = requireMatch(id);
  if (m.room.status !== "active") {
    return Promise.reject(new Error("Match is not active."));
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    return Promise.reject(new Error("Enter a valid amount."));
  }

  ensureCandles(m);
  const price = priceAtElapsed(m.candles, m.room.startsAt);
  const p = m.me;

  // ⚠️ ILLUSTRATIVE ONLY — the real backend owns this math (prd.md section 6).
  if (p.netSide === "flat" || p.netSide === side) {
    // same direction (or opening): add to the position
    if (amount > p.availableBalance) {
      return Promise.reject(new Error("Insufficient balance."));
    }
    const total = p.netAmount + amount;
    p.averageEntryPrice =
      p.averageEntryPrice == null
        ? price
        : (p.averageEntryPrice * p.netAmount + price * amount) / total;
    p.netAmount = round2(total);
    p.netSide = side;
    p.availableBalance = round2(p.availableBalance - amount);
    p.reservedBalance = round2(p.reservedBalance + amount);
  } else {
    // opposite direction: offset existing exposure first, realize PnL
    const offset = Math.min(amount, p.netAmount);
    const entry = p.averageEntryPrice ?? price;
    const dir =
      p.netSide === "long" ? (price - entry) / entry : (entry - price) / entry;
    const pnl = offset * dir;
    p.realizedPnl = round2(p.realizedPnl + pnl);
    p.availableBalance = round2(p.availableBalance + offset + pnl);
    p.reservedBalance = round2(p.reservedBalance - offset);
    p.netAmount = round2(p.netAmount - offset);
    if (p.netAmount <= 0.01) {
      p.netAmount = 0;
      p.netSide = "flat";
      p.averageEntryPrice = null;
    }
    const remainder = amount - offset;
    if (remainder > 0 && remainder <= p.availableBalance) {
      p.netSide = side;
      p.netAmount = round2(remainder);
      p.averageEntryPrice = price;
      p.availableBalance = round2(p.availableBalance - remainder);
      p.reservedBalance = round2(p.reservedBalance + remainder);
    }
  }
  return Promise.resolve({ ...p });
}

function unrealizedPnl(p: PlayerState, price: number): number {
  if (p.netSide === "flat" || p.averageEntryPrice == null) return 0;
  const dir =
    p.netSide === "long"
      ? (price - p.averageEntryPrice) / p.averageEntryPrice
      : (p.averageEntryPrice - price) / p.averageEntryPrice;
  return p.netAmount * dir;
}

function myCapital(m: MockMatch, price: number): number {
  return round2(
    m.me.availableBalance + m.me.reservedBalance + unrealizedPnl(m.me, price)
  );
}

function opponentCapitalAt(startingCapital: number, elapsedSec: number): number {
  // Deterministic wobble so the opponent panel visibly moves during the match.
  return round2(startingCapital * (1 + Math.sin(elapsedSec / 8) * 0.05));
}

export function getScores(id: string): Promise<Scores> {
  const m = requireMatch(id);
  ensureCandles(m);
  const price = priceAtElapsed(m.candles, m.room.startsAt);
  const elapsed = Math.min(
    Math.max(elapsedSeconds(m.room.startsAt), 0),
    m.room.durationSeconds
  );
  return Promise.resolve({
    me: myCapital(m, price),
    opponent: opponentCapitalAt(m.room.startingCapital, elapsed),
  });
}

export function getResult(id: string): Promise<MatchResult> {
  const m = requireMatch(id);
  ensureCandles(m);
  const finalPrice = m.candles.length
    ? m.candles[m.candles.length - 1].close
    : 0;
  const starting = m.room.startingCapital;
  const myFinal = myCapital(m, finalPrice);
  const oppFinal = opponentCapitalAt(starting, m.room.durationSeconds);

  const opponent =
    m.room.playerOne.userId === MOCK_ME.userId
      ? m.room.playerTwo ?? MOCK_OPP
      : m.room.playerOne;

  const players: PlayerResult[] = [
    {
      userId: MOCK_ME.userId,
      username: MOCK_ME.username,
      finalCapital: myFinal,
      netPnl: round2(myFinal - starting),
      result: myFinal > oppFinal ? "win" : myFinal < oppFinal ? "loss" : "draw",
    },
    {
      userId: opponent.userId,
      username: opponent.username,
      finalCapital: oppFinal,
      netPnl: round2(oppFinal - starting),
      result: oppFinal > myFinal ? "win" : oppFinal < myFinal ? "loss" : "draw",
    },
  ];

  const winnerUserId =
    myFinal === oppFinal
      ? null
      : myFinal > oppFinal
        ? MOCK_ME.userId
        : opponent.userId;

  return Promise.resolve({
    matchId: id,
    winnerUserId,
    finalPrice,
    startingCapital: starting,
    durationSeconds: m.room.durationSeconds,
    players,
  });
}
