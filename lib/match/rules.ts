//  Default match length, used when a room has no duration saved.
export const MATCH_DURATION_SECONDS = 60;

//  The match lengths a creator can pick (in seconds): 30s, 1 min, 1.5 min.
//  Keep the longest at 150s or less: the engine replays one 1-minute candle
//  every 0.5s, and Coinbase only returns 300 candles.
export const ALLOWED_DURATIONS = [30, 60, 90];

//  The starting capital a creator can pick.
export const ALLOWED_CAPITAL = [5000, 10000, 20000];

export const ALLOWED_SYMBOLS = ["BTC/USDT", "ETH/USDT", "SOL/USDT"];
export const DEFAULT_SYMBOL = "BTC/USDT";

export const ROOM_NAME_MAX_LENGTH = 40;
//  Letters, numbers, spaces and - _ ' ! ? .
export const ROOM_NAME_PATTERN = /^[A-Za-z0-9 _'!?.-]+$/;

//  Check a room name. Returns the key of the error message
//  (in "RoomErrors" in messages/*.json), or null when the name is fine.
export function roomNameError(name: string) {
  const trimmed = name.trim();

  // Blank is allowed: the room is then called "<creator>'s Room".
  if (trimmed.length === 0) return null;

  if (trimmed.length > ROOM_NAME_MAX_LENGTH) return "roomNameTooLong";
  if (!ROOM_NAME_PATTERN.test(trimmed)) return "roomNameInvalidChars"; // tets is built in js to check if matches regex

  return null;
}
