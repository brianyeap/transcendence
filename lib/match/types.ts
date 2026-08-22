export type MatchStatus =
  | "waiting"
  | "countdown"
  | "active"
  | "completed"
  | "cancelled";

export type Side = "long" | "short";

export type NetSide = Side | "flat";

export type Candle = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  preMatch: boolean;
};

export type PlayerRef = {
  userId: string;
  username: string;
};

export type Match = {
  id: string;
  status: MatchStatus;
  symbol: string;
  startingCapital: number;
  startsAt: string | null;
  endsAt: string | null;
  playerOne: PlayerRef;
  playerTwo: PlayerRef | null;
};

export type PlayerState = {
  capital: number;
  availableBalance: number;
  reservedBalance: number;
  realisedPnl: number;
  unrealisedPnl: number;
  netSide: NetSide;
  netAmount: number;
  entryPrice: number | null;
  opponentCapital: number;
};

export type TradeFill = {
  id: string;
  side: Side;
  amount: number;
  fillPrice: number;
  executedAt: number;
  resultingNetSide: NetSide;
  resultingNetAmount: number;
  realisedPnl: number | null;
};

export type TradeRejection = {
  reason: string;
};

export type MatchEnded = {
  finalPrice: number | null;
  winnerUserId: string | null;
  yourFinalCapital: number;
  opponentFinalCapital: number;
};

export type MatchSnapshot = {
  match: Match;
  viewer: Viewer;
  candles: Candle[];
  player: PlayerState;
  trades: TradeFill[];
  serverTime: number;
};

export type Tick = {
  candle: Candle;
  price: number;
  serverTime: number;
};

export type Viewer = PlayerRef;
