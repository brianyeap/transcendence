export function fmtUSD(value: number) {
  return `$${value.toLocaleString("en-US")}`;
} // 1000 to // "$1,000"

export function fmtClock(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
} // 90 to 1:30,  gets minutes / show remaining seconds and if below 10 add 0 infront

export function timeAgo(minutes: number) {
  return minutes < 1 ? "just now" : `${minutes}m ago`;
}
