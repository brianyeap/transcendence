import type { IconName } from "./types";

export const navItems: { label: string; icon: IconName; active?: boolean; page: string }[] = [
  { label: "Games", icon: "games", page: "/"},
  { label: "History", icon: "history", page: "/history" },
  { label: "Leaderboard", icon: "trophy", page: "/leaderboard" },
  { label: "Profile", icon: "profile", page: "/profile" },
  { label: "Settings", icon: "settings", page: "/settings" },
];
