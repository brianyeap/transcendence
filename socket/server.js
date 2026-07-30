// ============================================================================
// Match engine (Socket.IO server)
// ----------------------------------------------------------------------------
// This is the "brain" of a match. It runs as its own small Node program on
// port 4000, next to the Next.js app. For each running match it:
//   * runs the countdown, then starts trading                     (Phase 2)
//   * streams the live BTC price to both players every 0.5s       (Phase 2)
//   * takes buy/sell orders and updates each player's money       (Phase 3)
//   * when the timer ends, closes positions and picks the winner  (Phase 4)
//
// It keeps the "live" numbers in memory while a match is running (fast), and
// writes them to the Supabase database using the secret service-role key so the
// data is saved for history.
//
// It is deliberately written in a simple, step-by-step style with lots of
// comments so every line is easy to follow.
// ============================================================================

const path = require("path");
// Load the same environment variables the Next.js app uses (Supabase URL + keys).
require("dotenv").config({ path: path.join(__dirname, "..", ".env.local") });

const http = require("http");
const express = require("express");
const cors = require("cors");
const { Server } = require("socket.io");
const { createClient } = require("@supabase/supabase-js");
// The pure trading maths lives in its own file so it can be tested on its own.
const { round2, applyTrade, settlePlayer } = require("./engine-math");

// ----------------------------------------------------------------------------
// Settings
// ----------------------------------------------------------------------------
const PORT = 4000;
const TICK_MS = 500; // how often we update the price and check the clock (0.5s)
const TICKER_URL = "https://api.exchange.coinbase.com/products/BTC-USD/ticker";
const CANDLES_URL = "https://api.exchange.coinbase.com/products/BTC-USD/candles";

// ----------------------------------------------------------------------------
// Supabase client using the SERVICE ROLE key.
// This key bypasses Row Level Security, so the engine can write match data.
// It must NEVER be sent to the browser.
// ----------------------------------------------------------------------------
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ----------------------------------------------------------------------------
// In-memory store of every match that is currently running.
// Key = matchId, value = a "live match" object (built in ensureMatchRunning).
// ----------------------------------------------------------------------------
const liveMatches = new Map();

// ============================================================================
// Small helper functions
// ============================================================================

// Fetch the current BTC/USD price from Coinbase. Returns a number, or null if
// the request failed (a failed tick is simply skipped).
async function fetchBtcPrice() {
  try {
    const res = await fetch(TICKER_URL, { headers: { "User-Agent": "transcendence" } });
    if (!res.ok) return null;
    const ticker = await res.json();
    return Number(ticker.price);
  } catch {
    return null;
  }
}

// Fetch `count` one-minute BTC/USD candles from Coinbase, oldest first.
// We "replay" these during a match: one candle per tick. Because each candle is
// one whole minute of real market history, the price moves far more than the
// live spot price would in a short match, and both players see the exact same
// sequence. Returns [] on failure (the match then falls back to the live price).
async function fetchCandles(count) {
  try {
    // granularity=60 means 1-minute candles.
    const res = await fetch(`${CANDLES_URL}?granularity=60`, {
      headers: { "User-Agent": "transcendence" },
    });
    if (!res.ok) return [];
    // Coinbase returns rows as [time, low, high, open, close, volume], newest first.
    const rows = await res.json();
    return rows
      .sort((a, b) => a[0] - b[0]) // put oldest first
      .slice(-count) // keep the most recent `count` candles
      .map(([time, low, high, open, close]) => ({ time, open, high, low, close }));
  } catch {
    return [];
  }
}

// The name of the Socket.IO "room" for a match. Both players join this room so
// we can send messages to both of them at once.
function roomName(matchId) {
  return "match:" + matchId;
}

// ============================================================================
// Saving to the database (all writes use the service-role client)
// ============================================================================

// Save a player's current money + position back to match_players.
async function savePlayer(matchId, userId, player) {
  await supabase
    .from("match_players")
    .update({
      available_balance: player.availableBalance,
      realized_pnl: player.realizedPnl,
      current_side: player.side,
      position_notional_usdt: player.notional,
      average_entry_price: player.avgEntry,
    })
    .eq("match_id", matchId)
    .eq("user_id", userId);
}

// Add one row to the trades log.
async function saveTrade(matchId, userId, side, amount, price, result, candleSequence) {
  await supabase.from("trades").insert({
    match_id: matchId,
    user_id: userId,
    side: side,
    amount_usdt: amount,
    execution_price: price,
    realized_pnl: result.tradePnl,
    resulting_side: result.next.side,
    resulting_notional: result.next.notional,
    candle_sequence: candleSequence,
  });
}

