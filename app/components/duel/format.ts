import { formatDistanceToNow } from "date-fns";

export function fmtUSD(value: number) {
  return `$${value.toLocaleString("en-US")}`;
} // 1000 to // "$1,000"

export function fmtClock(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
} // 90 to 1:30,  gets minutes / show remaining seconds and if below 10 add 0 infront

// Prices need cents; fmtUSD rounds them away.
export function fmtPrice(value: number) {
  return `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
} // 64213.5 to "$64,213.50"

// PnL reads wrong without an explicit sign — "12.40" and "-12.40" look unrelated.
export function fmtSigned(value: number) {
  const sign = value > 0 ? "+" : value < 0 ? "-" : "";
  return `${sign}${fmtPrice(Math.abs(value))}`;
} // -12.4 to "-$12.40", 12.4 to "+$12.40"

// export function timeAgo(minutes: number) {
//   if (minutes < 1) return "just now";
//   const date = new Date(Date.now() - minutes * 60 * 1000);
//   return formatDistanceToNow(date, { addSuffix: true });
// }

/* the colours for profit/loss - red, green, grey 
	used in the matches/[matchId]/ pages
*/
export function pnlTone(value: number): string {
  const rounded = Math.round(value);
  if (rounded > 0) return "text-[#1fcb83]";
  if (rounded < 0) return "text-[#f6485d]";
  return "text-[#9aa6b6]";
}
