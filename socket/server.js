const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env.local") });

// Register OTel metrics before anything requires ./metrics
require("./instrumentation");

const http = require("http");
const { Server } = require("socket.io");
const { createClient } = require("@supabase/supabase-js");
// The pure trading maths lives in its own file so it can be tested on its own.
const { round2, applyTrade, settlePlayer, equity } = require("./engine-math");
const { gamesStarted, gamesCompleted, activeGames, matchesPlayed } = require("./metrics");

// ----------------------------------------------------------------------------
// Settings
// ----------------------------------------------------------------------------
const PORT = 4000;
const TICK_MS = 500;
const ALLOWED_ORIGINS = (
  process.env.SOCKET_ALLOWED_ORIGINS ?? "http://localhost:3000"
)
  .split(",")
  .map((origin) => origin.trim());

const TICKER_URL = "https://api.exchange.coinbase.com/products/BTC-USD/ticker";
const CANDLES_URL = "https://api.exchange.coinbase.com/products/BTC-USD/candles";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const liveMatches = new Map();

// Helpers

async function fetchBtcPrice() {
  try {
    const res = await fetch(TICKER_URL);
    if (!res.ok) return null;
    const ticker = await res.json();
    return Number(ticker.price);
  } catch {
    return null;
  }
}

async function fetchCandles(count) {
  try {
    const res = await fetch(`${CANDLES_URL}?granularity=60`, { // 1 min candle
      headers: { "User-Agent": "transcendence" },
    });
    if (!res.ok) return [];
    const rows = await res.json();
    return rows
      .sort((a, b) => a[0] - b[0]) // put oldest first
      .slice(-count) // CB always give 350 data so we only want our amount
      .map(([time, low, high, open, close]) => ({ time, open, high, low, close }));
  } catch {
    return [];
  }
}


function roomName(matchId) {
  return "match:" + matchId;
}

// DB stuff

// Save a player's position and etc
async function savePlayer(matchId, userId, player) {
  await supabase
    .from("match_players")
    .update({
      available_balance: player.availableBalance,
      realized_pnl: player.realizedPnl,
      current_side: player.side,
      position_notional_usdt: player.notional, // active postion notional alwasy positive
      average_entry_price: player.avgEntry,
    })
    .eq("match_id", matchId)
    .eq("user_id", userId);
}

// Add the trades
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
    candle_sequence: candleSequence,              // candle tick
  });
}

// ADd cancle to db
async function saveCandle(matchId, sequence, candle) {
  await supabase.from("match_candles").insert({
    match_id: matchId,
    sequence: sequence, // count of the candle
    open_time: candle.time ? new Date(candle.time * 1000).toISOString() : new Date().toISOString(), // use time if not now
    open: candle.open,
    high: candle.high,
    low: candle.low,
    close: candle.close,
  });
}


 // Maych stuff
