"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createSocketTransport } from "./socket-transport";
import type { MatchSubscription, MatchTransport, SubmitTradeInput } from "./transport";
import type {
  Candle,
  Match,
  MatchEnded,
  PlayerState,
  TradeFill,
  TradeRejection,
  Viewer,
} from "./types";

const TransportContext = createContext<MatchTransport | null>(null);

export function MatchTransportProvider({
  transport,
  children,
}: {
  transport?: MatchTransport;
  children: React.ReactNode;
}) {
  const value = useMemo(() => transport ?? createSocketTransport(), [transport]);
  return <TransportContext.Provider value={value}>{children}</TransportContext.Provider>;
}

export type ConnectionStatus = "connecting" | "connected" | "disconnected";
export type PriceDirection = "up" | "down" | "flat";

export type MatchConnection = {
  connection: ConnectionStatus;
  match: Match | null;
  viewer: Viewer | null;
  candles: Candle[];
  lastCandle: Candle | null;
  price: number | null;
  priceDirection: PriceDirection;
  player: PlayerState | null;
  trades: TradeFill[];
  pendingTrade: boolean;
  lastFill: TradeFill | null;
  lastRejection: TradeRejection | null;
  ended: MatchEnded | null;
  serverNow: () => number;
  submitTrade: (input: SubmitTradeInput) => void;
  reconnect: () => void;
  dismissFeedback: () => void;
};

export function useMatchConnection(matchId: string): MatchConnection {
  const transport = useContext(TransportContext);
  if (transport === null) {
    throw new Error("useMatchConnection must be used inside a MatchTransportProvider");
  }

  const [connection, setConnection] = useState<ConnectionStatus>("connecting");
  const [match, setMatch] = useState<Match | null>(null);
  const [viewer, setViewer] = useState<Viewer | null>(null);
  const [candles, setCandles] = useState<Candle[]>([]);
  const [lastCandle, setLastCandle] = useState<Candle | null>(null);
  const [price, setPrice] = useState<number | null>(null);
  const [priceDirection, setPriceDirection] = useState<PriceDirection>("flat");
  const [player, setPlayer] = useState<PlayerState | null>(null);
  const [trades, setTrades] = useState<TradeFill[]>([]);
  const [pendingTrade, setPendingTrade] = useState(false);
  const [lastFill, setLastFill] = useState<TradeFill | null>(null);
  const [lastRejection, setLastRejection] = useState<TradeRejection | null>(null);
  const [ended, setEnded] = useState<MatchEnded | null>(null);

  const subscriptionRef = useRef<MatchSubscription | null>(null);
  const clockOffsetRef = useRef(0);

  const matchRef = useRef<Match | null>(null);

  const [generation, setGeneration] = useState(0);

  const refreshedForRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const subscription = transport.connect(matchId, {
      onConnectionChange(connected) {
        setConnection(connected ? "connected" : "disconnected");
        if (!connected) setPendingTrade(false);
      },
      onSnapshot(snapshot) {
        clockOffsetRef.current = snapshot.serverTime - Date.now();
        const latest = snapshot.candles[snapshot.candles.length - 1] ?? null;
        matchRef.current = snapshot.match;
        setConnection("connected");
        setMatch(snapshot.match);
        setViewer(snapshot.viewer);
        setCandles(snapshot.candles);
        setLastCandle(latest);
        setPrice(latest?.close ?? null);
        setPlayer(snapshot.player);
        setTrades(snapshot.trades);
        setPendingTrade(false);
      },
      onTick(tick) {
        clockOffsetRef.current = tick.serverTime - Date.now();
        setPrice((previous) => {
          if (previous !== null) {
            setPriceDirection(
              tick.price > previous ? "up" : tick.price < previous ? "down" : "flat"
            );
          }
          return tick.price;
        });
        setLastCandle(tick.candle);
        setCandles((previous) => {
          const last = previous[previous.length - 1];
          if (last && last.time === tick.candle.time) {
            return [...previous.slice(0, -1), tick.candle];
          }
          return [...previous, tick.candle];
        });
      },
      onPlayerState(next) {
        setPlayer(next);
      },
      onStatusChange(status) {
        setMatch((previous) => (previous ? { ...previous, status } : previous));

        const known = matchRef.current;
        if (known !== null) {
          matchRef.current = { ...known, status };
        }

        const missingOpponent =
          known !== null && status === "countdown" && known.playerTwo === null;
        const missingClock =
          known !== null && status === "active" && known.endsAt === null;

        const refreshKey = `${matchId}:${status}`;

        if ((missingOpponent || missingClock) && !refreshedForRef.current.has(refreshKey)) {
          refreshedForRef.current.add(refreshKey);
          setGeneration((count) => count + 1);
        }
      },
      onTradeAccepted(fill) {
        setPendingTrade(false);
        setLastRejection(null);
        setLastFill(fill);
        setTrades((previous) => [...previous, fill]);
      },
      onTradeRejected(rejection) {
        setPendingTrade(false);
        setLastFill(null);
        setLastRejection(rejection);
      },
      onMatchEnded(result) {
        setPendingTrade(false);
        setEnded(result);
      },
    });

    subscriptionRef.current = subscription;
    return () => {
      subscription.close();
      subscriptionRef.current = null;
    };
  }, [transport, matchId, generation]);

  const submitTrade = useCallback((input: SubmitTradeInput) => {
    setPendingTrade(true);
    setLastFill(null);
    setLastRejection(null);
    subscriptionRef.current?.submitTrade(input);
  }, []);

  const reconnect = useCallback(() => {
    setConnection("connecting");
    subscriptionRef.current?.reconnect();
  }, []);

  const dismissFeedback = useCallback(() => {
    setLastFill(null);
    setLastRejection(null);
  }, []);

  const serverNow = useCallback(() => Date.now() + clockOffsetRef.current, []);

  return {
    connection,
    match,
    viewer,
    candles,
    lastCandle,
    price,
    priceDirection,
    player,
    trades,
    pendingTrade,
    lastFill,
    lastRejection,
    ended,
    serverNow,
    submitTrade,
    reconnect,
    dismissFeedback,
  };
}