// Add one row to match_candles for a candle we replayed (saved for history).
async function saveCandle(matchId, sequence, candle) {
  await supabase.from("match_candles").insert({
    match_id: matchId,
    sequence: sequence,
    // Use the candle's real time if we have it, otherwise "now".
    open_time: candle.time ? new Date(candle.time * 1000).toISOString() : new Date().toISOString(),
    open: candle.open,
    high: candle.high,
    low: candle.low,
    close: candle.close,
  });
}

// ============================================================================
// Building and running a live match
// ============================================================================

// Load (or create) the two match_players rows and return them as a simple map:
//   { [userId]: { availableBalance, realizedPnl, side, notional, avgEntry } }
async function loadPlayers(matchRow) {
  const participants = [matchRow.player_one_user_id, matchRow.player_two_user_id];
  const startingCapital = Number(matchRow.starting_capital);

  // What a brand-new player looks like: all their money is free, no position.
  function freshPlayer() {
    return {
      availableBalance: round2(startingCapital),
      realizedPnl: 0,
      side: "flat",
      notional: 0,
      avgEntry: null,
    };
  }

  // Read any rows that already exist (in case the server restarted mid-match).
  const { data: existingRows } = await supabase
    .from("match_players")
    .select("user_id, available_balance, realized_pnl, current_side, position_notional_usdt, average_entry_price")
    .eq("match_id", matchRow.id);

  const existingByUser = {};
  for (const row of existingRows || []) {
    existingByUser[row.user_id] = row;
  }

  const players = {};

  for (const userId of participants) {
    const existing = existingByUser[userId];

    if (existing) {
      // Use the saved numbers.
      players[userId] = {
        availableBalance: Number(existing.available_balance),
        realizedPnl: Number(existing.realized_pnl),
        side: existing.current_side,
        notional: Number(existing.position_notional_usdt),
        avgEntry: existing.average_entry_price === null ? null : Number(existing.average_entry_price),
      };
    } else {
      // First time: create a fresh player and save it.
      const player = freshPlayer();
      players[userId] = player;
      await supabase.from("match_players").insert({
        match_id: matchRow.id,
        user_id: userId,
        available_balance: player.availableBalance,
        realized_pnl: player.realizedPnl,
        current_side: player.side,
        position_notional_usdt: player.notional,
        average_entry_price: player.avgEntry,
      });
    }
  }

  return players;
}

// matchIds currently inside an async tick, so two ticks never overlap.
const ticking = new Set();

// Make sure a match is loaded into memory and its clock is ticking.
// Safe to call many times — it only sets things up once.
async function ensureMatchRunning(matchRow) {
  // Already running? Nothing to do.
  if (liveMatches.has(matchRow.id)) {
    return liveMatches.get(matchRow.id);
  }

  // Load the players (money + positions).
  const players = await loadPlayers(matchRow);

  // Build the in-memory match object.
  const match = {
    matchId: matchRow.id,
    playerOne: matchRow.player_one_user_id,
    playerTwo: matchRow.player_two_user_id,
    startsAt: Date.parse(matchRow.starts_at), // when trading starts (ms)
    endsAt: Date.parse(matchRow.ends_at), // when the match ends (ms)
    started: false,
    ended: false,
    latestPrice: null, // most recent BTC price
    sequence: 0, // how many price ticks we have sent
    candles: [], // the pre-fetched candles we replay during the match
    players: players,
    timer: null,
  };

  liveMatches.set(match.matchId, match);

  // Pre-fetch the market data we will replay. We need one candle per tick for
  // the whole match. Example: a 60s match at one tick every 0.5s = 120 ticks,
  // so 120 one-minute candles = 2 hours of real history. We fetch now, during
  // the countdown, so the data is ready by the time trading starts.
  const durationMs = match.endsAt - match.startsAt;
  const candlesNeeded = Math.ceil(durationMs / TICK_MS);
  fetchCandles(candlesNeeded).then((candles) => {
    match.candles = candles;
  });

  // Start the clock: every TICK_MS we check where we are in the match.
  match.timer = setInterval(() => onTick(match), TICK_MS);

  return match;
}

