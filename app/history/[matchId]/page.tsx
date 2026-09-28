import { SideNav } from "@/app/components/duel/side-nav";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { TrendingUp, TrendingDown, ArrowLeft, Swords } from "lucide-react";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { formatMoney, formatDuration } from "../format";
import { CandlestickChart } from "../candlestick-chart";
import { pnlTone } from "@/app/components/duel/format";
import { LocalDateTime } from "../local-date-time";
import { MatchTabs } from "../match-tabs";

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

	const columns = [t("headerPlayer"), t("headerSide"), t("headerAmount"), t("headerPrice"), t("headerTime")];

	const resultText = result === "WIN" ? t("victory") : result === "LOSS" ? t("defeat") : t("draw");
	const resultColor = result === "WIN" ? "text-emerald-400" : result === "LOSS" ? "text-rose-400" : "text-gray-400";

	// --- Chart panel ---
	const chartPanel = (
		<div className="rounded-[10px] border border-white/[.07] bg-[#0f131b] p-3 md:p-5 w-full min-w-0 flex flex-col flex-1 min-h-0 md:flex-none">
			<div className="shrink-0 flex items-center gap-2 mb-2 md:mb-4">
				<TrendingUp className="w-4 h-4 text-[#4d86ff] shrink-0" />
				<span className="text-sm font-semibold">{t("matchChart")}</span>
				{hasCandles && (
					<span className="text-[10px] text-[#5d6877] border border-white/[.07] rounded px-2 py-0.5 ml-auto shrink-0">
						{t("intervals", { count: candles.length, symbol: match.symbol })}
					</span>
				)}
			</div>
			{hasCandles ? (
				<CandlestickChart
					fill
					candles={candles}
					trades={trades}
					currentUserId={currentPlayer.user_id}
					t={t}
				/>
			) : (
				<div className="flex-1 min-h-[120px] md:flex-none md:h-48 rounded-md bg-white/[.02] border border-white/[.04] flex items-center justify-center">
					<div className="text-center">
						<TrendingUp className="w-8 h-8 text-[#5d6877] mx-auto mb-2 opacity-40" />
						<p className="text-sm text-[#5d6877]">{t("noCandleData")}</p>
					</div>
				</div>
			)}
		</div>
	);

	// --- Trade log panel ---
	const tradesPanel = (
		<div className="rounded-[10px] border border-white/[.07] bg-[#0f131b] overflow-hidden flex flex-col flex-1 min-h-0 md:flex-none">
			<div className="shrink-0 px-4 py-3 border-b border-white/[.05] flex items-center gap-2">
				<TrendingUp className="w-4 h-4 text-[#4d86ff]" />
				<span className="text-sm font-semibold">{t("tradeLog")}</span>
				<span className="text-[10px] text-[#5d6877] ml-auto">{t("tradesCount", { count: match.trades.length })}</span>
			</div>

			{/* Column headers: desktop only */}
			<div className="hidden md:grid grid-cols-5 px-4 py-2 border-b border-white/[.04]">
				{columns.map((col) => (
					<div key={col} className="text-[10px] uppercase tracking-wide text-[#5d6877]">
						{col}
					</div>
				))}
			</div>

			{/* On mobile the list fills the space left on screen and scrolls inside its own box */}
			<div className="divide-y divide-white/[.03] flex-1 min-h-0 overflow-y-auto overscroll-contain md:flex-none md:overflow-visible">
				{match.trades.map((trade) => {
					const isLong = trade.side === "long";
					const youBadge = trade.user_id === user?.id && (
						<span className="ml-1.5 text-[9px] text-[#4d86ff] border border-[#4d86ff]/30 rounded px-1 py-0.5">
							{t("you")}
						</span>
					);
					const sideEl = (
						<div className="flex items-center gap-1 shrink-0">
							{isLong ? (
								<TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
							) : (
								<TrendingDown className="w-3.5 h-3.5 text-rose-400" />
							)}
							<span className={`text-sm font-semibold ${isLong ? "text-emerald-400" : "text-rose-400"}`}>
								{isLong ? t("long") : t("short")}
							</span>
						</div>
					);
					const amount = `$${trade.amount_usdt.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
					const price = `$${trade.execution_price.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

					return (
						<div key={trade.id} className="hover:bg-white/[.02] transition-colors">
							{/* Mobile: compact two-line card */}
							<div className="md:hidden px-4 py-2.5 space-y-1.5">
								<div className="flex items-center justify-between gap-3">
									<div className="text-sm font-semibold truncate min-w-0">
										{trade.username}
										{youBadge}
									</div>
									{sideEl}
								</div>
								<div className="grid grid-cols-3 gap-2">
									<div className="min-w-0">
										<div className="text-[10px] uppercase tracking-wide text-[#5d6877]">{t("headerAmount")}</div>
										<div className="text-xs font-mono truncate">{amount}</div>
									</div>
									<div className="min-w-0">
										<div className="text-[10px] uppercase tracking-wide text-[#5d6877]">{t("headerPrice")}</div>
										<div className="text-xs font-mono text-[#9aa6b6] truncate">{price}</div>
									</div>
									<div className="min-w-0">
										<div className="text-[10px] uppercase tracking-wide text-[#5d6877]">{t("headerTime")}</div>
										<div className="text-xs text-[#9aa6b6] truncate">
											<LocalDateTime iso={trade.executed_at} locale={locale} mode="time" />
										</div>
									</div>
								</div>
							</div>

							{/* Desktop: 5-column row */}
							<div className="hidden md:grid grid-cols-5 px-4 py-3">
								<div className="text-sm font-semibold truncate">
									{trade.username}
									{youBadge}
								</div>
								{sideEl}
								<div className="text-sm font-mono">{amount}</div>
								<div className="text-sm font-mono text-[#9aa6b6]">{price}</div>
								<div className="text-[11px] text-[#5d6877]">
									<LocalDateTime iso={trade.executed_at} locale={locale} mode="time" />
								</div>
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);

	return (
		<SideNav>
			{/* Mobile: exactly one screen tall, nothing on the page scrolls.
			    md and up: normal page flow. If SideNav adds a top or bottom bar on mobile,
			    swap 100dvh for calc(100dvh - <bar height>). */}
			<div className="flex flex-col gap-3 md:gap-6 p-4 md:p-8 h-[100dvh] md:h-auto overflow-hidden md:overflow-visible text-[#eef2f8] w-full max-w-5xl mx-auto min-w-0">

				{/* BACK BUTTON */}
				<Link
					href="/history"
					className="shrink-0 self-start inline-flex items-center gap-1.5 text-sm text-[#5d6877] hover:text-[#eef2f8] transition-colors"
				>
					<ArrowLeft className="w-4 h-4" />
					{t("backToHistory")}
				</Link>

				{/* MATCH RESULT HERO */}
				<div className={`shrink-0 rounded-[10px] border p-3 md:p-6 ${result === "WIN"
					? "border-emerald-500/30 bg-emerald-500/5"
					: result === "LOSS"
						? "border-rose-500/30 bg-rose-500/5"
						: "border-gray-500/30 bg-gray-500/5"
					}`}>
					<div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 md:gap-4">

						{/* Result label: one row on mobile */}
						<div className="flex items-baseline justify-between gap-3 md:block">
							<div className={`text-xl md:text-3xl font-bold md:mb-1 ${resultColor}`}>{resultText}</div>
							<div className="text-xs md:text-sm text-[#5d6877] truncate">
								{match.symbol} · {formatDuration(match.starts_at, match.ends_at, t)}
							</div>
						</div>

						{/* Both players side by side */}
						<div className="flex items-start md:items-center justify-center gap-3 md:gap-4 min-w-0">
							<div className="text-right min-w-0 flex-1 md:flex-none">
								<div className="text-sm font-semibold truncate">{currentPlayer.username}</div>
								<div className={`text-base md:text-xl font-bold font-mono ${pnlTone(currentPlayer.realized_pnl)}`}>
									${currentPlayer.final_capital.toLocaleString(undefined, { minimumFractionDigits: 2 })}
								</div>
								<div className={`text-xs font-mono ${pnlTone(currentPlayer.realized_pnl)}`}>
									{formatMoney(currentPlayer.realized_pnl)}
								</div>
							</div>

							<div className="flex flex-col items-center shrink-0">
								<Swords className="w-5 h-5 text-[#5d6877]" />
								<span className="text-[10px] text-[#5d6877] mt-0.5">{t("vs")}</span>
							</div>

							<div className="text-left min-w-0 flex-1 md:flex-none">
								<div className="text-sm font-semibold truncate">{opponent.username}</div>
								<div className={`text-base md:text-xl font-bold font-mono ${pnlTone(opponent.realized_pnl)}`}>
									${opponent.final_capital.toLocaleString(undefined, { minimumFractionDigits: 2 })}
								</div>
								<div className={`text-xs font-mono ${pnlTone(opponent.realized_pnl)}`}>
									{formatMoney(opponent.realized_pnl)}
								</div>
							</div>
						</div>
					</div>
				</div>

				{/* MATCH SUMMARY: same boxes as page1's expanded match panel. 2x2 on mobile, 4 across on desktop */}
				<div className="shrink-0 grid grid-cols-2 md:grid-cols-4 gap-3">
					<div className="min-w-0 rounded-[10px] border border-white/[.07] bg-[#090b11] p-4">
						<div className="text-[11px] uppercase tracking-wide text-[#5d6877] mb-2 truncate">{t("startTime")}</div>
						<div className="text-[13px] md:text-base font-semibold break-words"><LocalDateTime iso={match.starts_at} locale={locale} /></div>
					</div>
					<div className="min-w-0 rounded-[10px] border border-white/[.07] bg-[#090b11] p-4">
						<div className="text-[11px] uppercase tracking-wide text-[#5d6877] mb-2 truncate">{t("endTime")}</div>
						<div className="text-[13px] md:text-base font-semibold break-words"><LocalDateTime iso={match.ends_at} locale={locale} /></div>
					</div>
					<div className="min-w-0 rounded-[10px] border border-white/[.07] bg-[#090b11] p-4">
						<div className="text-[11px] uppercase tracking-wide text-[#5d6877] mb-2 truncate">{t("duration")}</div>
						<div className="text-[13px] md:text-base font-semibold">{formatDuration(match.starts_at, match.ends_at, t)}</div>
					</div>
					<div className="min-w-0 rounded-[10px] border border-white/[.07] bg-[#090b11] p-4">
						<div className="text-[11px] uppercase tracking-wide text-[#5d6877] mb-2 truncate">{t("finalPrice")}</div>
						<div className="text-[13px] md:text-base font-semibold font-mono truncate">${match.final_price.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
					</div>
				</div>

				{/* CHART + TRADE LOG: tabs on mobile, stacked on desktop. Takes all remaining height. */}
				<MatchTabs
					chartLabel={t("matchChart")}
					tradesLabel={t("tradeLog")}
					tradesCount={match.trades.length}
					chart={chartPanel}
					trades={tradesPanel}
				/>
			</div>
		</SideNav>
	);
}