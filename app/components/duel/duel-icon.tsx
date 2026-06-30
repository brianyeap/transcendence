import {
  Bolt,
  ChevronRight,
  Flame,
  Gamepad2,
  History,
  LogOut,
  Plus,
  RefreshCw,
  Settings,
  Trash2,
  User,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import type { IconName } from "./types";

// type and every compoennt must be lucide icon
const icons: Record<IconName, LucideIcon> = {
  bolt: Bolt,
  chevR: ChevronRight,
  flame: Flame,
  games: Gamepad2,
  history: History,
  logout: LogOut,
  plus: Plus,
  profile: User,
  refresh: RefreshCw,
  settings: Settings,
  trash: Trash2,
  users: Users,
  x: X,
};

// aria-hidden="true" is technically not needed but for people that use screen reader it will ignore
export function Icon({ name, className = "" }: { name: IconName; className?: string }) {
  const LucideIcon = icons[name];

  return <LucideIcon aria-hidden="true" className={className} strokeWidth={2} />;
}
