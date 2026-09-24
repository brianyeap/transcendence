import { io, type Socket } from "socket.io-client";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { MatchSubscription, MatchTransport, MatchTransportHandlers } from "./transport";
import type {
  Candle,
  Match,
  MatchStatus,
  NetSide,
  PlayerState,
  Side,
  TradeFill,
} from "./types";

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL;

// A player's raw position
type EnginePosition = {
  availableBalance: number;
  realizedPnl: number;
  side: NetSide;
  notional: number;
  avgEntry: number | null;
};

// round to 2 decimal
function round2(value: number) {
  return Math.round(value * 100) / 100;
}

// What the open position is currently up or down. 0 when there is no position.
function unrealisedPnl(position: EnginePosition, price: number | null) {
  if (price === null || position.side === "flat" || position.notional <= 0 || position.avgEntry === null) {
    return 0;
  }

  // percentage of the move
  const move =
    position.side === "long"
      ? (price - position.avgEntry) / position.avgEntry
      : (position.avgEntry - price) / position.avgEntry;

  return round2(position.notional * move);
}

// Free money + money tied up in the position + what that position is worth now.
function equity(position: EnginePosition, price: number | null) {
  return round2(position.availableBalance + position.notional + unrealisedPnl(position, price));
}

// Turn the raw position into the obj the UI panels read.
function toPlayerState(
  position: EnginePosition,
  price: number | null,
  opponentCapital: number
): PlayerState {
  return {
    capital: equity(position, price),
    availableBalance: position.availableBalance,
    reservedBalance: position.notional, // money locked into the open position
    realisedPnl: position.realizedPnl,
    unrealisedPnl: unrealisedPnl(position, price),
    netSide: position.side,
    netAmount: position.notional,
    entryPrice: position.avgEntry,
    opponentCapital,
  };
}

// helpers----------------------------------------------------------------------

// The chart needs candles in time order with no repeated timestamps.
function tidyCandles(candles: Candle[]): Candle[] {
  const byTime = new Map<number, Candle>();  //map set to key and value pair
  for (const candle of candles) {
    byTime.set(candle.time, candle);
  }
  return [...byTime.values()].sort((a, b) => a.time - b.time);
}

function toMatchStatus(value: unknown): MatchStatus {
  const allowed: MatchStatus[] = ["waiting", "countdown", "active", "completed", "cancelled"];
  return allowed.includes(value as MatchStatus) ? (value as MatchStatus) : "waiting";
}

// A brand-new player: all their money free, nothing open.
function freshPosition(startingCapital: number): EnginePosition {
  return {
    availableBalance: startingCapital,
    realizedPnl: 0,
    side: "flat",
    notional: 0,
    avgEntry: null,
  };
}

