export type IconName =
  | "bolt"
  | "chevR"
  | "games"
  | "history"
  | "logout"
  | "plus"
  | "profile"
  | "refresh"
  | "settings"
  | "trash"
  | "users"
  | "trophy";

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
  ownedByCurrentUser?: boolean;
};

export type ActiveGame = {
  id: string;
  p1: string;
  p2: string;
  status: "countdown" | "live" | "ending";
  remaining: number;
  symbol: string;
};
