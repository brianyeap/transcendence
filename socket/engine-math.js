// ============================================================================
// engine-math.js — the pure money maths for a match.
// ----------------------------------------------------------------------------
// These functions do NOT touch the network or the database. They only do the
// arithmetic of trading, so they are easy to read and easy to test on their own
// (see engine-math.test.js). server.js requires them.
//
// A player's state is a plain object:
//   {
//     availableBalance : USDT free to open new positions,
//     realizedPnl      : profit/loss already locked in,
//     side             : 'long' | 'short' | 'flat',
//     notional         : USDT in the current open position,
//     avgEntry         : price the position was opened at (null if flat),
//   }
// ============================================================================

// Round a money amount to 2 decimal places (cents) so numbers stay tidy.
function round2(n) {
  return Math.round(n * 100) / 100;
}

// Apply one buy/sell order to a player and return the result.
// It does NOT change the player passed in — it returns the new state, so the
// caller can check the order is valid before saving it.
//
//   side   : 'long' or 'short'  (the direction the player is ordering)
//   amount : USDT size of the order
//   price  : the current BTC price the order fills at
//
// Rules:
//   * Same direction     -> add to the position.
//   * Opposite direction -> close (offset) the existing position, take the
//     profit/loss, then open a new position with any leftover amount.
//
// Returns { ok:false, reason } OR { ok:true, next, tradePnl }.
function applyTrade(player, side, amount, price) {
  // Start from a copy of the player's current numbers.
  let availableBalance = player.availableBalance;
  let realizedPnl = player.realizedPnl;
  let positionSide = player.side;
  let notional = player.notional;
  let avgEntry = player.avgEntry;

  let tradePnl = 0; // profit/loss locked in by THIS order (from closing)

  const openingSameDirection = positionSide === "flat" || positionSide === side;

  if (openingSameDirection) {
    // ---- Adding to (or opening) a position in the same direction ----
    // We need enough free money to cover the whole order.
    if (amount > availableBalance) {
      return { ok: false, reason: "Not enough balance." };
    }

    // Weighted average of the old and new entry prices.
    if (positionSide === "flat") {
      avgEntry = price;
    } else {
      avgEntry = (notional * avgEntry + amount * price) / (notional + amount);
    }

    availableBalance -= amount;
    notional += amount;
    positionSide = side;
  } else {
    // ---- Opposite direction: close the old position, then maybe flip ----
    const offset = Math.min(amount, notional); // how much of the old position we close

    // Profit/loss on the part we are closing.
    if (positionSide === "long") {
      tradePnl = offset * ((price - avgEntry) / avgEntry);
    } else {
      // positionSide === "short"
      tradePnl = offset * ((avgEntry - price) / avgEntry);
    }

    const released = offset + tradePnl; // the reserved money comes back, plus the pnl
    const remaining = amount - offset; // any amount left over opens a new position

    // If there is a leftover amount, we must be able to afford opening it.
    // (The released money is available to help pay for it.)
    if (remaining > 0 && remaining > availableBalance + released) {
      return { ok: false, reason: "Not enough balance." };
    }

    // Apply the close.
    availableBalance += released;
    realizedPnl += tradePnl;
    notional -= offset;

    if (notional <= 0) {
      // Position fully closed.
      notional = 0;
      positionSide = "flat";
      avgEntry = null;
    }

    // Apply the flip (open a new position on the order's side with the leftover).
    if (remaining > 0) {
      positionSide = side;
      notional = remaining;
      avgEntry = price;
      availableBalance -= remaining;
    }
  }

  // Tidy the numbers and hand back the new state.
  const next = {
    availableBalance: round2(availableBalance),
    realizedPnl: round2(realizedPnl),
    side: positionSide,
    notional: round2(notional),
    avgEntry: avgEntry, // keep full precision on the entry price
  };

  return { ok: true, next, tradePnl: round2(tradePnl) };
}

// Close a still-open position at the final price (used when the match ends).
// Changes the player in place and returns their final capital (all their money).
function settlePlayer(player, finalPrice) {
  let availableBalance = player.availableBalance;

  if (player.side !== "flat" && player.notional > 0) {
    let pnl;
    if (player.side === "long") {
      pnl = player.notional * ((finalPrice - player.avgEntry) / player.avgEntry);
    } else {
      pnl = player.notional * ((player.avgEntry - finalPrice) / player.avgEntry);
    }
    availableBalance += player.notional + pnl; // give back the reserved money + pnl
    player.realizedPnl = round2(player.realizedPnl + pnl);
  }

  // The position is now closed.
  player.side = "flat";
  player.notional = 0;
  player.avgEntry = null;
  player.availableBalance = round2(availableBalance);

  return player.availableBalance;
}

// Profit/loss the player WOULD lock in if they closed their position right now
// at `price`. Nothing is saved — this is just "what is my open bet worth?".
// Returns 0 when the player has no position.
function unrealisedPnl(player, price) {
  if (player.side === "flat" || player.notional <= 0 || player.avgEntry === null) {
    return 0;
  }

  // How far the price moved in the player's favour, as a fraction.
  const move =
    player.side === "long"
      ? (price - player.avgEntry) / player.avgEntry
      : (player.avgEntry - price) / player.avgEntry;

  return round2(player.notional * move);
}

// Everything the player is worth right now:
//   free money + money tied up in the position + what that position is up/down.
// This is the number the match header calls "capital".
function equity(player, price) {
  return round2(player.availableBalance + player.notional + unrealisedPnl(player, price));
}

module.exports = { round2, applyTrade, settlePlayer, unrealisedPnl, equity };
