import { SideNav } from "@/app/components/duel/side-nav";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { TrendingUp, TrendingDown, Clock, ArrowLeft, Swords } from "lucide-react";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";

// --- Helper Functions ---
function formatMoney(value: number): string {
	const sign = value > 0 ? "+" : "";
	return `${sign}$${Math.abs(value).toLocaleString(undefined, {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	})}`;
}

function formatDuration(
	starts_at: string,
	ends_at: string,
	t: (key: string, values?: Record<string, string | number>) => string,
): string {
	const seconds = Math.round((new Date(ends_at).getTime() - new Date(starts_at).getTime()) / 1000);
	const minutes = Math.floor(seconds / 60);
	const remainingSeconds = seconds % 60;
	return t("durationValue", { minutes, seconds: remainingSeconds });
}

function dateLocaleFromAppLocale(locale: string): string {
	if (locale === "zh-CN") return "zh-CN";
	if (locale === "ms") return "ms-MY";
	return "en-GB";
}

function formatDateTime(dateString: string, locale: string): string {
	return new Date(dateString).toLocaleDateString(dateLocaleFromAppLocale(locale), {
		day: "numeric",
		month: "short",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
}

function getPnLColor(value: number): string {
	if (value > 0)
		return "text-emerald-400";
	if (value < 0)
		return "text-rose-400";
	return "text-gray-400";
}

// --- Server Component ---
export default async function MatchDetailPage({
	params,
}: {
	params: Promise<{ matchId: string }>;
}) {
	// Auth Guard
	const supabase = await createSupabaseServerClient();
	const { data: { user } } = await supabase.auth.getUser();

	if (!user) {
		redirect("/login");
	}

	const t = await getTranslations("HistoryDetail");
	const locale = await getLocale();
	const { matchId } = await params;

	// Fetch match from Supabase
	const { data: matchData, error: matchError } = await supabase
		.from("matches")
		.select("*")
		.eq("id", matchId)
		.single();

	if (matchError || !matchData) {
		redirect("/history");
	}

	// Fetch players from match_players
	const { data: playersData } = await supabase
		.from("match_players")
		.select("*")
		.eq("match_id", matchId);

	// Fetch trades from trades
	const { data: tradesData } = await supabase
		.from("trades")
		.select("*")
		.eq("match_id", matchId)
		.order("executed_at", { ascending: true });

	// Fetch match_candles from Supabase
	const { data: candlesData } = await supabase
		.from("match_candles")
		.select("*")
		.eq("match_id", matchId)
		.order("sequence", { ascending: true });

	// Fetch profiles for the player usernames
	const userIds = [
		matchData.player_one_user_id,
		matchData.player_two_user_id,
	].filter(Boolean) as string[];

	const { data: profilesData } = await supabase
		.from("profiles")
		.select("id, username")
		.in("id", userIds);

	const usernameMap = new Map(
		profilesData?.map((p) => [p.id, p.username]) ?? []
	);

	// Construct the players list using matchData to ensure opponent is not lost due to RLS
	const playerOneId = matchData.player_one_user_id;
	const playerTwoId = matchData.player_two_user_id;

	const playersList = [];
	if (playerOneId) {
		const pData = playersData?.find((p) => p.user_id === playerOneId);
		playersList.push({
			user_id: playerOneId,
			username: usernameMap.get(playerOneId) ?? t("unknown"),
			final_capital: pData && pData.final_capital !== null ? Number(pData.final_capital) : Number(matchData.starting_capital),
			realized_pnl: pData ? Number(pData.realized_pnl ?? 0) : 0,
			is_current_user: playerOneId === user.id,
		});
	}
	if (playerTwoId) {
		const pData = playersData?.find((p) => p.user_id === playerTwoId);
		playersList.push({
			user_id: playerTwoId,
			username: usernameMap.get(playerTwoId) ?? t("unknown"),
			final_capital: pData && pData.final_capital !== null ? Number(pData.final_capital) : Number(matchData.starting_capital),
			realized_pnl: pData ? Number(pData.realized_pnl ?? 0) : 0,
			is_current_user: playerTwoId === user.id,
		});
	}

	const isUserPlayerTwo = playerTwoId === user.id;

	const currentPlayer = (isUserPlayerTwo
		? playersList.find((p) => p.user_id === playerTwoId)
		: playersList.find((p) => p.user_id === playerOneId))
		?? {
		user_id: playerOneId || user.id,
		username: playerOneId ? (usernameMap.get(playerOneId) ?? t("unknown")) : (usernameMap.get(user.id) ?? t("youLabel")),
		final_capital: Number(matchData.starting_capital),
		realized_pnl: 0,
		is_current_user: playerOneId === user.id,
	};

	const opponent = (isUserPlayerTwo
		? playersList.find((p) => p.user_id === playerOneId)
		: playersList.find((p) => p.user_id === playerTwoId))
		?? {
		user_id: playerTwoId || "none",
		username: playerTwoId ? (usernameMap.get(playerTwoId) ?? t("unknown")) : t("noOpponent"),
		final_capital: Number(matchData.starting_capital),
		realized_pnl: 0,
		is_current_user: playerTwoId === user.id,
	};

	// Construct the trades list
	const trades = (tradesData ?? []).map((tradeRow) => ({
		id: tradeRow.id,
		user_id: tradeRow.user_id,
		username: usernameMap.get(tradeRow.user_id) ?? t("unknown"),
		side: tradeRow.side as "long" | "short",
		amount_usdt: Number(tradeRow.amount_usdt),
		execution_price: Number(tradeRow.execution_price),
		executed_at: tradeRow.executed_at,
		candle_sequence: tradeRow.candle_sequence ?? 0,
	}));

	// Construct the candles list
	const candles = (candlesData ?? []).map((c) => ({
		sequence: Number(c.sequence),
		open: Number(c.open),
		high: Number(c.high),
		low: Number(c.low),
		close: Number(c.close),
		open_time: c.open_time,
	}));

	const match = {
		id: matchData.id,
		symbol: matchData.symbol,
		starting_capital: Number(matchData.starting_capital),
		starts_at: matchData.starts_at,
		ends_at: matchData.ends_at,
		final_price: Number(matchData.final_price ?? 0),
		status: matchData.status,
		players: playersList,
		trades,
		candles,
	};

	const userWon = currentPlayer.realized_pnl > opponent.realized_pnl;
	const isDraw = currentPlayer.realized_pnl === opponent.realized_pnl;
	const result = isDraw ? "DRAW" : userWon ? "WIN" : "LOSS";

	const hasCandles = candles.length > 0;
	let chartSvg = null;

	if (hasCandles) {
		const sequences = candles.map((c) => c.sequence);
		const minSequence = Math.min(...sequences, 0);
		const maxSequence = Math.max(...sequences, 1);

		const tradePrices = trades.map((t) => t.execution_price);
		const allPrices = [
			...candles.map((c) => c.low),
			...candles.map((c) => c.high),
			...tradePrices,
		];
		const minPrice = allPrices.length > 0 ? Math.min(...allPrices) : 0;
		const maxPrice = allPrices.length > 0 ? Math.max(...allPrices) : 100;

		const priceRange = maxPrice - minPrice || 1;
		const padPriceMin = minPrice - priceRange * 0.1;
		const padPriceMax = maxPrice + priceRange * 0.1;
		const paddedRange = padPriceMax - padPriceMin;

		const svgWidth = 1000;
		const svgHeight = 320;
		const padLeft = 70;
		const padRight = 30;
		const padTop = 30;
		const padBottom = 30;

		const chartWidth = svgWidth - padLeft - padRight;
		const chartHeight = svgHeight - padTop - padBottom;

		const getX = (seq: number) => {
			const totalSteps = maxSequence - minSequence || 1;
			return padLeft + ((seq - minSequence) / totalSteps) * chartWidth;
		};

		const getY = (price: number) => {
			return padTop + (1 - (price - padPriceMin) / paddedRange) * chartHeight;
		};

		const gridCount = 5;
		const gridLines = Array.from({ length: gridCount }).map((_, i) => {
			const price = padPriceMin + (i / (gridCount - 1)) * paddedRange;
			const y = getY(price);
			return { price, y };
		});

		const candleWidth = Math.max(1.5, (chartWidth / (candles.length || 1)) * 0.6);

		chartSvg = (
			<div className="relative w-full overflow-x-auto">
				<svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full min-w-[700px] h-80" preserveAspectRatio="none">
					{/* Legend */}
					<g transform="translate(80, 15)">
						{/* Legend item 1: You Long */}
						<path d="M 0 -4 L -4 2 L 4 2 Z" fill="#10b981" stroke="#ffffff" strokeWidth="1" />
						<text x="8" y="1" fill="#9aa6b6" fontSize="10" fontFamily="sans-serif">{t("youLong")}</text>

						{/* Legend item 2: You Short */}
						<path transform="translate(75, 0)" d="M 0 4 L -4 -2 L 4 -2 Z" fill="#ef4444" stroke="#ffffff" strokeWidth="1" />
						<text x="83" y="1" fill="#9aa6b6" fontSize="10" fontFamily="sans-serif">{t("youShort")}</text>

						{/* Legend item 3: Opponent Long */}
						<path transform="translate(155, 0)" d="M 0 -4 L -4 2 L 4 2 Z" fill="none" stroke="#34d399" strokeWidth="1.5" />
						<text x="163" y="1" fill="#9aa6b6" fontSize="10" fontFamily="sans-serif">{t("opponentLong")}</text>

						{/* Legend item 4: Opponent Short */}
						<path transform="translate(255, 0)" d="M 0 4 L -4 -2 L 4 -2 Z" fill="none" stroke="#f87171" strokeWidth="1.5" />
						<text x="263" y="1" fill="#9aa6b6" fontSize="10" fontFamily="sans-serif">{t("opponentShort")}</text>
					</g>

					{/* Grid lines */}
					{gridLines.map((line, i) => (
						<g key={i}>
							<line
								x1={padLeft}
								y1={line.y}
								x2={svgWidth - padRight}
								y2={line.y}
								stroke="#ffffff"
								strokeOpacity="0.08"
								strokeDasharray="3 3"
							/>
							<text
								x={padLeft - 8}
								y={line.y + 4}
								fill="#5d6877"
								fontSize="10"
								fontFamily="monospace"
								textAnchor="end"
							>
								${line.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
							</text>
						</g>
					))}

					{/* Candlesticks */}
					{candles.map((c) => {
						const cx = getX(c.sequence);
						const cyOpen = getY(c.open);
						const cyClose = getY(c.close);
						const cyHigh = getY(c.high);
						const cyLow = getY(c.low);
						const isGreen = c.close >= c.open;
						const color = isGreen ? "#10b981" : "#ef4444";

						return (
							<g key={c.sequence}>
								{/* Wick */}
								<line
									x1={cx}
									y1={cyHigh}
									x2={cx}
									y2={cyLow}
									stroke={color}
									strokeWidth="1.5"
								/>
								{/* Body */}
								<rect
									x={cx - candleWidth / 2}
									y={Math.min(cyOpen, cyClose)}
									width={candleWidth}
									height={Math.max(1.2, Math.abs(cyOpen - cyClose))}
									fill={color}
								/>
							</g>
						);
					})}

					{/* Trade markers */}
					{trades.map((trade) => {
						const tx = getX(trade.candle_sequence);
						const ty = getY(trade.execution_price);
						const isCurrentUser = trade.user_id === user.id;
						const isLong = trade.side === "long";

						// Draw path
						let markerPath = "";
						let markerFill = "";
						let markerStroke = "";
						let markerStrokeWidth = "1.5";

						if (isCurrentUser) {
							markerFill = isLong ? "#10b981" : "#ef4444";
							markerStroke = "#ffffff";
							// Triangle pointing up for Long, down for Short
							markerPath = isLong
								? `M ${tx} ${ty - 7} L ${tx - 6} ${ty + 3} L ${tx + 6} ${ty + 3} Z`
								: `M ${tx} ${ty + 7} L ${tx - 6} ${ty - 3} L ${tx + 6} ${ty - 3} Z`;
						} else {
							markerFill = "none";
							markerStroke = isLong ? "#34d399" : "#f87171";
							markerStrokeWidth = "2";
							markerPath = isLong
								? `M ${tx} ${ty - 7} L ${tx - 6} ${ty + 3} L ${tx + 6} ${ty + 3} Z`
								: `M ${tx} ${ty + 7} L ${tx - 6} ${ty - 3} L ${tx + 6} ${ty - 3} Z`;
						}

						return (
							<g key={trade.id}>
								{/* Pulse/Glow behind the trade */}
								<circle
									cx={tx}
									cy={ty}
									r="9"
									fill={isLong ? "#10b981" : "#ef4444"}
									fillOpacity="0.1"
								/>
								<path
									d={markerPath}
									fill={markerFill}
									stroke={markerStroke}
									strokeWidth={markerStrokeWidth}
								>
									<title>{t("tradeTooltip", {
										username: trade.username,
										side: isLong ? t("long") : t("short"),
										amount: trade.amount_usdt.toLocaleString(undefined, { maximumFractionDigits: 0 }),
										price: trade.execution_price.toLocaleString(undefined, { minimumFractionDigits: 2 }),
									})}</title>
								</path>
							</g>
						);
					})}
				</svg>
			</div>
		);
	}

	return (
		<SideNav user={user?.email ?? "Unknown"}>
			<div className="p-6 md:p-8 text-[#eef2f8] max-w-5xl mx-auto">

				{/* BACK BUTTON */}
				<Link
					href="/history"
					className="inline-flex items-center gap-2 text-sm text-[#5d6877] hover:text-[#eef2f8] transition-colors mb-6"
				>
					<ArrowLeft className="w-4 h-4" />
					{t("backToHistory")}
				</Link>

				{/* MATCH RESULT HERO BANNER */}
				<div className={`rounded-[10px] border p-6 mb-6 ${result === "WIN"
					? "border-emerald-500/30 bg-emerald-500/5"
					: result === "LOSS"
						? "border-rose-500/30 bg-rose-500/5"
						: "border-gray-500/30 bg-gray-500/5"
					}`}>
					<div className="flex items-center justify-between flex-wrap gap-4">

						{/* Result label */}
						<div>
							<div className={`text-3xl font-bold mb-1 ${result === "WIN" ? "text-emerald-400" :
								result === "LOSS" ? "text-rose-400" : "text-gray-400"
								}`}>
								{result === "WIN" ? t("victory") : result === "LOSS" ? t("defeat") : t("draw")}
							</div>
							<div className="text-sm text-[#5d6877]">
								{match.symbol} · {formatDuration(match.starts_at, match.ends_at, t)}
							</div>
						</div>

						{/* Both players side by side */}
						<div className="flex items-center gap-4">
							{/* Current user */}
							<div className="text-right">
								<div className="text-sm font-semibold">{currentPlayer.username}</div>
								<div className={`text-xl font-bold font-mono ${getPnLColor(currentPlayer.realized_pnl)}`}>
									${currentPlayer.final_capital.toLocaleString(undefined, { minimumFractionDigits: 2 })}
								</div>
								<div className={`text-xs font-mono ${getPnLColor(currentPlayer.realized_pnl)}`}>
									{formatMoney(currentPlayer.realized_pnl)}
								</div>
							</div>

							{/* VS divider */}
							<div className="flex flex-col items-center">
								<Swords className="w-5 h-5 text-[#5d6877]" />
								<span className="text-[10px] text-[#5d6877] mt-1">{t("vs")}</span>
							</div>

							{/* Opponent */}
							<div className="text-left">
								<div className="text-sm font-semibold">{opponent.username}</div>
								<div className={`text-xl font-bold font-mono ${getPnLColor(opponent.realized_pnl)}`}>
									${opponent.final_capital.toLocaleString(undefined, { minimumFractionDigits: 2 })}
								</div>
								<div className={`text-xs font-mono ${getPnLColor(opponent.realized_pnl)}`}>
									{formatMoney(opponent.realized_pnl)}
								</div>
							</div>
						</div>

						{/* MATCH SUMMARY STATS ROW */}
						<div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
							<div className="rounded-[7px] border border-white/[.07] bg-[#0f131b] p-4">
								<div className="text-[10px] uppercase tracking-wide text-[#5d6877] flex item-center gap-1 mb-1">
									<Clock className="w-3 h-3" /> {t("startTime")}
								</div>
								<div className="text-sm font-semibold">{formatDateTime(match.starts_at, locale)}</div>
							</div>

							<div className="rounded-[7px] border border-white/[.07] bg-[#0f131b] p-4">
								<div className="text-[10px] uppercase tracking-wide text-[#5d6877] flex items-center gap-1 mb-1">
									<Clock className="w-3 h-3" /> {t("endTime")}
								</div>
								<div className="text-sm font-semibold">{formatDateTime(match.ends_at, locale)}</div>
							</div>

							<div className="rounded-[7px] border border-white/[.07] bg-[#0f131b] p-4">
								<div className="text-[10px] uppercase tracking-wide text-[#5d6877] mb-1">{t("duration")}</div>
								<div className="text-sm font-semibold">{formatDuration(match.starts_at, match.ends_at, t)}</div>
							</div>

							<div className="rounded-[7px] border border-white/[.07] bg-[#0f131b] p-4">
								<div className="text-[10px] uppercase tracking-wide text-[#5d6877] mb-1">{t("finalPrice")}</div>
								<div className="text-sm font-semibold font-mono">
									${match.final_price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
								</div>
							</div>
						</div>

						{/* CHART */}
						<div className="rounded-[10px] border border-white/[.07] bg-[#0f131b] p-5 mb-6 w-full">
							<div className="flex items-center gap-2 mb-4">
								<TrendingUp className="w-4 h-4 text-[#4d86ff]" />
								<span className="text-sm font-semibold">{t("matchChart")}</span>
								{hasCandles && (
									<span className="text-[10px] text-[#5d6877] border border-white/[.07] rounded px-2 py-0.5 ml-auto">
										{t("intervals", { count: candles.length, symbol: match.symbol })}
									</span>
								)}
							</div>
							{hasCandles ? (
								chartSvg
							) : (
								<div className="h-48 rounded-md bg-white/[.02] border border-white/[.04] flex items-center justify-center">
									<div className="text-center">
										<TrendingUp className="w-8 h-8 text-[#5d6877] mx-auto mb-2 opacity-40" />
										<p className="text-sm text-[#5d6877]">{t("noCandleData")}</p>
										<p className="text-[10px] text-[#5d6877] mt-1 opacity-60">
											match_id: {match.id}...
										</p>
									</div>
								</div>
							)}
						</div>
					</div>

					{/* TRADE TABLE */}
					<div className="rounded-[10px] border border-white/[.07] bg-[#0f131b] overflow-hidden">
						<div className="px-4 py-3 border-b border-white/[.05] flex item-center gap-2">
							<TrendingUp className="w-4 h-4 text-[#4d86ff]" />
							<span className="text-sm font-semibold"> {t("tradeLog")}</span>
							<span className="text-[10px] text-[#5d6877]  ml-auto">{t("tradesCount", { count: match.trades.length })}</span>
						</div>
						<div className="grid grid-cols-5 px-4 py-2 border-b border-white/[.04]">
							{[t("headerPlayer"), t("headerSide"), t("headerAmount"), t("headerPrice"), t("headerTime")].map((col) => (
								<div key={col} className="text-[10px] uppercase tracking-wide text-[#5d6877]">
									{col}
								</div>
							))}
						</div>
						<div className="divide-y divide-white/[.03]">
							{match.trades.map((trade) => (
								<div key={trade.id} className="grid grid-cols-5 px-4 py-3 hover:bg-white/[.02] transition-colors">
									<div className="text-sm font-semibold truncate">
										{trade.username}
										{trade.user_id === user?.id && (
											<span className="ml-1.5 text-[9px] text-[#4d86ff] border border-[#4d86ff]/30 rounded px-1 py-0.5">
												{t("you")}
											</span>
										)}
									</div>
									<div className="flex items-center gap-1">
										{trade.side === "long" ? (
											<TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
										) : (
											<TrendingDown className="w-3.5 h-3.5 text-rose-400" />
										)}
										<span className={`text-sm font-semibold ${trade.side === "long" ? "text-emerald-400" : "text-rose-400"
											}`}>
											{trade.side === "long" ? t("long") : t("short")}
										</span>
									</div>
									<div className="text-sm font-mono">
										${trade.amount_usdt.toLocaleString(undefined, { minimumFractionDigits: 2 })}
									</div>
									<div className="text-[11px] text-[#5d6877]">
										{new Date(trade.executed_at).toLocaleTimeString(dateLocaleFromAppLocale(locale), {
											hour: "2-digit",
											minute: "2-digit",
											second: "2-digit",
										})}
									</div>
								</div>
							))}
						</div>
					</div>
				</div>
			</div>
		</SideNav>
	);

}

