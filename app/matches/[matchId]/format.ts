import { fmtUSD } from "../../components/duel/format";

export function fmtPrice(value: number): string {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function signedUSD(value: number): string {
  const rounded = Math.round(value);
  const sign = rounded > 0 ? "+" : rounded < 0 ? "−" : "";
  return `${sign}${fmtUSD(Math.abs(rounded))}`;
}

export function pnlTone(value: number): string {
  const rounded = Math.round(value);
  if (rounded > 0) return "text-[#1fcb83]";
  if (rounded < 0) return "text-[#f6485d]";
  return "text-[#9aa6b6]";
}
