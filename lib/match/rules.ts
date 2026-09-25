//  Default match length, used when a room has no duration saved.
export const MATCH_DURATION_SECONDS = 60;

//  The match lengths a creator can pick (in seconds): 30s, 1 min, 1.5 min.
//  Keep the longest at 150s or less: the engine replays one 1-minute candle
//  every 0.5s, and Coinbase only returns 300 candles.
export const ALLOWED_DURATIONS = [30, 60, 90];

//  The starting capital a creator can pick.
export const ALLOWED_CAPITAL = [5000, 10000, 20000];
