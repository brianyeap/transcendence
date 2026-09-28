import { CandlestickSvg } from "./candlestick-svg";

// --- Legend marker (plain HTML so it wraps on small screens) ---
function LegendMarker({ long, mine }: { long: boolean; mine: boolean }) {
	const fill = mine ? (long ? "#10b981" : "#ef4444") : "none";
	const stroke = mine ? "#ffffff" : long ? "#34d399" : "#f87171";
	const d = long ? "M 6 1 L 1 9 L 11 9 Z" : "M 6 11 L 1 3 L 11 3 Z";
	return (
		<svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true" className="shrink-0">
			<path d={d} fill={fill} stroke={stroke} strokeWidth={mine ? 1 : 1.5} />
		</svg>
	);
}

// --- Candlestick Chart Component ---
// Stays a plain (non-"use client") component so server pages can pass `t` in.
// It translates everything here and hands only plain data to the client-side SVG.
// `fill`: stretch to the height of the flex-column parent (used by the one-screen match page on mobile).
export function CandlestickChart({ candles, trades, currentUserId, t, fill = false }: any) {
	if (!candles || candles.length === 0) return null;

	const chartTrades = (trades ?? []).map((trade: any) => ({
		id: trade.id,
		user_id: trade.user_id,
		side: trade.side,
		candle_sequence: trade.candle_sequence,
		execution_price: trade.execution_price,
		tooltip: t("tradeTooltip", {
			username: trade.username,
			side: trade.side === "long" ? t("long") : t("short"),
			amount: trade.amount_usdt,
			price: trade.execution_price,
		}),
	}));

	return (
		<div className={fill ? "flex flex-col flex-1 min-h-0 w-full min-w-0 md:flex-none" : "w-full min-w-0"}>
			<div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-2 text-[10px] text-[#9aa6b6] shrink-0">
				<span className="inline-flex items-center gap-1.5"><LegendMarker long mine />{t("youLong")}</span>
				<span className="inline-flex items-center gap-1.5"><LegendMarker long={false} mine />{t("youShort")}</span>
				<span className="inline-flex items-center gap-1.5"><LegendMarker long mine={false} />{t("opponentLong")}</span>
				<span className="inline-flex items-center gap-1.5"><LegendMarker long={false} mine={false} />{t("opponentShort")}</span>
			</div>

			<CandlestickSvg
				candles={candles}
				trades={chartTrades}
				currentUserId={currentUserId}
				className={fill ? "flex-1 min-h-[140px] md:flex-none md:h-[300px]" : undefined}
			/>
		</div>
	);
}