import type {
  MatchEnded,
  MatchSnapshot,
  MatchStatus,
  PlayerState,
  Side,
  Tick,
  TradeFill,
  TradeRejection,
} from "./types";

export type MatchTransportHandlers = {
  onSnapshot: (snapshot: MatchSnapshot) => void;

  onTick: (tick: Tick) => void;

  onPlayerState: (player: PlayerState) => void;
  onStatusChange: (status: MatchStatus) => void;
  onTradeAccepted: (fill: TradeFill) => void;
  onTradeRejected: (rejection: TradeRejection) => void;
  onMatchEnded: (ended: MatchEnded) => void;
  onConnectionChange: (connected: boolean) => void;
};

export type SubmitTradeInput = {
  side: Side;
  amount: number;
};

export type MatchSubscription = {
  submitTrade: (input: SubmitTradeInput) => void;

  reconnect: () => void;
  close: () => void;
};

export type MatchTransport = {
  connect: (
    matchId: string,
    handlers: Partial<MatchTransportHandlers>
  ) => MatchSubscription;
};
