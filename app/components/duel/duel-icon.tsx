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
  Trophy,
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
  trophy: Trophy,
};

// aria-hidden="true" is technically not needed but for people that use screen reader it will ignore
export function Icon({ name, className = "" }: { name: IconName; className?: string }) {
  const LucideIcon = icons[name];

  return <LucideIcon aria-hidden="true" className={className} strokeWidth={2} />;
}

/* 
Summary on duel-icon.tsx 

The Icon component is a wrapper around the Lucide-React icons. The icons object
maps our application's icon names, like "flame" or "trophy", to the respective Lucide 
components. When the Icon revices a name, it uses that name to look upi the correct 
component from the object and renders it dynamically. TypeScript's IconName syntax ensures that the
defined Icons are the ones used, While Record<IconName , LucideIcon> ensures that the mapping contains Lucide 
icon components. The optional className allows the caller to style the icon, and the components 
*/ 