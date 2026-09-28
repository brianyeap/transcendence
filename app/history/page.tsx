"use client";

import Link from "next/link";
import { useEffect, useState, useMemo, useRef } from "react";
import { SideNav } from "../components/duel/side-nav";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useTranslations, useLocale } from "next-intl";
import {
	TrendingUp,
	TrendingDown,
	Trophy,
	Target,
	Clock,
	Flame,
	Swords,
	Activity,
	ChevronLeft,
	ChevronRight,
	ChevronDown,
	Loader2,
} from "lucide-react";
import { formatMoney, formatDuration, dateLocaleFromAppLocale, formatDateTime, formatPct } from "./format";
import { CandlestickChart } from "./candlestick-chart";
import { pnlTone } from "@/app/components/duel/format";

const PAGE_SIZE = 10;

// --- Reusable UI Helpers ---
function getResultColor(result: string) { return result === "WIN" ? "text-emerald-400" : result === "LOSS" ? "text-rose-400" : "text-gray-400"; }
function getResultGlow(result: string) {
	if (result === "WIN") return "shadow-[inset_3px_0_0_0_#34d399] hover:shadow-[inset_3px_0_0_0_#34d399,0_0_20px_-5px_rgba(52,211,153,0.3)]";
	if (result === "LOSS") return "shadow-[inset_3px_0_0_0_#fb7185] hover:shadow-[inset_3px_0_0_0_#fb7185,0_0_20px_-5px_rgba(251,113,133,0.3)]";
	return "shadow-[inset_3px_0_0_0_#6b7280] hover:shadow-[inset_3px_0_0_0_#6b7280,0_0_20px_-5px_rgba(107,114,128,0.2)]";
}
function getResultBadgeStyle(result: string) {
	if (result === "WIN") return "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-[0_0_10px_-3px_rgba(52,211,153,0.4)]";
	if (result === "LOSS") return "bg-rose-500/10 text-rose-400 border border-rose-500/30 shadow-[0_0_10px_-3px_rgba(251,113,133,0.4)]";
	return "bg-gray-500/10 text-gray-400 border border-gray-500/30";
}
function getRelativeTime(dateString: string, t: any): string {
	const date = new Date(dateString); const now = new Date(); const diffMs = now.getTime() - date.getTime();
	const diffSecs = Math.floor(diffMs / 1000); const diffMins = Math.floor(diffSecs / 60); const diffHours = Math.floor(diffMins / 60); const diffDays = Math.floor(diffHours / 24);
	if (diffSecs < 60) return t("justNow"); if (diffMins < 60) return t("minutesAgo", { count: diffMins }); if (diffHours < 24) return t("hoursAgo", { count: diffHours });
	if (diffDays < 7) return t("daysAgo", { count: diffDays }); if (diffDays < 30) return t("weeksAgo", { count: Math.floor(diffDays / 7) });
	if (diffDays < 365) return t("monthsAgo", { count: Math.floor(diffDays / 30) }); return t("yearsAgo", { count: Math.floor(diffDays / 365) });
}
function CumulativeChart({ data }: { data: { value: number; result: string }[] }) {
	if (data.length === 0) return null;
	const width = 800, height = 160, padX = 16, padY = 24;
	const values = data.map((d) => d.value); const min = Math.min(...values, 0); const max = Math.max(...values, 0); const range = max - min || 1;
	const points = data.map((d, i) => ({ x: padX + (i / Math.max(data.length - 1, 1)) * (width - padX * 2), y: padY + (1 - (d.value - min) / range) * (height - padY * 2), value: d.value, result: d.result }));
	const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
	const areaD = `${pathD} L ${points[points.length - 1].x} ${height - padY} L ${points[0].x} ${height - padY} Z`;
	const finalValue = data[data.length - 1].value; const isPositive = finalValue >= 0; const stroke = isPositive ? "#34d399" : "#fb7185"; const gradId = isPositive ? "gradPos" : "gradNeg";
	const zeroY = padY + (1 - (0 - min) / range) * (height - padY * 2);
	return (
		<div className="relative w-full">
			<svg viewBox={`0 0 ${width} ${height}`} className="w-full h-32 md:h-40" preserveAspectRatio="none">
				<defs><linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={stroke} stopOpacity="0.35" /><stop offset="100%" stopColor={stroke} stopOpacity="0" /></linearGradient></defs>
				{[0.25, 0.5, 0.75].map((t) => (<line key={t} x1={padX} x2={width - padX} y1={padY + t * (height - padY * 2)} y2={padY + t * (height - padY * 2)} stroke="#ffffff" strokeOpacity="0.04" strokeDasharray="2 4" vectorEffect="non-scaling-stroke" />))}
				<line x1={padX} x2={width - padX} y1={zeroY} y2={zeroY} stroke="#ffffff" strokeOpacity="0.1" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />
				<path d={areaD} fill={`url(#${gradId})`} /><path d={pathD} fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
							</svg>
		</div>
	);
}

