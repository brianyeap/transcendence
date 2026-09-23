"use client";

import Link from "next/link";
import { useEffect, useState, useMemo } from "react";
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
	ChevronRight,
	ChevronDown,
	Loader2,
} from "lucide-react";

// --- Helper Functions ---
function formatMoney(value: number): string {
	const sign = value > 0 ? "+" : "";
	return `${sign}$${Math.abs(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDuration(starts_at?: string | null, ends_at?: string | null): string {
	if (!starts_at || !ends_at) return "—";
	const start = new Date(starts_at).getTime();
	const end = new Date(ends_at).getTime();
	if (Number.isNaN(start) || Number.isNaN(end)) return "—";
	const seconds = Math.max(0, Math.round((end - start) / 1000));
	const minutes = Math.floor(seconds / 60);
	const remainingSeconds = seconds % 60;
	return `${minutes}m ${remainingSeconds}s`;
}

function dateLocaleFromAppLocale(locale: string): string {
	if (locale === "zh-CN") return "zh-CN";
	if (locale === "ms") return "ms-MY";
	return "en-GB";
}

function formatDateTime(dateString: string | null | undefined, locale: string): string {
	if (!dateString) return "—";
	const date = new Date(dateString);
	if (Number.isNaN(date.getTime())) return "—";
	return date.toLocaleDateString(dateLocaleFromAppLocale(locale), {
		day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
	});
}

function getPnLColor(value: number): string {
	if (value > 0) return "text-emerald-400";
	if (value < 0) return "text-rose-400";
	return "text-gray-400";
}

// --- Candlestick Chart Component ---
function CandlestickChart({ candles, trades, currentUserId, t }: any) {
	if (!candles || candles.length === 0) return null;

	const sequences = candles.map((c: any) => c.sequence);
	const minSequence = Math.min(...sequences, 0);
	const maxSequence = Math.max(...sequences, 1);

	const tradePrices = trades.map((tr: any) => tr.execution_price);
	const allPrices = [...candles.map((c: any) => c.low), ...candles.map((c: any) => c.high), ...tradePrices];
	const minPrice = allPrices.length > 0 ? Math.min(...allPrices) : 0;
	const maxPrice = allPrices.length > 0 ? Math.max(...allPrices) : 100;

	const priceRange = maxPrice - minPrice || 1;
	const padPriceMin = minPrice - priceRange * 0.1;
	const padPriceMax = maxPrice + priceRange * 0.1;
	const paddedRange = padPriceMax - padPriceMin;

	const svgWidth = 1000;
	const svgHeight = 320;
	const padLeft = 70, padRight = 30, padTop = 30, padBottom = 30;
	const chartWidth = svgWidth - padLeft - padRight;
	const chartHeight = svgHeight - padTop - padBottom;

	const getX = (seq: number) => padLeft + ((seq - minSequence) / (maxSequence - minSequence || 1)) * chartWidth;
	const getY = (price: number) => padTop + (1 - (price - padPriceMin) / paddedRange) * chartHeight;

	const gridCount = 5;
	const gridLines = Array.from({ length: gridCount }).map((_, i) => {
		const price = padPriceMin + (i / (gridCount - 1)) * paddedRange;
		return { price, y: getY(price) };
	});

	const candleWidth = Math.max(1.5, (chartWidth / (candles.length || 1)) * 0.6);

	return (
		<div className="relative w-full overflow-x-auto">
			<svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full min-w-[700px] h-80" preserveAspectRatio="none">
				<g transform="translate(80, 15)">
					<path d="M 0 -4 L -4 2 L 4 2 Z" fill="#10b981" stroke="#ffffff" strokeWidth="1" />
					<text x="8" y="1" fill="#9aa6b6" fontSize="10" fontFamily="sans-serif">{t("youLong")}</text>
					<path transform="translate(75, 0)" d="M 0 4 L -4 -2 L 4 -2 Z" fill="#ef4444" stroke="#ffffff" strokeWidth="1" />
					<text x="83" y="1" fill="#9aa6b6" fontSize="10" fontFamily="sans-serif">{t("youShort")}</text>
					<path transform="translate(155, 0)" d="M 0 -4 L -4 2 L 4 2 Z" fill="none" stroke="#34d399" strokeWidth="1.5" />
					<text x="163" y="1" fill="#9aa6b6" fontSize="10" fontFamily="sans-serif">{t("opponentLong")}</text>
					<path transform="translate(255, 0)" d="M 0 4 L -4 -2 L 4 -2 Z" fill="none" stroke="#f87171" strokeWidth="1.5" />
					<text x="263" y="1" fill="#9aa6b6" fontSize="10" fontFamily="sans-serif">{t("opponentShort")}</text>
				</g>

				{gridLines.map((line, i) => (
					<g key={i}>
						<line x1={padLeft} y1={line.y} x2={svgWidth - padRight} y2={line.y} stroke="#ffffff" strokeOpacity="0.08" strokeDasharray="3 3" />
						<text x={padLeft - 8} y={line.y + 4} fill="#5d6877" fontSize="10" fontFamily="monospace" textAnchor="end">
							${line.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
						</text>
					</g>
				))}

				{candles.map((c: any) => {
					const cx = getX(c.sequence);
					const cyOpen = getY(c.open), cyClose = getY(c.close), cyHigh = getY(c.high), cyLow = getY(c.low);
					const isGreen = c.close >= c.open;
					const color = isGreen ? "#10b981" : "#ef4444";
					return (
						<g key={c.sequence}>
							<line x1={cx} y1={cyHigh} x2={cx} y2={cyLow} stroke={color} strokeWidth="1.5" />
							<rect x={cx - candleWidth / 2} y={Math.min(cyOpen, cyClose)} width={candleWidth} height={Math.max(1.2, Math.abs(cyOpen - cyClose))} fill={color} />
						</g>
					);
				})}

				{trades.map((trade: any) => {
					const tx = getX(trade.candle_sequence);
					const ty = getY(trade.execution_price);
					const isCurrentUser = trade.user_id === currentUserId;
					const isLong = trade.side === "long";
					let markerFill = "", markerStroke = "", markerStrokeWidth = "1.5";
					let markerPath = isLong
						? `M ${tx} ${ty - 7} L ${tx - 6} ${ty + 3} L ${tx + 6} ${ty + 3} Z`
						: `M ${tx} ${ty + 7} L ${tx - 6} ${ty - 3} L ${tx + 6} ${ty - 3} Z`;

					if (isCurrentUser) {
						markerFill = isLong ? "#10b981" : "#ef4444";
						markerStroke = "#ffffff";
					} else {
						markerFill = "none";
						markerStroke = isLong ? "#34d399" : "#f87171";
						markerStrokeWidth = "2";
					}

					return (
						<g key={trade.id}>
							<circle cx={tx} cy={ty} r="9" fill={isLong ? "#10b981" : "#ef4444"} fillOpacity="0.1" />
							<path d={markerPath} fill={markerFill} stroke={markerStroke} strokeWidth={markerStrokeWidth}>
								<title>{t("tradeTooltip", { username: trade.username, side: isLong ? t("long") : t("short"), amount: trade.amount_usdt, price: trade.execution_price })}</title>
							</path>
						</g>
					);
				})}
			</svg>
		</div>
	);
}

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
function formatPct(value: number, base: number): string {
	if (!base || !Number.isFinite(base) || !Number.isFinite(value)) return "—";
	const pct = (value / base) * 100;
	if (!Number.isFinite(pct)) return "—";
	return `${pct > 0 ? "+" : ""}${pct.toFixed(2)}%`;
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
			<svg viewBox={`0 0 ${width} ${height}`} className="w-full h-40" preserveAspectRatio="none">
				<defs><linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={stroke} stopOpacity="0.35" /><stop offset="100%" stopColor={stroke} stopOpacity="0" /></linearGradient></defs>
				{[0.25, 0.5, 0.75].map((t) => (<line key={t} x1={padX} x2={width - padX} y1={padY + t * (height - padY * 2)} y2={padY + t * (height - padY * 2)} stroke="#ffffff" strokeOpacity="0.04" strokeDasharray="2 4" />))}
				<line x1={padX} x2={width - padX} y1={zeroY} y2={zeroY} stroke="#ffffff" strokeOpacity="0.1" strokeDasharray="3 3" />
				<path d={areaD} fill={`url(#${gradId})`} /><path d={pathD} fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
				{points.map((p, i) => (<circle key={i} cx={p.x} cy={p.y} r="3" fill="#0f131b" stroke={stroke} strokeWidth="2" />))}
				<circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r="5" fill={stroke} opacity="0.9" /><circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r="10" fill={stroke} opacity="0.2" />
			</svg>
		</div>
	);
}