async function loadPlayers(matchRow) {
  const participants = [matchRow.player_one_user_id, matchRow.player_two_user_id];
  const startingCapital = Number(matchRow.starting_capital);

  function freshPlayer() {
    return {
      availableBalance: round2(startingCapital),
      realizedPnl: 0,
      side: "flat",
      notional: 0,
      avgEntry: null,
    };
  }

  // getting the existing players from the db if they exist
  const { data: existingRows } = await supabase // supabase returns data so we rename it to existingRows
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

    if (existing) { // existing player load from db
      players[userId] = {
        availableBalance: Number(existing.available_balance),
        realizedPnl: Number(existing.realized_pnl),
        side: existing.current_side,
        notional: Number(existing.position_notional_usdt),
        avgEntry: existing.average_entry_price === null ? null : Number(existing.average_entry_price),
      };
    } else { // new player create fresh
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

const ticking = new Set();

// Make sure a match is loaded into memory and its clock is ticking. (Safe to call many times)
async function ensureMatchRunning(matchRow) {
  // IF match alr running
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
    fallbackBaseTime: Math.floor(Date.now() / 1000), // fallback path if candles never load
    players: players,
    timer: null,
  };

  // seeting match id to mathc obj 
  liveMatches.set(match.matchId, match);

  // so 120 one minute candles = 2 hours of  history
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

    // 1 Countdown 
    if (now < match.startsAt) {
      const secondsLeft = Math.ceil((match.startsAt - now) / 1000); // in seconds
      io.to(roomName(match.matchId)).emit("match:countdown", { secondsLeft });
      return;
    }

    // 2 Trading starts
    if (!match.started) {
      match.started = true;
      await supabase.from("matches").update({ status: "active" }).eq("id", match.matchId);
      io.to(roomName(match.matchId)).emit("match:started");
	  gamesStarted.add(1);
	  activeGames.add(1);
    }

    // 3 The match  ended
    if (now >= match.endsAt) {
      await endMatch(match);
      return;
    }

    // 4 Trading is live: replay one candle
    let candle = match.candles[match.sequence];

    // Fallback: if the candles never loaded then live prices
    if (!candle && match.candles.length === 0) {
      const livePrice = await fetchBtcPrice();
      if (livePrice !== null) {
        candle = { open: livePrice, high: livePrice, low: livePrice, close: livePrice };
      }
    }

    if (candle) {
      match.latestPrice = candle.close; // trades fill at the candle's close price
      match.sequence += 1;
      // Save the candle for history, then send the price to both players
      await saveCandle(match.matchId, match.sequence, candle);
      io.to(roomName(match.matchId)).emit("match:tick", {
        price: candle.close,
        sequence: match.sequence,
        at: Date.now(),
        candle: {
          time: candle.time ?? match.fallbackBaseTime + match.sequence, // live candles have a time, but fallback ones don't, so we make one up
          open: candle.open,
          high: candle.high,
          low: candle.low,
          close: candle.close,
        },
      });
      // Both players' capital moves with every price change, so resend it.
      broadcastCapitals(match);
    }
  } catch (err) { 
	console.error("onTick error:", err);
  } finally {
    ticking.delete(match.matchId);
  }
}

// End the match: close positions, decide the winner, save, and tell the players
async function endMatch(match) {
  if (match.ended) return; // only once
  match.ended = true;
  clearInterval(match.timer);

  // The price we settle at is the last one we streamed
  const finalPrice = match.latestPrice;

  // Work out each player's final money (closing any open position)
  const finalCapitals = {};
  for (const userId of Object.keys(match.players)) {
    const player = match.players[userId];
    finalCapitals[userId] =
      finalPrice === null ? player.availableBalance : settlePlayer(player, finalPrice);
  }

  // Decide the winner part
  const userIds = Object.keys(match.players);
  const [a, b] = userIds;
  let winnerUserId = null;
  if (finalCapitals[a] > finalCapitals[b]) winnerUserId = a;
  else if (finalCapitals[b] > finalCapitals[a]) winnerUserId = b;
  // else it stays null, meaning a draw

  // Save each player's final numbers and their result
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
	gamesCompleted.add(1);
	matchesPlayed.add(1);
	activeGames.add(-1);

  // Tell both players the result.
  io.to(roomName(match.matchId)).emit("match:ended", {
    finalCapitals: finalCapitals,
    winnerUserId: winnerUserId,
    finalPrice: finalPrice, // the result screen shows the price we settled at
  });

  // Keep the finished match in memory briefly so a reconnecting player can still
  // read the result, then clean it up.
  setTimeout(() => liveMatches.delete(match.matchId), 60000);
}

