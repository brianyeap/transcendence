// The contract between the frontend and the (future) backend.
//
// These types are the single source of truth for "what the backend returns".
// The mock layer (mock.ts) returns these shapes today; the real endpoints must
// return the same shapes tomorrow. Your components only ever see these types,
// so they don't care whether the data is fake or real.
//
// NOTE ON NUMBERS: the real DB uses Postgres `numeric` for money/prices. JSON
// may serialize those as strings ("10000.00"). When you wire the real backend,
// coerce with Number(...) at the seam so the rest of the app keeps seeing plain
// `number`s like it does with the mock.

export type RoomStatus = "waiting" | "countdown" | "active" | "completed";

/** The direction of an order / open position. */
export type Side = "long" | "short";

/** A player's net position side. "flat" = no open position. */
export type PositionSide = "long" | "short" | "flat";

export type Player = {
  userId: string;
  username: string;
};

export type CreateRoomInput = {
  startingCapital: number;
  durationSeconds: number;
  symbol?: string;
};

/**
 * The full state of one room/match row. This is what the room page and the
 * live match page revolve around. In the DB this is a single `matches` row;
 * the backend joins `profiles` to fill in usernames.
 */
export type RoomState = {
  id: string;
  status: RoomStatus;
  symbol: string;
  startingCapital: number;
  durationSeconds: number;
  startsAt: string | null; // ISO timestamp, set by the SERVER when countdown begins
  endsAt: string | null; // ISO timestamp, set by the SERVER
  playerOne: Player;
  playerTwo: Player | null;
};

/** One OHLC candle. `openTime` is unix SECONDS (what lightweight-charts wants). */
export type Candle = {
  sequence: number;
  openTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
};

/**
 * The current user's private trading state inside a match. Returned by the
 * trade endpoint and readable on demand. NEVER computed on the client for real
 * — the mock only fakes it so the UI has something to render.
 */
export type PlayerState = {
  userId: string;
  availableBalance: number; // unreserved capital
  reservedBalance: number; // capital backing the open position
  netSide: PositionSide;
  netAmount: number; // USDT notional of the open position
  averageEntryPrice: number | null;
  realizedPnl: number;
};

/** Live "public score" for both players, shown on the match screen. */
export type Scores = {
  me: number;
  opponent: number;
};

export type PlayerResult = {
  userId: string;
  username: string;
  finalCapital: number;
  netPnl: number;
  result: "win" | "loss" | "draw";
};

export type MatchResult = {
  matchId: string;
  winnerUserId: string | null; // null = draw
  finalPrice: number;
  startingCapital: number;
  durationSeconds: number;
  players: PlayerResult[];
};