// This runs every 0.5s for a running match. It drives the whole lifecycle.
async function onTick(match) {
  // If a previous tick for this match is still fetching a price, skip this one.
  if (ticking.has(match.matchId)) return;
  ticking.add(match.matchId);

  try {
    const now = Date.now();

    // ---- 1. Countdown phase (before trading starts) ----
    if (now < match.startsAt) {
      const secondsLeft = Math.ceil((match.startsAt - now) / 1000);
      io.to(roomName(match.matchId)).emit("match:countdown", { secondsLeft });
      return;
    }

    // ---- 2. The moment trading starts ----
    if (!match.started) {
      match.started = true;
      await supabase.from("matches").update({ status: "active" }).eq("id", match.matchId);
      io.to(roomName(match.matchId)).emit("match:started");
    }

    // ---- 3. The match has ended ----
    if (now >= match.endsAt) {
      await endMatch(match);
      return;
    }

    // ---- 4. Trading is live: replay one candle ----
    // We step through the pre-fetched candles one per tick. `sequence` is our
    // 0-based position in the list, so candle 0 is shown first, then candle 1...
    let candle = match.candles[match.sequence];

    // Fallback: if the candles never loaded (e.g. Coinbase was down), use the
    // live price instead so the match still works.
    if (!candle && match.candles.length === 0) {
      const livePrice = await fetchBtcPrice();
      if (livePrice !== null) {
        candle = { open: livePrice, high: livePrice, low: livePrice, close: livePrice };
      }
    }

    if (candle) {
      match.latestPrice = candle.close; // trades fill at the candle's close price
      match.sequence += 1;
      // Save the candle for history, then send the price to both players.
      await saveCandle(match.matchId, match.sequence, candle);
      io.to(roomName(match.matchId)).emit("match:tick", {
        price: candle.close,
        sequence: match.sequence,
        at: Date.now(),
      });
    }
  } finally {
    ticking.delete(match.matchId);
  }
}

// End the match: close positions, decide the winner, save, and tell the players.
async function endMatch(match) {
  if (match.ended) return; // only once
  match.ended = true;
  clearInterval(match.timer);

  // The price we settle at is the last one we streamed.
  const finalPrice = match.latestPrice;

  // Work out each player's final money (closing any open position).
  const finalCapitals = {};
  for (const userId of Object.keys(match.players)) {
    const player = match.players[userId];
    // If we somehow never got a price, just use the money they have.
    finalCapitals[userId] =
      finalPrice === null ? player.availableBalance : settlePlayer(player, finalPrice);
  }

  // Decide the winner: whoever has more money. Equal money = a draw.
  const userIds = Object.keys(match.players);
  const [a, b] = userIds;
  let winnerUserId = null;
  if (finalCapitals[a] > finalCapitals[b]) winnerUserId = a;
  else if (finalCapitals[b] > finalCapitals[a]) winnerUserId = b;
  // else it stays null, meaning a draw.

  // Save each player's final numbers and their win/loss/draw result.
  for (const userId of userIds) {
    const player = match.players[userId];
    let result;
    if (winnerUserId === null) result = "draw";
    else if (winnerUserId === userId) result = "win";
    else result = "loss";

    await supabase
      .from("match_players")
      .update({
        available_balance: player.availableBalance,
        realized_pnl: player.realizedPnl,
        current_side: player.side,
        position_notional_usdt: player.notional,
        average_entry_price: player.avgEntry,
        final_capital: finalCapitals[userId],
        result: result,
      })
      .eq("match_id", match.matchId)
      .eq("user_id", userId);
  }

  // Mark the match itself as finished.
  await supabase
    .from("matches")
    .update({
      status: "completed",
      final_price: finalPrice,
      winner_user_id: winnerUserId,
    })
    .eq("id", match.matchId);

  // Tell both players the result.
  io.to(roomName(match.matchId)).emit("match:ended", {
    finalCapitals: finalCapitals,
    winnerUserId: winnerUserId,
  });

  // Keep the finished match in memory briefly so a reconnecting player can still
  // read the result, then clean it up.
  setTimeout(() => liveMatches.delete(match.matchId), 60000);
}

// Send a single player the current picture of their own money/position.
function sendPlayerState(socket, match, userId) {
  const player = match.players[userId];
  if (!player) return;
  socket.emit("player:state", {
    availableBalance: player.availableBalance,
    realizedPnl: player.realizedPnl,
    side: player.side,
    notional: player.notional,
    avgEntry: player.avgEntry,
  });
}

// ============================================================================
// HTTP + Socket.IO setup
// ============================================================================
const app = express();
app.use(cors({ origin: "http://localhost:3000" })); // only allow our frontend
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "http://localhost:3000" } });