type StatCardProps = { label: string; value: string; sub?: string; icon: React.ReactNode; accent?: "emerald" | "rose" | "blue" | "gray" | "amber"; };
function StatCard({ label, value, sub, icon, accent = "blue" }: StatCardProps) {
	const accentMap = { emerald: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20", rose: "text-rose-400 bg-rose-500/10 border-rose-500/20", blue: "text-blue-400 bg-blue-500/10 border-blue-500/20", gray: "text-gray-400 bg-gray-500/10 border-gray-500/20", amber: "text-amber-400 bg-amber-500/10 border-amber-500/20" };
	return (
		<div className="relative rounded-[10px] border border-white/[.07] bg-[#0f131b] p-4 overflow-hidden group hover:border-white/[.14] transition-all">
			<div className="absolute -top-10 -right-10 w-24 h-24 rounded-full bg-gradient-to-br from-white/[.03] to-transparent blur-2xl group-hover:from-white/[.06] transition-all" />
			<div className="flex items-center justify-between mb-3"><span className="text-[10px] uppercase tracking-wider text-[#5d6877] font-medium">{label}</span><div className={`w-7 h-7 rounded-md border flex items-center justify-center ${accentMap[accent]}`}>{icon}</div></div>
			<div className="text-xl font-bold text-[#eef2f8] tracking-tight">{value}</div>{sub && <div className="text-[11px] text-[#5d6877] mt-1">{sub}</div>}
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
	const [filter, setFilter] = useState<"ALL" | "WIN" | "LOSS" | "DRAW">("ALL");

	// Multi-match expansion support via Set and dictionary maps
	const [expandedMatchIds, setExpandedMatchIds] = useState<Set<string>>(new Set());
	const [matchDetailsMap, setMatchDetailsMap] = useState<Record<string, any>>({});
	const [loadingDetailsMap, setLoadingDetailsMap] = useState<Record<string, boolean>>({});
	const [detailsErrorMap, setDetailsErrorMap] = useState<Record<string, string | null>>({});

	useEffect(() => { loadHistory(); }, []);

	async function loadHistory() {
		setLoading(true);
		const { data: { user } } = await supabase.auth.getUser();
		if (!user) { setLoading(false); return; }

		const { data: matches } = await supabase.from("matches").select("*").or(`player_one_user_id.eq.${user.id},player_two_user_id.eq.${user.id}`).eq("status", "completed").order("ends_at", { ascending: false });
		if (!matches || matches.length === 0) { setMatchHistory([]); setLoading(false); return; }

		const matchIds = matches.map((m) => m.id);
		const { data: playerStats } = await supabase.from("match_players").select("*").in("match_id", matchIds);
		const userIds = [...new Set(matches.flatMap((m) => [m.player_one_user_id, m.player_two_user_id]))];
		const { data: profiles } = await supabase.from("profiles").select("id, username").in("id", userIds);
		const usernameMap = new Map(profiles?.map((p) => [p.id, p.username]) ?? []);

		const history = matches.map((match) => {
			const myStats = playerStats?.find((p) => p.match_id === match.id && p.user_id === user.id);
			const opponentId = match.player_one_user_id === user.id ? match.player_two_user_id : match.player_one_user_id;
			let result: "WIN" | "LOSS" | "DRAW" = match.winner_user_id === null ? "DRAW" : match.winner_user_id === user.id ? "WIN" : "LOSS";
			return { id: match.id, opponent: usernameMap.get(opponentId) ?? "Unknown", result, symbol: match.symbol, starting_capital: Number(match.starting_capital), final_capital: Number(myStats?.final_capital ?? 0), realized_pnl: Number(myStats?.realized_pnl ?? 0), starts_at: match.starts_at, ends_at: match.ends_at };
		});
		setMatchHistory(history);
		setLoading(false);
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
					username: usernameMap.get(pid) ?? "Unknown",
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
				username: usernameMap.get(tr.user_id) ?? "Unknown",
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

	const filters: { key: "ALL" | "WIN" | "LOSS" | "DRAW"; label: string; count: number }[] = [
		{ key: "ALL", label: t("filterAll"), count: matchHistory.length }, { key: "WIN", label: t("filterWins"), count: stats.wins },
		{ key: "LOSS", label: t("filterLosses"), count: stats.losses }, { key: "DRAW", label: t("filterDraws"), count: stats.draws },
	];

	if (loading) return (<SideNav><div className="flex min-h-screen bg-[#090b11]"><div className="flex-1 flex items-center justify-center p-8 text-white font-medium tracking-wide"><div className="animate-pulse">Loading history logs...</div></div></div></SideNav>);

	return (
		<SideNav>
			<div className="relative min-h-screen">
				<div className="pointer-events-none absolute inset-0 overflow-hidden">
					<div className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full bg-blue-600/[.07] blur-3xl" />
					<div className="absolute top-1/3 -left-40 w-[400px] h-[400px] rounded-full bg-emerald-600/[.05] blur-3xl" />
				</div>

				<div className="relative p-6 md:p-8 text-[#eef2f8] max-w-6xl mx-auto">
					<div className="mb-8 flex items-end justify-between flex-wrap gap-4">
						<div>
							<div className="flex items-center gap-2 mb-2"><div className="w-1 h-6 rounded-full bg-gradient-to-b from-blue-400 to-emerald-400" /><span className="text-[11px] uppercase tracking-[0.2em] text-[#5d6877] font-medium">{t("performance")}</span></div>
							<h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-[#eef2f8] to-[#8a95a8] bg-clip-text text-transparent">{t("title")}</h1>
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
					<div className="rounded-[10px] border border-white/[.07] bg-[#0f131b] p-5 mb-6">
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

					<div className="flex items-center gap-1 mb-4 p-1 rounded-lg bg-[#0f131b] border border-white/[.07] w-fit">
						{filters.map((f) => (
							<button key={f.key} onClick={() => setFilter(f.key)} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${filter === f.key ? "bg-white/[.08] text-[#eef2f8] shadow-sm" : "text-[#5d6877] hover:text-[#eef2f8]"}`}>
								{f.label}<span className={`text-[10px] px-1.5 py-0.5 rounded-full ${filter === f.key ? "bg-white/[.08]" : "bg-white/[.04]"}`}>{f.count}</span>
							</button>
						))}
					</div>

					<div className="flex flex-col gap-2.5">
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
											<div className="flex items-center justify-between gap-4">
												<div className="flex items-center gap-3 min-w-0">
													<div className={`w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${getResultBadgeStyle(match.result)}`}>
														{match.result === "WIN" ? <TrendingUp className="w-4 h-4" /> : match.result === "LOSS" ? <TrendingDown className="w-4 h-4" /> : <span>—</span>}
													</div>
													<div className="min-w-0">
														<div className="flex items-center gap-1.5"><span className="text-[10px] uppercase tracking-wider text-[#5d6877]">{t("vs")}</span><span className="text-sm font-semibold truncate">{match.opponent}</span></div>
														<div className="flex items-center gap-2 mt-0.5 text-[11px] text-[#5d6877]"><span className="font-mono">{match.symbol}</span><span className="opacity-40">•</span><span>{getRelativeTime(match.starts_at, t)}</span></div>
													</div>
												</div>
												<div className="flex items-center gap-6">
													<div className="hidden md:flex items-center gap-6">
														<div className="text-right"><div className="text-[10px] uppercase tracking-wider text-[#5d6877]">{t("final")}</div><div className="text-sm font-semibold font-mono mt-0.5">${match.final_capital.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div></div>
														<div className="text-right"><div className="text-[10px] uppercase tracking-wider text-[#5d6877]">{t("netPnl")}</div><div className={`text-sm font-bold mt-0.5 font-mono ${getResultColor(match.result)}`}>{formatMoney(match.realized_pnl)}</div><div className={`text-[10px] font-mono ${getResultColor(match.result)} opacity-70`}>{formatPct(match.realized_pnl, match.starting_capital)}</div></div>
														<div className="text-right"><div className="text-[10px] uppercase tracking-wider text-[#5d6877]">{t("duration")}</div><div className="text-sm font-semibold mt-0.5 flex items-center gap-1 justify-end"><Clock className="w-3 h-3 text-[#5d6877]" />{formatDuration(match.starts_at, match.ends_at)}</div></div>
													</div>
													{isExpanded ? <ChevronDown className="w-4 h-4 text-[#5d6877] transition-all shrink-0" /> : <ChevronRight className="w-4 h-4 text-[#5d6877] opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all shrink-0" />}
												</div>
											</div>
											<div className="md:hidden grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-white/[.04]">
												<div><div className="text-[10px] uppercase tracking-wider text-[#5d6877]">{t("final")}</div><div className="text-xs font-semibold font-mono mt-0.5">${match.final_capital.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div></div>
												<div><div className="text-[10px] uppercase tracking-wider text-[#5d6877]">{t("netPnl")}</div><div className={`text-xs font-bold mt-0.5 font-mono ${getResultColor(match.result)}`}>{formatMoney(match.realized_pnl)}</div></div>
												<div><div className="text-[10px] uppercase tracking-wider text-[#5d6877]">{t("duration")}</div><div className="text-xs font-semibold mt-0.5">{formatDuration(match.starts_at, match.ends_at)}</div></div>
											</div>
										</div>

										{/* EXPANDED DETAILS & MATCH CHART DROPDOWN */}
										{isExpanded && (
											<div className="rounded-b-[10px] border border-white/[.07] border-t-0 bg-[#0f131b] p-5 animate-in slide-in-from-top-2 duration-200">
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
														<div className="flex items-center justify-center gap-8">
															<div className="text-right">
																<div className="text-sm font-semibold">{matchDetails.currentPlayer?.username ?? tDetail("unknown")} <span className="text-[9px] text-blue-400 border border-blue-400/30 rounded px-1 py-0.5 ml-1">{tDetail("you")}</span></div>
																<div className={`text-xl font-bold font-mono ${getPnLColor(matchDetails.currentPlayer?.realized_pnl ?? 0)}`}>${(matchDetails.currentPlayer?.final_capital ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
																<div className={`text-xs font-mono ${getPnLColor(matchDetails.currentPlayer?.realized_pnl ?? 0)}`}>{formatMoney(matchDetails.currentPlayer?.realized_pnl ?? 0)}</div>
															</div>
															<div className="flex flex-col items-center"><Swords className="w-5 h-5 text-[#5d6877]" /><span className="text-[10px] text-[#5d6877] mt-1">{t("vs")}</span></div>
															<div className="text-left">
																<div className="text-sm font-semibold">{matchDetails.opponent?.username ?? tDetail("unknown")}</div>
																<div className={`text-xl font-bold font-mono ${getPnLColor(matchDetails.opponent?.realized_pnl ?? 0)}`}>${(matchDetails.opponent?.final_capital ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
																<div className={`text-xs font-mono ${getPnLColor(matchDetails.opponent?.realized_pnl ?? 0)}`}>{formatMoney(matchDetails.opponent?.realized_pnl ?? 0)}</div>
															</div>
														</div>

														{/* Metadata Cards */}
														<div className="grid grid-cols-2 md:grid-cols-4 gap-3">
															<div className="rounded-[7px] border border-white/[.07] bg-[#090b11] p-3"><div className="text-[10px] uppercase tracking-wide text-[#5d6877] mb-1">{tDetail("startTime")}</div><div className="text-xs font-semibold">{formatDateTime(matchDetails.match.starts_at, locale)}</div></div>
															<div className="rounded-[7px] border border-white/[.07] bg-[#090b11] p-3"><div className="text-[10px] uppercase tracking-wide text-[#5d6877] mb-1">{tDetail("endTime")}</div><div className="text-xs font-semibold">{formatDateTime(matchDetails.match.ends_at, locale)}</div></div>
															<div className="rounded-[7px] border border-white/[.07] bg-[#090b11] p-3"><div className="text-[10px] uppercase tracking-wide text-[#5d6877] mb-1">{tDetail("duration")}</div><div className="text-xs font-semibold">{formatDuration(matchDetails.match.starts_at, matchDetails.match.ends_at)}</div></div>
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
				</div>
			</div>
		</SideNav>
	);
}