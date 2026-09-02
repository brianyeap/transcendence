// ============================================================================
// socket-transport.ts — the real data source behind the match screen.
// ----------------------------------------------------------------------------
// The match UI talks to a `MatchTransport` (see transport.ts). This one is
// backed by the two real sources we already have:
//
//   * Supabase  — the things that don't change during a match, plus anything we
//                 need to catch up on after a reload: who is playing, the
//                 starting capital, the clock, past candles and past trades.
//   * Socket.IO — everything live: price ticks, your position, fills, the end
//                 of the match. This is socket/server.js on port 4000.
//
// One extra job happens here: the engine only tells us a player's position
// (side / amount / entry price). Numbers that move with the price — unrealised
// PnL and total capital — are worked out on this side, on every tick, using the
// same formulas as socket/engine-math.js.
// ============================================================================

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

// A player's raw position, exactly as the engine keeps and sends it.
type EnginePosition = {
  availableBalance: number;
  realizedPnl: number;
  side: NetSide;
  notional: number;
  avgEntry: number | null;
};

// ----------------------------------------------------------------------------
// Money maths — the browser copy of socket/engine-math.js.
// The engine is still the authority: these only fill in the numbers that move
// between ticks, so the screen doesn't need a server round-trip to update.
// ----------------------------------------------------------------------------

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

// What the open position is currently up or down. 0 when there is no position.
function unrealisedPnl(position: EnginePosition, price: number | null) {
  if (price === null || position.side === "flat" || position.notional <= 0 || position.avgEntry === null) {
    return 0;
  }

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

// Turn the raw position into the shape the UI panels read.
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

// ----------------------------------------------------------------------------
// Small helpers
// ----------------------------------------------------------------------------

// The chart needs candles in time order with no repeated timestamps.
function tidyCandles(candles: Candle[]): Candle[] {
  const byTime = new Map<number, Candle>();
  for (const candle of candles) {
    byTime.set(candle.time, candle); // a later candle for the same time wins
  }
  return [...byTime.values()].sort((a, b) => a.time - b.time);
}

// The database keeps 'waiting' | 'countdown' | 'active' | 'completed' |
// 'cancelled', which is exactly what the UI uses — we only check the value.
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
    connect(matchId, handlers: Partial<MatchTransportHandlers>) {
      // --- everything this connection remembers ---------------------------
      let closed = false; // set by close(), so late replies are ignored
      let socket: Socket | null = null;
      let viewerId: string | null = null;
      let opponentId: string | null = null;
      let position: EnginePosition | null = null;
      let latestPrice: number | null = null;
      let opponentCapital = 0;
      let fillCount = 0; // used to give each fill its own id

      // Push a freshly recalculated player state to the UI.
      function pushPlayerState() {
        if (position === null) return;
        handlers.onPlayerState?.(toPlayerState(position, latestPrice, opponentCapital));
      }

      // ------------------------------------------------------------------
      // Step 1: build the opening picture from Supabase.
      // ------------------------------------------------------------------
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

        // The match itself.
        const { data: matchRow } = await supabase
          .from("matches")
          .select(
            "id, status, symbol, starting_capital, starts_at, ends_at, player_one_user_id, player_two_user_id"
          )
          .eq("id", matchId)
          .maybeSingle();

        if (closed || !matchRow) {
          if (!closed) handlers.onConnectionChange?.(false);
          return;
        }

        opponentId =
          matchRow.player_one_user_id === user.id
            ? matchRow.player_two_user_id
            : matchRow.player_one_user_id;

        // Usernames for both players (profiles are readable by any logged-in user).
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
        const nameOf = (id: string) => nameById.get(id) ?? id.slice(0, 8);

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
            preMatch: false, // every candle we stream is part of the match
          }))
        );

        // Your own fills so far. The policy lets us read the whole match, so we
        // ask for our own rows only — you don't get to see the opponent's hand.
        const { data: tradeRows } = await supabase
          .from("trades")
          .select("id, side, amount_usdt, execution_price, realized_pnl, resulting_side, resulting_notional, executed_at")
          .eq("match_id", matchId)
          .eq("user_id", user.id)
          .order("executed_at", { ascending: true });

        const trades: TradeFill[] = (tradeRows ?? []).map((row) => ({
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

        // Your money and position. The row only exists once the engine has run,
        // so before that we show a fresh player holding the starting capital.
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
        // Until the engine sends real numbers, assume the opponent is untouched.
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

      // ------------------------------------------------------------------
      // Step 2: go live over Socket.IO.
      // ------------------------------------------------------------------
      function openSocket() {
        if (closed || socket !== null) return;

        socket = io(SOCKET_URL);

        socket.on("connect", () => {
          handlers.onConnectionChange?.(true);
          // Tell the engine which match we are, so it puts us in the room.
          socket?.emit("match:join", { matchId, userId: viewerId });
        });

        socket.on("disconnect", () => handlers.onConnectionChange?.(false));
        socket.on("connect_error", () => handlers.onConnectionChange?.(false));

        // --- lifecycle ---
        socket.on("match:waiting", () => handlers.onStatusChange?.("waiting"));
        socket.on("match:countdown", () => handlers.onStatusChange?.("countdown"));
        socket.on("match:started", () => {
          handlers.onStatusChange?.("active");
          //  Player one opens the match page while the room is still empty, so
          //  the snapshot was built before player two existed. Now that the
          //  match is live the row has them, so read it again - that fills in
          //  the opponent's name, their capital, and the add-friend button.
          if (opponentId === null) loadSnapshot();
        });

        // --- price ---
        socket.on("match:tick", (tick: {
          price: number;
          at: number;
          sequence: number;
          candle?: { time: number; open: number; high: number; low: number; close: number };
        }) => {
          latestPrice = tick.price;

          // Older engines sent the price only; treat that as a flat candle so
          // the chart still has something to draw.
          const candle: Candle = tick.candle
            ? { ...tick.candle, preMatch: false }
            : {
                time: Math.floor(tick.at / 1000),
                open: tick.price,
                high: tick.price,
                low: tick.price,
                close: tick.price,
                preMatch: false,
              };

          handlers.onTick?.({ candle, price: tick.price, serverTime: tick.at });
          // The position is worth something different now.
          pushPlayerState();
        });

        // --- both players' capital, recomputed by the engine each tick ---
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
          socket?.emit("trade:submit", { matchId, userId: viewerId, side, amount });
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