io.on("connection", (socket) => {
  console.log("client connected:", socket.id);

  // ------------------------------------------------------------------------
  // A player opens the match page and joins their match.
  // ------------------------------------------------------------------------
  socket.on("match:join", async ({ matchId, userId }) => {
    // Basic checks on the input.
    if (typeof matchId !== "string" || typeof userId !== "string") {
      socket.emit("error", { message: "matchId and userId are required." });
      return;
    }

    // Load the match and make sure this user is really one of its two players.
    const { data: matchRow } = await supabase
      .from("matches")
      .select("id, player_one_user_id, player_two_user_id, status, starting_capital, starts_at, ends_at, winner_user_id")
      .eq("id", matchId)
      .maybeSingle();

    if (!matchRow) {
      socket.emit("error", { message: "Match not found." });
      return;
    }

    const isPlayer =
      matchRow.player_one_user_id === userId || matchRow.player_two_user_id === userId;
    if (!isPlayer) {
      socket.emit("error", { message: "You are not part of this match." });
      return;
    }

    // Remember who this socket is, and put it in the match's room.
    socket.data.matchId = matchId;
    socket.data.userId = userId;
    socket.join(roomName(matchId));

    // If the room is still waiting for the second player, just say so.
    if (matchRow.status === "waiting") {
      socket.emit("match:waiting");
      return;
    }

    // If the match is already finished, just send back the saved result. We read
    // the final numbers from the database instead of re-running the engine, so
    // reopening or reconnecting to a finished match always shows the outcome.
    if (matchRow.status === "completed") {
      const { data: finalRows } = await supabase
        .from("match_players")
        .select("user_id, final_capital")
        .eq("match_id", matchId);

      const finalCapitals = {};
      for (const row of finalRows || []) {
        finalCapitals[row.user_id] = Number(row.final_capital);
      }

      socket.emit("match:ended", {
        finalCapitals,
        winnerUserId: matchRow.winner_user_id ?? null,
      });
      return;
    }

    // Otherwise the match is in countdown or active: make sure it is running,
    // then send this player their current state.
    const match = await ensureMatchRunning(matchRow);

    // If a price already exists, send it so the newcomer's screen isn't empty.
    if (match.latestPrice !== null) {
      socket.emit("match:tick", {
        price: match.latestPrice,
        sequence: match.sequence,
        at: Date.now(),
      });
    }
    // If the match already finished, tell them the result.
    if (match.ended) {
      const finalCapitals = {};
      for (const id of Object.keys(match.players)) {
        finalCapitals[id] = match.players[id].availableBalance;
      }
      socket.emit("match:ended", { finalCapitals, winnerUserId: null });
    }

    sendPlayerState(socket, match, userId);
  });

  // ------------------------------------------------------------------------
  // A player places a buy/sell (long/short) order.
  // ------------------------------------------------------------------------
  socket.on("trade:submit", async ({ matchId, userId, side, amount }) => {
    const match = liveMatches.get(matchId);

    // The match must be live (started, not ended).
    if (!match || !match.started || match.ended) {
      socket.emit("trade:rejected", { reason: "Match is not active." });
      return;
    }

    // Check the order details.
    if (side !== "long" && side !== "short") {
      socket.emit("trade:rejected", { reason: "Side must be long or short." });
      return;
    }
    const orderAmount = Number(amount);
    if (!Number.isFinite(orderAmount) || orderAmount <= 0) {
      socket.emit("trade:rejected", { reason: "Amount must be a positive number." });
      return;
    }

    // The player must be in this match.
    const player = match.players[userId];
    if (!player) {
      socket.emit("trade:rejected", { reason: "You are not in this match." });
      return;
    }

    // We need a current price to trade at.
    const price = match.latestPrice;
    if (price === null) {
      socket.emit("trade:rejected", { reason: "No price yet, try again in a moment." });
      return;
    }

    // Work out the result of the order.
    const result = applyTrade(player, side, orderAmount, price);
    if (!result.ok) {
      socket.emit("trade:rejected", { reason: result.reason });
      return;
    }

    // Save the new position into memory...
    match.players[userId] = result.next;
    // ...and into the database (player row + a trades log entry).
    await savePlayer(matchId, userId, result.next);
    await saveTrade(matchId, userId, side, orderAmount, price, result, match.sequence);

    // Tell just this player what happened (opponents don't see live trades).
    socket.emit("trade:accepted", { side, amount: orderAmount, price });
    socket.emit("player:state", {
      availableBalance: result.next.availableBalance,
      realizedPnl: result.next.realizedPnl,
      side: result.next.side,
      notional: result.next.notional,
      avgEntry: result.next.avgEntry,
    });
  });

  socket.on("disconnect", () => console.log("client disconnected:", socket.id));
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`match engine listening on :${PORT}`);
});
