import type { ActiveGame, IconName, Room } from "./types";

export const openRooms: Room[] = [
  { id: "R-7F3A", name: "Liq Hunters", creator: "liq_hunter", players: 1, capacity: 2, ageMin: 1, duration: 120, capital: 10000, symbol: "BTC/USDT", hot: true },
  { id: "R-2C19", name: "Quick Scalp", creator: "candle_wick", players: 1, capacity: 2, ageMin: 3, duration: 60, capital: 10000, symbol: "BTC/USDT" },
  { id: "R-B844", name: "High Roller", creator: "gm_ser", players: 1, capacity: 2, ageMin: 6, duration: 180, capital: 50000, symbol: "BTC/USDT" },
  { id: "R-9E20", name: "Degen Hour", creator: "moon_or_bust", players: 1, capacity: 2, ageMin: 9, duration: 120, capital: 10000, symbol: "BTC/USDT" },
  { id: "R-5A77", name: "No Mercy", creator: "rektproof", players: 1, capacity: 2, ageMin: 14, duration: 90, capital: 25000, symbol: "BTC/USDT" },
];

export const activeGames: ActiveGame[] = [
  { id: "M-3301", p1: "satoshi_jr", p2: "delta_neutral", status: "live", remaining: 74, symbol: "BTC/USDT" },
  { id: "M-3302", p1: "apex_07", p2: "nightowl", status: "countdown", remaining: 4, symbol: "BTC/USDT" },
  { id: "M-3303", p1: "shortking", p2: "foxtrot", status: "ending", remaining: 11, symbol: "BTC/USDT" },
  { id: "M-3304", p1: "fade_the_news", p2: "gm_ser", status: "live", remaining: 58, symbol: "BTC/USDT" },
];

export const navItems: { label: string; icon: IconName; active?: boolean; page: string }[] = [
  { label: "Games", icon: "games", active: true, page: "/games"},
  { label: "History", icon: "history", page: "/history" },
  { label: "Profile", icon: "profile", page: "/profile" },
  { label: "Settings", icon: "settings", page: "/settings" },
];
