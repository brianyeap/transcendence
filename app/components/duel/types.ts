export type IconName =
  | "bolt"
  | "chevR"
  | "games"
  | "helpCircle"
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
  creator_avatar_url?: string | null;
  players: number;
  capacity: number;
  ageMin: number;
  duration: number;
  capital: number;
  symbol: string;
  ownedByCurrentUser?: boolean;
};