export function createSocketTransport(): MatchTransport {
  return {
    connect(matchId, handlers: Partial<MatchTransportHandlers>) {  // handleer are calbacks like on tick , on snapshot and etc, partial measn they can chooose to put any transport or not
      // tis is the Mmmory for this  connection 
      let closed = false; // if the UI has closed the connection, don't do anything more
      let socket: Socket | null = null;
      let viewerId: string | null = null; // the user id
      let accessToken: string | null = null;
      let opponentId: string | null = null;
      let position: EnginePosition | null = null;
      let latestPrice: number | null = null;
      let opponentCapital = 0;
      let fillCount = 0; // how many trades has been filled

      // Push a freshly recalculated player state to the UI.
      function pushPlayerState() {
        if (position === null) return;
        handlers.onPlayerState?.(toPlayerState(position, latestPrice, opponentCapital));
      }

      // supabase stuff
      async function loadSnapshot() {
        const supabase = createSupabaseBrowserClient();

        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (closed) return;
        if (!user) {
          handlers.onConnectionChange?.(false);
          return;
        }
        viewerId = user.id;

        const {
          data: { session },
        } = await supabase.auth.getSession();
        accessToken = session?.access_token ?? null;

        // The match itself.
        const { data: matchRow } = await supabase
          .from("matches")
          .select(
            "id, status, symbol, starting_capital, starts_at, ends_at, player_one_user_id, player_two_user_id"
          )
          .eq("id", matchId)
          .maybeSingle();

        if (closed || !matchRow) {
          if (!closed) handlers.onConnectionChange?.(false); // change connection to false
          return;
        }

        opponentId =
          matchRow.player_one_user_id === user.id
            ? matchRow.player_two_user_id
            : matchRow.player_one_user_id;

        const playerIds = [matchRow.player_one_user_id, matchRow.player_two_user_id].filter(
          (id): id is string => typeof id === "string"
        );
        const { data: profileRows } = await supabase
          .from("profiles")
          .select("id, username")
          .in("id", playerIds);

        const nameById = new Map<string, string>();
        for (const row of profileRows ?? []) {
          nameById.set(row.id, row.username);
        }
        // Falling back to a slice of the id matches what the lobby does.
        const nameOf = (id: string) => nameById.get(id) ?? id.slice(0, 8); // slice the id to get first 8kg

        // Candles already streamed (so a reload doesn't lose the chart).
        const { data: candleRows } = await supabase
          .from("match_candles")
          .select("sequence, open_time, open, high, low, close")
          .eq("match_id", matchId)
          .order("sequence", { ascending: true });

        const candles = tidyCandles(
          (candleRows ?? []).map((row) => ({
            time: Math.floor(Date.parse(row.open_time) / 1000),
            open: Number(row.open),
            high: Number(row.high),
            low: Number(row.low),
            close: Number(row.close),
          }))
        );

        const { data: tradeRows } = await supabase
          .from("trades")
          .select("id, side, amount_usdt, execution_price, realized_pnl, resulting_side, resulting_notional, executed_at")
          .eq("match_id", matchId)
          .eq("user_id", user.id)
          .order("executed_at", { ascending: true });

        const trades: TradeFill[] = (tradeRows ?? []).map((row) => ({ // if return null use empty aray
          id: row.id,
          side: row.side as Side,
          amount: Number(row.amount_usdt),
          fillPrice: Number(row.execution_price),
          executedAt: Date.parse(row.executed_at),
          resultingNetSide: row.resulting_side as NetSide,
          resultingNetAmount: Number(row.resulting_notional),
          realisedPnl: Number(row.realized_pnl),
        }));

        const startingCapital = Number(matchRow.starting_capital);

        // Your money and position. The row only exists once the engine has run
        const { data: playerRow } = await supabase
          .from("match_players")
          .select("available_balance, realized_pnl, current_side, position_notional_usdt, average_entry_price")
          .eq("match_id", matchId)
          .eq("user_id", user.id)
          .maybeSingle();

        position = playerRow
          ? {
              availableBalance: Number(playerRow.available_balance),
              realizedPnl: Number(playerRow.realized_pnl),
              side: playerRow.current_side as NetSide,
              notional: Number(playerRow.position_notional_usdt),
              avgEntry:
                playerRow.average_entry_price === null
                  ? null
                  : Number(playerRow.average_entry_price),
            }
          : freshPosition(startingCapital);

        latestPrice = candles[candles.length - 1]?.close ?? null;
        // Until the engine sends real numbers, assume the opponent is untouched
        opponentCapital = startingCapital;

        const match: Match = {
          id: matchRow.id,
          status: toMatchStatus(matchRow.status),
          symbol: matchRow.symbol,
          startingCapital,
          startsAt: matchRow.starts_at,
          endsAt: matchRow.ends_at,
          playerOne: {
            userId: matchRow.player_one_user_id,
            username: nameOf(matchRow.player_one_user_id),
          },
          playerTwo: matchRow.player_two_user_id
            ? {
                userId: matchRow.player_two_user_id,
                username: nameOf(matchRow.player_two_user_id),
              }
            : null,
        };

        if (closed) return;

        handlers.onSnapshot?.({
          match,
          viewer: { userId: user.id, username: nameOf(user.id) },
          candles,
          player: toPlayerState(position, latestPrice, opponentCapital),
          trades,
          serverTime: Date.now(),
        });

        openSocket();
      }

      // Go live from socket.io
      function openSocket() {
        if (closed || socket !== null) return;

        socket = io(SOCKET_URL, {
          // this callback is sent on every connect and reconnect, so the engine can verify us, sends the access token to the engine for verification
          auth: (cb) => cb({ token: accessToken }),
        });

        socket.on("connect", () => {
          handlers.onConnectionChange?.(true);
          socket?.emit("match:join", { matchId });
        });

        socket.on("disconnect", () => handlers.onConnectionChange?.(false));
        socket.on("connect_error", () => handlers.onConnectionChange?.(false));

        // match stuff
        socket.on("match:waiting", () => handlers.onStatusChange?.("waiting"));
        socket.on("match:countdown", () => handlers.onStatusChange?.("countdown"));
        socket.on("match:started", () => {
          handlers.onStatusChange?.("active");
          if (opponentId === null) loadSnapshot(); // load the data incase second user joined 
        });

        // price
        socket.on("match:tick", (tick: {
          price: number;
          at: number;
          sequence: number;
          candle: { time: number; open: number; high: number; low: number; close: number };
        }) => {
          latestPrice = tick.price;

          // The engine sends a full candle with every tick
          const candle: Candle = tick.candle;

          handlers.onTick?.({ candle, price: tick.price, serverTime: tick.at }); // send the tick to the UI
          // The position is worth something different now so this updates 
          pushPlayerState();
        });

        socket.on("match:capitals", ({ capitals }: { capitals: Record<string, number> }) => {
          if (opponentId !== null && typeof capitals[opponentId] === "number") {
            opponentCapital = capitals[opponentId];
            pushPlayerState();
          }
        });

        // --- your money and position ---
        socket.on("player:state", (state: {
          availableBalance: number;
          realizedPnl: number;
          side: NetSide;
          notional: number;
          avgEntry: number | null;
        }) => {
          position = {
            availableBalance: state.availableBalance,
            realizedPnl: state.realizedPnl,
            side: state.side,
            notional: state.notional,
            avgEntry: state.avgEntry,
          };
          pushPlayerState();
        });

        // --- order results ---
        socket.on("trade:accepted", (fill: {
          side: Side;
          amount: number;
          price: number;
          at?: number;
          realizedPnl?: number;
          resultingSide?: NetSide;
          resultingNotional?: number;
        }) => {
          fillCount += 1;
          handlers.onTradeAccepted?.({
            // The engine writes the real row to Supabase; this id only has to be
            // unique within the page, for React keys and chart markers.
            id: `fill-${fillCount}`,
            side: fill.side,
            amount: fill.amount,
            fillPrice: fill.price,
            executedAt: fill.at ?? Date.now(),
            resultingNetSide: fill.resultingSide ?? position?.side ?? "flat",
            resultingNetAmount: fill.resultingNotional ?? position?.notional ?? 0,
            realisedPnl: fill.realizedPnl ?? null,
          });
        });

        socket.on("trade:rejected", ({ reason }: { reason: string }) => {
          handlers.onTradeRejected?.({ reason });
        });

        // The engine also uses a plain "error" event for things like being sent
        // to a match you are not part of. Show it the same way as a rejection.
        socket.on("error", ({ message }: { message: string }) => {
          handlers.onTradeRejected?.({ reason: message });
        });

        // --- the end ---
        socket.on("match:ended", (ended: {
          finalCapitals: Record<string, number>;
          winnerUserId: string | null;
          finalPrice?: number | null;
        }) => {
          const yours = viewerId === null ? 0 : ended.finalCapitals[viewerId] ?? 0;
          const theirs = opponentId === null ? 0 : ended.finalCapitals[opponentId] ?? 0;

          handlers.onStatusChange?.("completed");
          handlers.onMatchEnded?.({
            finalPrice: ended.finalPrice ?? latestPrice ?? 0,
            winnerUserId: ended.winnerUserId,
            yourFinalCapital: yours,
            opponentFinalCapital: theirs,
          });
        });
      }

      loadSnapshot();

      // ------------------------------------------------------------------
      // What the UI can do with this connection.
      // ------------------------------------------------------------------
      const subscription: MatchSubscription = {
        submitTrade({ side, amount }) {
          socket?.emit("trade:submit", { matchId, side, amount });
        },

        reconnect() {
          if (socket === null) {
            // We never got as far as opening a socket — start over.
            loadSnapshot();
            return;
          }
          socket.disconnect();
          socket.connect(); // the "connect" handler re-joins the match for us
        },

        close() {
          closed = true;
          socket?.disconnect();
          socket = null;
        },
      };

      return subscription;
    },
  };
}
