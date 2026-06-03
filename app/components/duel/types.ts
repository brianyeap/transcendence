export type IconName =
  | "bolt"
  | "chevR"
  | "flame"
  | "games"
  | "history"
  | "logout"
  | "plus"
  | "profile"
  | "refresh"
  | "settings"
  | "users"
  | "x";

export type Room = {
  id: string;
  name: string;
  creator: string;
  players: number;
  capacity: number;
  ageMin: number;
  duration: number;
  capital: number;
  symbol: string;
  hot?: boolean;
};

export type ActiveGame = {
  id: string;
  p1: string;
  p2: string;
  status: "countdown" | "live" | "ending";
  remaining: number;
  symbol: string;
};