// Send BOTH players' current capital to everyone in the match room.
function broadcastCapitals(match) {
  if (match.latestPrice === null) return;

  const capitals = {};
  for (const userId of Object.keys(match.players)) {
    capitals[userId] = equity(match.players[userId], match.latestPrice);
  }

  io.to(roomName(match.matchId)).emit("match:capitals", { capitals, at: Date.now() });
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

// Cleanup if room sit waiting for one hour it will be closed to prevent players from being stuck with an unfinished match forever
const ABANDONED_ROOM_HOURS = 1;

async function closeStaleMatches() {
  const now = new Date();

  // 1. Matches that were counting down or running when we went away. Their end
  //    time has already passed, so nobody can finish them any more.
  const { data: expired, error: expiredError } = await supabase
    .from("matches")
    .update({ status: "completed" })
    .neq("status", "completed")
    .lt("ends_at", now.toISOString())
    .select("id");

  if (expiredError) {
    console.log("could not close finished matches:", expiredError.message);
  } else if (expired && expired.length > 0) {
    console.log(`closed ${expired.length} match(es) whose time had already run out`);
  }

  // 2. Rooms still waiting for a second player
  const abandonedBefore = new Date(now.getTime() - ABANDONED_ROOM_HOURS * 60 * 60 * 1000);

  const { data: abandoned, error: abandonedError } = await supabase
    .from("matches")
    .update({ status: "completed" })
    .eq("status", "waiting")
    .lt("created_at", abandonedBefore.toISOString())
    .select("id");

  if (abandonedError) {
    console.log("could not close abandoned rooms:", abandonedError.message);
  } else if (abandoned && abandoned.length > 0) {
    console.log(`closed ${abandoned.length} abandoned room(s) nobody ever joined`);
  }
}

// setup socket io
const server = http.createServer();
const io = new Server(server, { cors: { origin: ALLOWED_ORIGINS } }); // only allow our frontend


io.use(async (socket, next) => {
  const token = socket.handshake.auth?.token; // auth token

  if (typeof token !== "string" || token.length === 0) {
    return next(new Error("Not signed in."));
  }

  // Supabase verifies the token's signature and expiry for us.
  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data?.user) {
    return next(new Error("Not signed in."));
  }

  socket.data.userId = data.user.id; // trusted; never taken from a message
  next();
});

io.on("connection", (socket) => {
  console.log("client connected:", socket.id);

  socket.on("match:join", async ({ matchId }) => {
    const userId = socket.data.userId;

    if (typeof matchId !== "string") {
      socket.emit("error", { message: "matchId is required." });
      return;
    }

    // Load the match and make sure this user is really one of its two players.
    const { data: matchRow } = await supabase
      .from("matches")
      .select("id, player_one_user_id, player_two_user_id, status, starting_capital, starts_at, ends_at, winner_user_id, final_price")
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

    // Put this socket in the match's room
    socket.join(roomName(matchId));

    // If the room is still waiting for the second player, just say so
    if (matchRow.status === "waiting") {
      socket.emit("match:waiting");
      return;
    }

    // If the match is finished we send result from db
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
        finalPrice: matchRow.final_price === null ? null : Number(matchRow.final_price),
      });
      return;
    }

    // Otherwise the match is in countdown or active: make sure it is running,
    // then send this player their current state.
    const match = await ensureMatchRunning(matchRow);

    // No need to send a price here: the page already loaded the saved candles from Supabase
    sendPlayerState(socket, match, userId);
    // Give the newcomer both capitals straight away so the header isn't blank.
    broadcastCapitals(match);
  });

  // buy and sell orders
  socket.on("trade:submit", async ({ matchId, side, amount }) => {
    // Same rule as match:join - the trader is whoever the token says they are.
    const userId = socket.data.userId;

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
    // We include the resulting position so the chart can mark the fill and the
    // trades list can show what the order left them holding.
    socket.emit("trade:accepted", {
      side,
      amount: orderAmount,
      price,
      at: Date.now(),
      realizedPnl: result.tradePnl,
      resultingSide: result.next.side,
      resultingNotional: result.next.notional,
    });
    sendPlayerState(socket, match, userId);
    // The trade changed this player's capital — refresh it for both of them.
    broadcastCapitals(match);
  });

  socket.on("disconnect", () => console.log("client disconnected:", socket.id));
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`match engine listening on :${PORT}`);
  closeStaleMatches();
});