type StatCardProps = { label: string; value: string; sub?: string; icon: React.ReactNode; accent?: "emerald" | "rose" | "blue" | "gray" | "amber"; };
function StatCard({ label, value, sub, icon, accent = "blue" }: StatCardProps) {
	const accentMap = { emerald: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20", rose: "text-rose-400 bg-rose-500/10 border-rose-500/20", blue: "text-blue-400 bg-blue-500/10 border-blue-500/20", gray: "text-gray-400 bg-gray-500/10 border-gray-500/20", amber: "text-amber-400 bg-amber-500/10 border-amber-500/20" };
	return (
		<div className="relative min-w-0 rounded-[10px] border border-white/[.07] bg-[#0f131b] p-3 md:p-4 overflow-hidden group hover:border-white/[.14] transition-all">
			<div className="absolute -top-10 -right-10 w-24 h-24 rounded-full bg-gradient-to-br from-white/[.03] to-transparent blur-2xl group-hover:from-white/[.06] transition-all" />
			<div className="flex items-center justify-between mb-3"><span className="text-[10px] uppercase tracking-wider text-[#5d6877] font-medium truncate pr-2">{label}</span><div className={`w-7 h-7 rounded-md border flex items-center justify-center shrink-0 ${accentMap[accent]}`}>{icon}</div></div>
			<div className="text-lg md:text-xl font-bold text-[#eef2f8] tracking-tight truncate">{value}</div>{sub && <div className="text-[11px] text-[#5d6877] mt-1 truncate">{sub}</div>}
		</div>
	);
}

// --- Main Page Component ---
export default function HistoryPage() {
	const supabase = createSupabaseBrowserClient();
	const t = useTranslations("History");
	const tDetail = useTranslations("HistoryDetail");
	const locale = useLocale();

	const [matchHistory, setMatchHistory] = useState<any[]>([]);
	const [loading, setLoading] = useState(true);
	const [pageLoading, setPageLoading] = useState(false);
	const [page, setPage] = useState(0);
	const [totalCount, setTotalCount] = useState<number | null>(null);
	const [filter, setFilter] = useState<"ALL" | "WIN" | "LOSS" | "DRAW">("ALL");

	const [isEditingPage, setIsEditingPage] = useState(false);
	const [inputPage, setInputPage] = useState("");
	const [pageError, setPageError] = useState<string | null>(null);

	const pageCacheRef = useRef<Record<number, any[]>>({});
	const fetchingPageRef = useRef<number | null>(null);
	const userRef = useRef<any>(null);

	// Multi-match expansion support via Set and dictionary maps
	const [expandedMatchIds, setExpandedMatchIds] = useState<Set<string>>(new Set());
	const [matchDetailsMap, setMatchDetailsMap] = useState<Record<string, any>>({});
	const [loadingDetailsMap, setLoadingDetailsMap] = useState<Record<string, boolean>>({});
	const [detailsErrorMap, setDetailsErrorMap] = useState<Record<string, string | null>>({});

	useEffect(() => { loadHistory(0); }, []);

	async function loadHistory(targetPage: number = 0) {
		if (pageCacheRef.current[targetPage]) {
			setMatchHistory(pageCacheRef.current[targetPage]);
			setPage(targetPage);
			setExpandedMatchIds(new Set());
			return;
		}

		if (fetchingPageRef.current !== null) return;
		fetchingPageRef.current = targetPage;

		if (targetPage === 0 && !userRef.current) {
			setLoading(true);
		} else {
			setPageLoading(true);
		}

		try {
			let user = userRef.current;
			if (!user) {
				const { data: { user: authUser } } = await supabase.auth.getUser();
				user = authUser;
				userRef.current = authUser;
			}
			if (!user) {
				return;
			}

			const from = targetPage * PAGE_SIZE;
			const to = from + PAGE_SIZE - 1;

			const { data: matches, count } = await supabase
				.from("matches")
				.select("*", { count: "exact" })
				.or(`player_one_user_id.eq.${user.id},player_two_user_id.eq.${user.id}`)
				.eq("status", "completed")
				.order("ends_at", { ascending: false })
				.range(from, to);

			if (count !== null && count !== undefined) {
				setTotalCount(count);
			}

			if (!matches || matches.length === 0) {
				pageCacheRef.current[targetPage] = [];
				setMatchHistory([]);
				setPage(targetPage);
				setExpandedMatchIds(new Set());
				return;
			}

			const matchIds = matches.map((m) => m.id);
			const { data: playerStats } = await supabase.from("match_players").select("*").in("match_id", matchIds);
			const userIds = [...new Set(matches.flatMap((m) => [m.player_one_user_id, m.player_two_user_id]))];
			const { data: profiles } = await supabase.from("profiles").select("id, username").in("id", userIds);
			const usernameMap = new Map(profiles?.map((p) => [p.id, p.username]) ?? []);

			const history = matches.map((match) => {
				const myStats = playerStats?.find((p) => p.match_id === match.id && p.user_id === user.id);
				const opponentId = match.player_one_user_id === user.id ? match.player_two_user_id : match.player_one_user_id;
				let result: "WIN" | "LOSS" | "DRAW" = match.winner_user_id === null ? "DRAW" : match.winner_user_id === user.id ? "WIN" : "LOSS";
				return {
					id: match.id,
					// Keep null here and translate the fallback at render time so cached pages follow locale changes
					opponent: usernameMap.get(opponentId) ?? null,
					result,
					symbol: match.symbol,
					starting_capital: Number(match.starting_capital),
					final_capital: Number(myStats?.final_capital ?? 0),
					realized_pnl: Number(myStats?.realized_pnl ?? 0),
					starts_at: match.starts_at,
					ends_at: match.ends_at,
				};
			});

			pageCacheRef.current[targetPage] = history;
			setMatchHistory(history);
			setPage(targetPage);
			setExpandedMatchIds(new Set());
		} catch (error) {
			console.error("Failed to load match history:", error);
		} finally {
			setLoading(false);
			setPageLoading(false);
			fetchingPageRef.current = null;
		}
	}

	// Lazy load function for individual match details by ID
	async function loadMatchDetails(matchId: string) {
		if (matchDetailsMap[matchId] || loadingDetailsMap[matchId]) return;

		setLoadingDetailsMap((prev) => ({ ...prev, [matchId]: true }));
		setDetailsErrorMap((prev) => ({ ...prev, [matchId]: null }));

		try {
			const { data: { user } } = await supabase.auth.getUser();
			if (!user) {
				setDetailsErrorMap((prev) => ({ ...prev, [matchId]: "auth" }));
				return;
			}

			const { data: matchData, error: matchError } = await supabase.from("matches").select("*").eq("id", matchId).single();
			if (matchError || !matchData) {
				setDetailsErrorMap((prev) => ({ ...prev, [matchId]: "noData" }));
				return;
			}

			const { data: playersData } = await supabase.from("match_players").select("*").eq("match_id", matchId);
			const { data: tradesData } = await supabase.from("trades").select("*").eq("match_id", matchId).order("executed_at", { ascending: true });
			const { data: candlesData } = await supabase.from("match_candles").select("*").eq("match_id", matchId).order("sequence", { ascending: true });

			const userIds = [matchData.player_one_user_id, matchData.player_two_user_id].filter(Boolean) as string[];
			const { data: profilesData } = await supabase.from("profiles").select("id, username").in("id", userIds);
			const usernameMap = new Map(profilesData?.map((p) => [p.id, p.username]) ?? []);

			const buildPlayer = (pid: string) => {
				const pData = playersData?.find((p) => p.user_id === pid);
				return {
					user_id: pid,
					// Null falls through to tDetail("unknown") at render time
					username: usernameMap.get(pid) ?? null,
					final_capital: Number(pData?.final_capital ?? matchData.starting_capital ?? 0),
					realized_pnl: Number(pData?.realized_pnl ?? 0),
					is_current_user: pid === user.id,
				};
			};

			const myId = user.id;
			const opponentId = [matchData.player_one_user_id, matchData.player_two_user_id].find((pid) => pid && pid !== myId) ?? null;

			const currentPlayer = [matchData.player_one_user_id, matchData.player_two_user_id].includes(myId) ? buildPlayer(myId) : null;
			const opponent = opponentId ? buildPlayer(opponentId) : null;

			const trades = (tradesData ?? []).map((tr) => ({
				...tr,
				amount_usdt: Number(tr.amount_usdt),
				execution_price: Number(tr.execution_price),
				username: usernameMap.get(tr.user_id) ?? tDetail("unknown"),
			}));
			const candles = (candlesData ?? []).map((c) => ({
				...c,
				open: Number(c.open),
				high: Number(c.high),
				low: Number(c.low),
				close: Number(c.close),
			}));

			setMatchDetailsMap((prev) => ({
				...prev,
				[matchId]: { match: matchData, currentPlayer, opponent, trades, candles, currentUserId: user.id },
			}));
		} catch {
			setDetailsErrorMap((prev) => ({ ...prev, [matchId]: "noData" }));
		} finally {
			setLoadingDetailsMap((prev) => ({ ...prev, [matchId]: false }));
		}
	}

	const handleMatchClick = (matchId: string) => {
		setExpandedMatchIds((prev) => {
			const next = new Set(prev);
			if (next.has(matchId)) {
				next.delete(matchId);
			} else {
				next.add(matchId);
				loadMatchDetails(matchId);
			}
			return next;
		});
	};

	const stats = useMemo(() => {
		const wins = matchHistory.filter((m) => m.result === "WIN").length;
		const losses = matchHistory.filter((m) => m.result === "LOSS").length;
		const draws = matchHistory.filter((m) => m.result === "DRAW").length;
		const totalPnl = matchHistory.reduce((sum, m) => sum + m.realized_pnl, 0);
		const winRate = matchHistory.length > 0 ? (wins / matchHistory.length) * 100 : 0;
		const bestTrade = matchHistory.length > 0 ? Math.max(...matchHistory.map((m) => m.realized_pnl)) : 0;
		const worstTrade = matchHistory.length > 0 ? Math.min(...matchHistory.map((m) => m.realized_pnl)) : 0;
		let streak = 0, streakType = "";
		for (const match of matchHistory) { if (streak === 0) { streakType = match.result; streak = 1; } else if (match.result === streakType) { streak++; } else { break; } }
		return { wins, losses, draws, totalPnl, winRate, bestTrade, worstTrade, streak, streakType };
	}, [matchHistory]);

	const cumulativeData = useMemo(() => { let cumulative = 0; return [...matchHistory].reverse().map((match) => { cumulative += match.realized_pnl; return { value: cumulative, result: match.result }; }); }, [matchHistory]);
	const filteredMatches = filter === "ALL" ? matchHistory : matchHistory.filter((m) => m.result === filter);

	const totalPages = totalCount !== null ? Math.max(1, Math.ceil(totalCount / PAGE_SIZE)) : 1;
	const hasNextPage = totalCount !== null ? (page + 1) * PAGE_SIZE < totalCount : matchHistory.length === PAGE_SIZE;

	const handleNextPage = () => {
		if (pageLoading || fetchingPageRef.current !== null || !hasNextPage) return;
		setIsEditingPage(false);
		setPageError(null);
		loadHistory(page + 1);
	};

	const handlePrevPage = () => {
		if (pageLoading || fetchingPageRef.current !== null || page <= 0) return;
		setIsEditingPage(false);
		setPageError(null);
		loadHistory(page - 1);
	};

	const handleJumpToPage = () => {
		if (pageLoading || fetchingPageRef.current !== null) return;
		const trimmed = inputPage.trim();
		const num = Number(trimmed);
		if (!trimmed || !/^\d+$/.test(trimmed) || !Number.isInteger(num) || num < 1 || num > totalPages) {
			setPageError(totalPages > 1 ? t("invalidPageRange", { totalPages }) : t("invalidPageSingle"));
			return;
		}

		setPageError(null);
		setIsEditingPage(false);
		const targetPageIndex = num - 1;
		if (targetPageIndex !== page) {
			loadHistory(targetPageIndex);
		}
	};

	const filters: { key: "ALL" | "WIN" | "LOSS" | "DRAW"; label: string; count: number }[] = [
		{ key: "ALL", label: t("filterAll"), count: matchHistory.length }, { key: "WIN", label: t("filterWins"), count: stats.wins },
		{ key: "LOSS", label: t("filterLosses"), count: stats.losses }, { key: "DRAW", label: t("filterDraws"), count: stats.draws },
	];

	if (loading) return (<SideNav><div className="flex min-h-screen bg-[#090b11]"><div className="flex-1 flex items-center justify-center p-8 text-white font-medium tracking-wide"><div className="animate-pulse">{t("loadingHistory")}</div></div></div></SideNav>);

	return (
		<SideNav>
			<div className="relative min-h-screen overflow-x-clip">
				<div className="pointer-events-none absolute inset-0 overflow-hidden">
					<div className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full bg-blue-600/[.07] blur-3xl" />
					<div className="absolute top-1/3 -left-40 w-[400px] h-[400px] rounded-full bg-emerald-600/[.05] blur-3xl" />
				</div>

				<div className="relative p-4 md:p-8 text-[#eef2f8] max-w-6xl mx-auto min-w-0">
					<div className="mb-6 md:mb-8 flex items-end justify-between flex-wrap gap-4">
						<div>
							<div className="flex items-center gap-2 mb-2"><div className="w-1 h-6 rounded-full bg-gradient-to-b from-blue-400 to-emerald-400" /><span className="text-[11px] uppercase tracking-[0.2em] text-[#5d6877] font-medium">{t("performance")}</span></div>
							<h1 className="text-2xl md:text-3xl font-bold tracking-tight bg-gradient-to-r from-[#eef2f8] to-[#8a95a8] bg-clip-text text-transparent">{t("title")}</h1>
							<p className="text-sm text-[#5d6877] mt-1.5">{t("subtitle")}</p>
						</div>
					</div>

					<div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
						<StatCard label={t("totalPnl")} value={formatMoney(stats.totalPnl)} sub={t("matchesPlayed", { count: matchHistory.length })} icon={<Activity className="w-3.5 h-3.5" />} accent={stats.totalPnl >= 0 ? "emerald" : "rose"} />
						<StatCard label={t("winRate")} value={`${stats.winRate.toFixed(1)}%`} sub={t("winsLossesDraws", { wins: stats.wins, losses: stats.losses, draws: stats.draws })} icon={<Target className="w-3.5 h-3.5" />} accent={stats.winRate >= 50 ? "emerald" : "rose"} />
						<StatCard label={t("currentStreak")} value={`${stats.streak} ${stats.streakType === "WIN" ? t("winPlural") : stats.streakType === "LOSS" ? t("lossPlural") : t("drawPlural")}`} sub={stats.streak >= 3 ? t("onFire") : t("keepPushing")} icon={<Flame className="w-3.5 h-3.5" />} accent={stats.streakType === "WIN" ? "amber" : stats.streakType === "LOSS" ? "rose" : "gray"} />
						<StatCard label={t("bestTrade")} value={formatMoney(stats.bestTrade)} sub={t("worstTradeSub", { worst: formatMoney(stats.worstTrade) })} icon={<Trophy className="w-3.5 h-3.5" />} accent="blue" />
					</div>

					{/* PINNED CUMULATIVE PNL CHART */}
					<div className="rounded-[10px] border border-white/[.07] bg-[#0f131b] p-3 md:p-5 mb-6">
						<div className="flex items-center justify-between mb-4">
							<div className="flex items-center gap-2">
								<TrendingUp className="w-4 h-4 text-blue-400" />
								<span className="text-sm font-semibold">{t("cumulativePnl")}</span>
							</div>
							<div className={`text-sm font-bold ${stats.totalPnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
								{formatMoney(stats.totalPnl)}
							</div>
						</div>
						<CumulativeChart data={cumulativeData} />
					</div>

					<div className="flex items-center gap-1 mb-4 p-1 rounded-lg bg-[#0f131b] border border-white/[.07] w-full sm:w-fit overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
						{filters.map((f) => (
							<button key={f.key} onClick={() => setFilter(f.key)} className={`flex-1 sm:flex-none shrink-0 justify-center whitespace-nowrap px-2.5 sm:px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${filter === f.key ? "bg-white/[.08] text-[#eef2f8] shadow-sm" : "text-[#5d6877] hover:text-[#eef2f8]"}`}>
								{f.label}<span className={`text-[10px] px-1.5 py-0.5 rounded-full ${filter === f.key ? "bg-white/[.08]" : "bg-white/[.04]"}`}>{f.count}</span>
							</button>
						))}
					</div>

					<div className={`flex flex-col gap-2.5 transition-opacity duration-150 ${pageLoading ? "opacity-60 pointer-events-none" : "opacity-100"}`}>
						{filteredMatches.length === 0 ? (
							<div className="rounded-[10px] border border-white/[.07] bg-[#0f131b] p-12 text-center"><Swords className="w-8 h-8 text-[#5d6877] mx-auto mb-3" /><p className="text-sm text-[#5d6877]">{t("noMatchesFilter")}</p></div>
						) : (
							filteredMatches.map((match) => {
								const isExpanded = expandedMatchIds.has(match.id);
								const matchDetails = matchDetailsMap[match.id];
								const loadingDetails = loadingDetailsMap[match.id];
								const detailsError = detailsErrorMap[match.id];

								return (
									<div key={match.id} className="block w-full">
										{/* Main Match Row */}
										<div
											onClick={() => handleMatchClick(match.id)}
											className={`group relative rounded-[10px] border border-white/[.07] bg-[#0f131b] p-4 transition-all duration-200 hover:border-white/[.14] hover:-translate-y-[1px] cursor-pointer ${getResultGlow(match.result)} ${isExpanded ? 'rounded-b-none border-b-0' : ''}`}
										>
											<div className="flex items-center justify-between gap-3 md:gap-4">
												<div className="flex items-center gap-3 min-w-0">
													<div className={`w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${getResultBadgeStyle(match.result)}`}>
														{match.result === "WIN" ? <TrendingUp className="w-4 h-4" /> : match.result === "LOSS" ? <TrendingDown className="w-4 h-4" /> : <span>—</span>}
													</div>
													<div className="min-w-0">
														<div className="flex items-center gap-1.5"><span className="text-[10px] uppercase tracking-wider text-[#5d6877]">{t("vs")}</span><span className="text-sm font-semibold truncate">{match.opponent}</span></div>
														<div className="flex items-center gap-2 mt-0.5 text-[11px] text-[#5d6877] min-w-0"><span className="font-mono shrink-0">{match.symbol}</span><span className="opacity-40 shrink-0">•</span><span className="truncate">{getRelativeTime(match.starts_at, t)}</span></div>
													</div>
												</div>
												<div className="flex items-center gap-2 md:gap-6 shrink-0">
													<div className="hidden md:flex items-center gap-6">
														<div className="text-right"><div className="text-[10px] uppercase tracking-wider text-[#5d6877]">{t("final")}</div><div className="text-sm font-semibold font-mono mt-0.5">${match.final_capital.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div></div>
														<div className="text-right"><div className="text-[10px] uppercase tracking-wider text-[#5d6877]">{t("netPnl")}</div><div className={`text-sm font-bold mt-0.5 font-mono ${getResultColor(match.result)}`}>{formatMoney(match.realized_pnl)}</div><div className={`text-[10px] font-mono ${getResultColor(match.result)} opacity-70`}>{formatPct(match.realized_pnl, match.starting_capital)}</div></div>
														<div className="text-right"><div className="text-[10px] uppercase tracking-wider text-[#5d6877]">{t("duration")}</div><div className="text-sm font-semibold mt-0.5 flex items-center gap-1 justify-end"><Clock className="w-3 h-3 text-[#5d6877]" />{formatDuration(match.starts_at, match.ends_at, t)}</div></div>
													</div>
													{isExpanded ? <ChevronDown className="w-4 h-4 text-[#5d6877] transition-all shrink-0" /> : <ChevronRight className="w-4 h-4 text-[#5d6877] opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all shrink-0" />}
												</div>
											</div>
											<div className="md:hidden grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-white/[.04] [&>div]:min-w-0 [&_.text-xs]:truncate">
												<div><div className="text-[10px] uppercase tracking-wider text-[#5d6877]">{t("final")}</div><div className="text-xs font-semibold font-mono mt-0.5">${match.final_capital.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div></div>
												<div><div className="text-[10px] uppercase tracking-wider text-[#5d6877]">{t("netPnl")}</div><div className={`text-xs font-bold mt-0.5 font-mono ${getResultColor(match.result)}`}>{formatMoney(match.realized_pnl)}</div></div>
												<div><div className="text-[10px] uppercase tracking-wider text-[#5d6877]">{t("duration")}</div><div className="text-xs font-semibold mt-0.5">{formatDuration(match.starts_at, match.ends_at, t)}</div></div>
											</div>
										</div>

										{/* EXPANDED DETAILS & MATCH CHART DROPDOWN */}
										{isExpanded && (
											<div className="rounded-b-[10px] border border-white/[.07] border-t-0 bg-[#0f131b] p-3 md:p-5 animate-in slide-in-from-top-2 duration-200">
												{loadingDetails ? (
													<div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-blue-400" /></div>
												) : detailsError || !matchDetails ? (
													<div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
														<div className="w-11 h-11 rounded-full bg-white/[.03] border border-white/[.07] flex items-center justify-center">
															<Activity className="w-5 h-5 text-[#5d6877]" />
														</div>
														<p className="text-sm font-medium text-[#8a95a8]">{tDetail("noMatchData")}</p>
														<p className="text-xs text-[#5d6877]">{tDetail("noMatchDataHint")}</p>
													</div>
												) : (
													<div className="space-y-6">
														{/* Player Breakdown */}
														<div className="flex items-start justify-center gap-4 md:gap-8 [&>div]:min-w-0 [&>div:nth-child(odd)]:flex-1">
															<div className="text-right">
																<div className="text-sm font-semibold break-words">{matchDetails.currentPlayer?.username ?? tDetail("unknown")} <span className="text-[9px] text-blue-400 border border-blue-400/30 rounded px-1 py-0.5 ml-1">{tDetail("you")}</span></div>
																<div className={`text-lg md:text-xl font-bold font-mono ${pnlTone(matchDetails.currentPlayer?.realized_pnl ?? 0)}`}>${(matchDetails.currentPlayer?.final_capital ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
																<div className={`text-xs font-mono ${pnlTone(matchDetails.currentPlayer?.realized_pnl ?? 0)}`}>{formatMoney(matchDetails.currentPlayer?.realized_pnl ?? 0)}</div>
															</div>
															<div className="flex flex-col items-center"><Swords className="w-5 h-5 text-[#5d6877]" /><span className="text-[10px] text-[#5d6877] mt-1">{t("vs")}</span></div>
															<div className="text-left">
																<div className="text-sm font-semibold break-words">{matchDetails.opponent?.username ?? tDetail("unknown")}</div>
																<div className={`text-lg md:text-xl font-bold font-mono ${pnlTone(matchDetails.opponent?.realized_pnl ?? 0)}`}>${(matchDetails.opponent?.final_capital ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
																<div className={`text-xs font-mono ${pnlTone(matchDetails.opponent?.realized_pnl ?? 0)}`}>{formatMoney(matchDetails.opponent?.realized_pnl ?? 0)}</div>
															</div>
														</div>

														{/* Metadata Cards */}
														<div className="grid grid-cols-2 md:grid-cols-4 gap-3">
															<div className="rounded-[7px] border border-white/[.07] bg-[#090b11] p-3"><div className="text-[10px] uppercase tracking-wide text-[#5d6877] mb-1">{tDetail("startTime")}</div><div className="text-[11px] md:text-xs font-semibold">{formatDateTime(matchDetails.match.starts_at, locale)}</div></div>
															<div className="rounded-[7px] border border-white/[.07] bg-[#090b11] p-3"><div className="text-[10px] uppercase tracking-wide text-[#5d6877] mb-1">{tDetail("endTime")}</div><div className="text-[11px] md:text-xs font-semibold">{formatDateTime(matchDetails.match.ends_at, locale)}</div></div>
															<div className="rounded-[7px] border border-white/[.07] bg-[#090b11] p-3"><div className="text-[10px] uppercase tracking-wide text-[#5d6877] mb-1">{tDetail("duration")}</div><div className="text-xs font-semibold">{formatDuration(matchDetails.match.starts_at, matchDetails.match.ends_at, t)}</div></div>
															<div className="rounded-[7px] border border-white/[.07] bg-[#090b11] p-3"><div className="text-[10px] uppercase tracking-wide text-[#5d6877] mb-1">{tDetail("finalPrice")}</div><div className="text-xs font-semibold font-mono">${Number(matchDetails.match.final_price ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div></div>
														</div>

														{/* Candlestick Chart Rendered Directly Below Metadata */}
														<div className="pt-2 border-t border-white/[.05]">
															<div className="flex items-center gap-2 mb-3">
																<Activity className="w-4 h-4 text-blue-400" />
																<span className="text-xs font-semibold uppercase tracking-wider text-[#8a95a8]">
																	{tDetail("matchChart")}
																</span>
															</div>

															{matchDetails.candles && matchDetails.candles.length > 0 ? (
																<CandlestickChart
																	candles={matchDetails.candles}
																	trades={matchDetails.trades}
																	currentUserId={matchDetails.currentUserId}
																	t={tDetail}
																/>
															) : (
																<div className="h-32 rounded-md bg-white/[.02] border border-white/[.04] flex flex-col items-center justify-center gap-2">
																	<Activity className="w-5 h-5 text-[#5d6877]" />
																	<p className="text-xs text-[#5d6877]">{tDetail("noCandleData")}</p>
																</div>
															)}

															<div className="flex justify-end mt-3">
																<Link
																	href={`/history/${match.id}`}
																	className="inline-flex items-center gap-1.5 rounded-[7px] border border-white/[.07] bg-white/[.02] px-3 py-1.5 text-xs font-semibold text-[#9aa6b6] hover:bg-white/[.06] hover:text-[#eef2f8] transition-colors"
																>
																	{tDetail("viewMatchLogs")}
																	<ChevronRight className="w-3.5 h-3.5" />
																</Link>
															</div>
														</div>
													</div>
												)}
											</div>
										)}
									</div>
								);
							})
						)}
					</div>

					{/* Pagination Controls */}
					{(totalCount !== null ? totalCount > 0 : matchHistory.length > 0) && (
						<div className="mt-6 pt-4 border-t border-white/[.07]">
							<div className="flex items-center justify-between">
								<div className="text-xs text-[#5d6877]">
									{totalCount !== null && totalCount > 0 ? (
										<span>
											{t("showingMatchesRange", {
												from: page * PAGE_SIZE + 1,
												to: Math.min((page + 1) * PAGE_SIZE, totalCount),
												total: totalCount,
											})}
										</span>
									) : (
										<span>{t("pageNumber", { page: page + 1 })}</span>
									)}
								</div>
								<div className="flex items-center gap-2">
									<button
										id="history-prev-page"
										type="button"
										onClick={handlePrevPage}
										disabled={page === 0 || pageLoading}
										aria-label={t("previousPage")}
										className="inline-flex items-center justify-center p-2 rounded-lg border border-white/[.07] bg-[#0f131b] text-[#eef2f8] hover:border-white/[.14] hover:bg-white/[.04] disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:border-white/[.07] disabled:hover:bg-[#0f131b] transition-all"
									>
										<ChevronLeft className="w-4 h-4" />
									</button>

									{isEditingPage ? (
										<form
											onSubmit={(e) => {
												e.preventDefault();
												handleJumpToPage();
											}}
											className="inline-flex items-center gap-1.5"
										>
											<input
												id="history-page-input"
												type="text"
												inputMode="numeric"
												value={inputPage}
												onChange={(e) => {
													setInputPage(e.target.value);
													if (pageError) setPageError(null);
												}}
												onKeyDown={(e) => {
													if (e.key === "Escape") {
														setIsEditingPage(false);
														setPageError(null);
													}
												}}
												autoFocus
												className={`w-12 h-8 px-1.5 text-center text-xs font-mono bg-[#151a23] border rounded-[6px] text-[#eef2f8] outline-none transition-colors ${pageError
													? "border-rose-500 focus:border-rose-400"
													: "border-white/[.15] focus:border-blue-400"
													}`}
											/>
											<span className="text-xs font-mono text-[#8a95a8]">/ {totalPages}</span>
											<button
												id="history-page-submit"
												type="submit"
												disabled={pageLoading}
												className="px-2 py-1 text-xs font-medium rounded-[6px] bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500/30 transition-colors disabled:opacity-40"
											>
												{t("go")}
											</button>
										</form>
									) : (
										<button
											id="history-current-page-btn"
											type="button"
											onClick={() => {
												setIsEditingPage(true);
												setInputPage(String(page + 1));
												setPageError(null);
											}}
											title={t("jumpToPage")}
											className="text-xs font-mono text-[#8a95a8] hover:text-[#eef2f8] px-2 py-1 rounded-[6px] hover:bg-white/[.04] border border-transparent hover:border-white/[.07] transition-all cursor-pointer flex items-center gap-1"
										>
											<span className="font-semibold text-[#eef2f8] underline decoration-dotted underline-offset-4 decoration-white/30 hover:decoration-white">
												{page + 1}
											</span>
											<span>/</span>
											<span>{totalPages}</span>
										</button>
									)}

									<button
										id="history-next-page"
										type="button"
										onClick={handleNextPage}
										disabled={!hasNextPage || pageLoading}
										aria-label={t("nextPage")}
										className="inline-flex items-center justify-center p-2 rounded-lg border border-white/[.07] bg-[#0f131b] text-[#eef2f8] hover:border-white/[.14] hover:bg-white/[.04] disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:border-white/[.07] disabled:hover:bg-[#0f131b] transition-all"
									>
										<ChevronRight className="w-4 h-4" />
									</button>
								</div>
							</div>
							{pageError && (
								<div id="history-page-error" className="text-right text-xs text-rose-400 mt-2 font-medium">
									{pageError}
								</div>
							)}
						</div>
					)}
				</div>
			</div>
		</SideNav>
	);
}