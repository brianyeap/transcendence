"use client";

import Link from "next/link";
import { useEffect, useState, useMemo } from "react";
import { SideNav } from "../components/duel/side-nav";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
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
} from "lucide-react";

function getResultColor(result: string): string {
	if (result === "WIN")
		return "text-emerald-400";
	if (result === "LOSS")
		return "text-rose-400";
	return "text-gray-400";
}

function getResultGlow(result: string): string {
	if (result === "WIN")
		return "shadow-[inset_3px_0_0_0_#34d399] hover:shadow-[inset_3px_0_0_0_#34d399,0_0_20px_-5px_rgba(52,211,153,0.3)]";
	if (result === "LOSS")
		return "shadow-[inset_3px_0_0_0_#fb7185] hover:shadow-[inset_3px_0_0_0_#fb7185,0_0_20px_-5px_rgba(251,113,133,0.3)]";
	return "shadow-[inset_3px_0_0_0_#6b7280] hover:shadow-[inset_3px_0_0_0_#6b7280,0_0_20px_-5px_rgba(107,114,128,0.2)]";
}

function getResultBadgeStyle(result: string): string {
	if (result === "WIN")
		return "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-[0_0_10px_-3px_rgba(52,211,153,0.4)]";
	if (result === "LOSS")
		return "bg-rose-500/10 text-rose-400 border border-rose-500/30 shadow-[0_0_10px_-3px_rgba(251,113,133,0.4)]";
	return "bg-gray-500/10 text-gray-400 border border-gray-500/30";
}

function formatDuration(starts_at: string, ends_at: string): string {
	const seconds = Math.round((new Date(ends_at).getTime() - new Date(starts_at).getTime()) / 1000);
	const minutes = Math.floor(seconds / 60);
	const remainingSeconds = seconds % 60;
	return `${minutes}m ${remainingSeconds}s`;
}

function getRelativeTime(dateString: string): string {
	const date = new Date(dateString);
	const now = new Date();
	const diffMs = now.getTime() - date.getTime();
	const diffSecs = Math.floor(diffMs / 1000);
	const diffMins = Math.floor(diffSecs / 60);
	const diffHours = Math.floor(diffMins / 60);
	const diffDays = Math.floor(diffHours / 24);

	if (diffSecs < 60)
		return "just now";
	if (diffMins < 60)
		return `${diffMins}m ago`;
	if (diffHours < 24)
		return `${diffHours}h ago`;
	if (diffDays < 7)
		return `${diffDays}d ago`;
	if (diffDays < 30)
		return `${Math.floor(diffDays / 7)}w ago`;
	if (diffDays < 365)
		return `${Math.floor(diffDays / 30)}mo ago`;
	return `${Math.floor(diffDays / 365)}y ago`;
}

function formatMoney(value: number): string {
	const sign = value > 0 ? "+" : "";
	return `${sign}$${Math.abs(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatPct(value: number, base: number): string {
	const pct = (value / base) * 100;
	const sign = pct > 0 ? "+" : "";
	return `${sign}${pct.toFixed(2)}%`;
}

function CumulativeChart({ data }: { data: { value: number; result: string }[] }) {
	if (data.length === 0)
		return null;

	const width = 800;
	const height = 160;
	const padX = 16;
	const padY = 24;

	const values = data.map((d) => d.value);
	const min = Math.min(...values, 0);
	const max = Math.max(...values, 0);
	const range = max - min || 1;

	const points = data.map((d, i) => {
		const x = padX + (i / Math.max(data.length - 1, 1)) * (width - padX * 2);
		const y = padY + (1 - (d.value - min) / range) * (height - padY * 2);
		return { x, y, value: d.value, result: d.result };
	});

	const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
	const areaD = `${pathD} L ${points[points.length - 1].x} ${height - padY} L ${points[0].x} ${height - padY} Z`;

	const finalValue = data[data.length - 1].value;
	const isPositive = finalValue >= 0;
	const stroke = isPositive ? "#34d399" : "#fb7185";
	const gradId = isPositive ? "gradPos" : "gradNeg";

	const zeroY = padY + (1 - (0 - min) / range) * (height - padY * 2);

	return (
		<div className="relative w-full">
			<svg viewBox={`0 0 ${width} ${height}`} className="w-full h-40" preserveAspectRatio="none">
				<defs>
					<linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
						<stop offset="0%" stopColor={stroke} stopOpacity="0.35" />
						<stop offset="100%" stopColor={stroke} stopOpacity="0" />
					</linearGradient>
				</defs>

				{[0.25, 0.5, 0.75].map((t) => (
					<line
						key={t}
						x1={padX}
						x2={width - padX}
						y1={padY + t * (height - padY * 2)}
						y2={padY + t * (height - padY * 2)}
						stroke="#ffffff"
						strokeOpacity="0.04"
						strokeDasharray="2 4"
					/>
				))}

				<line
					x1={padX}
					x2={width - padX}
					y1={zeroY}
					y2={zeroY}
					stroke="#ffffff"
					strokeOpacity="0.1"
					strokeDasharray="3 3"
				/>

				<path d={areaD} fill={`url(#${gradId})`} />
				<path d={pathD} fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

				{points.map((p, i) => (
					<circle key={i} cx={p.x} cy={p.y} r="3" fill="#0f131b" stroke={stroke} strokeWidth="2" />
				))}

				<circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r="5" fill={stroke} opacity="0.9" />
				<circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r="10" fill={stroke} opacity="0.2" />
			</svg>
		</div>
	);
}

type StatCardProps = {
	label: string;
	value: string;
	sub?: string;
	icon: React.ReactNode;
	accent?: "emerald" | "rose" | "blue" | "gray" | "amber";
};

function StatCard({ label, value, sub, icon, accent = "blue" }: StatCardProps) {
	const accentMap = {
		emerald: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
		rose: "text-rose-400 bg-rose-500/10 border-rose-500/20",
		blue: "text-blue-400 bg-blue-500/10 border-blue-500/20",
		gray: "text-gray-400 bg-gray-500/10 border-gray-500/20",
		amber: "text-amber-400 bg-amber-500/10 border-amber-500/20",
	};

	return (
		<div className="relative rounded-[10px] border border-white/[.07] bg-[#0f131b] p-4 overflow-hidden group hover:border-white/[.14] transition-all">
			<div className="absolute -top-10 -right-10 w-24 h-24 rounded-full bg-gradient-to-br from-white/[.03] to-transparent blur-2xl group-hover:from-white/[.06] transition-all" />
			<div className="flex items-center justify-between mb-3">
				<span className="text-[10px] uppercase tracking-wider text-[#5d6877] font-medium">{label}</span>
				<div className={`w-7 h-7 rounded-md border flex items-center justify-center ${accentMap[accent]}`}>
					{icon}
				</div>
			</div>
			<div className="text-xl font-bold text-[#eef2f8] tracking-tight">{value}</div>
			{sub && <div className="text-[11px] text-[#5d6877] mt-1">{sub}</div>}
		</div>
	);
}

export default function HistoryPage() {

	console.log("HistoryPage rendered");
	const supabase = createSupabaseBrowserClient();

	const [matchHistory, setMatchHistory] = useState<any[]>([]);
	const [loading, setLoading] = useState(true);
	const [filter, setFilter] = useState<"ALL" | "WIN" | "LOSS" | "DRAW">("ALL");

	useEffect(() => {
		loadHistory();
	}, []);

	async function loadHistory() {

		console.log("loadHistory started");
		setLoading(true);

		console.log("Before getUser");
		const result = await supabase.auth.getUser();
		console.log("After getUser", result);
		const {
			data: { user },
			error: userError,
		} = result;

		if (userError || !user) {
			console.error(userError);
			setLoading(false);
			return;
		}

		console.log("User:", user);
		console.log("User Error:", userError);

		console.log("Before matches query")

		const { data: matches, error: matchesError } = await supabase
			.from("matches")
			.select("*")
			.or(
				`player_one_user_id.eq.${user.id},player_two_user_id.eq.${user.id}`
			)
			.eq("status", "completed")
			.order("ends_at", { ascending: false });

		console.log("Matches:", matches)
		console.log("Matches Error:", matchesError)

		if (matchesError) {
			console.error(matchesError);
			setLoading(false);
			return;
		}

		if (!matches || matches.length === 0) {
			setMatchHistory([]);
			setLoading(false);
			return;
		}

		const matchIds = matches.map((m) => m.id);

		const { data: playerStats, error: statsError } = await supabase
			.from("match_players")
			.select("*")
			.in("match_id", matchIds);

		if (statsError) {
			console.error(statsError);
			setLoading(false);
			return;
		}

		const userIds = [
			...new Set(
				matches.flatMap((m) => [
					m.player_one_user_id,
					m.player_two_user_id,
				])
			),
		];

		const { data: profiles, error: profilesError } = await supabase
			.from("public_profiles")
			.select("id, username")
			.in("id", userIds);

		console.log("User IDs:", userIds);
		console.log("Profiles:", profiles);
		console.log("Profiles Error:", profilesError);

		if (profilesError) {
			console.error(profilesError);
			setLoading(false);
			return;
		}

		const usernameMap = new Map(
			profiles.map((p) => [p.id, p.username])
		);

		const history = matches.map((match) => {
			const myStats = playerStats.find(
				(p) =>
					p.match_id === match.id &&
					p.user_id === user.id
			);

			const opponentId =
				match.player_one_user_id === user.id
					? match.player_two_user_id
					: match.player_one_user_id;

			let result: "WIN" | "LOSS" | "DRAW";

			if (match.winner_user_id === null)
				result = "DRAW";
			else if (match.winner_user_id === user.id)
				result = "WIN";
			else
				result = "LOSS";

			return {
				id: match.id,
				opponent: usernameMap.get(opponentId) ?? "Unknown",
				result,
				symbol: match.symbol,
				starting_capital: Number(match.starting_capital),
				final_capital: Number(myStats?.final_capital ?? 0),
				realized_pnl: Number(myStats?.realized_pnl ?? 0),
				starts_at: match.starts_at,
				ends_at: match.ends_at,
			};
		});

		setMatchHistory(history);
		setLoading(false);
	}

	const stats = useMemo(() => {
		const wins = matchHistory.filter((m) => m.result === "WIN").length;
		const losses = matchHistory.filter((m) => m.result === "LOSS").length;
		const draws = matchHistory.filter((m) => m.result === "DRAW").length;
		const totalPnl = matchHistory.reduce((sum, m) => sum + m.realized_pnl, 0);
		const winRate = matchHistory.length > 0 ? (wins / matchHistory.length) * 100 : 0;
		const bestTrade = matchHistory.length > 0 ? Math.max(...matchHistory.map((m) => m.realized_pnl)) : 0;
		const worstTrade = matchHistory.length > 0 ? Math.min(...matchHistory.map((m) => m.realized_pnl)) : 0;

		let streak = 0;
		let streakType = "";
		for (const match of matchHistory) {
			if (streak === 0) {
				streakType = match.result;
				streak = 1;
			}
			else if (match.result === streakType) {
				streak++;
			}
			else {
				break;
			}
		}
		return { wins, losses, draws, totalPnl, winRate, bestTrade, worstTrade, streak, streakType };
	}, [matchHistory]);

	const cumulativeData = useMemo(() => {
		let cumulative = 0;
		return [...matchHistory].reverse().map((match) => {
			cumulative += match.realized_pnl;
			return { value: cumulative, result: match.result };
		});
	}, [matchHistory]);

	const filteredMatches =
		filter === "ALL" ? matchHistory : matchHistory.filter((m) => m.result === filter);

	const filters: { key: "ALL" | "WIN" | "LOSS" | "DRAW"; label: string; count: number }[] = [
		{ key: "ALL", label: "All", count: matchHistory.length },
		{ key: "WIN", label: "Wins", count: stats.wins },
		{ key: "LOSS", label: "Losses", count: stats.losses },
		{ key: "DRAW", label: "Draws", count: stats.draws },
	];

	if (loading) {
		return (
			<SideNav>
				<div className="p-8 text-white">
					Loading history...
				</div>
			</SideNav>
		);
	}

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
							<div className="flex items-center gap-2 mb-2">
								<div className="w-1 h-6 rounded-full bg-gradient-to-b from-blue-400 to-emerald-400" />
								<span className="text-[11px] uppercase tracking-[0.2em] text-[#5d6877] font-medium">
									Performance
								</span>
							</div>
							<h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-[#eef2f8] to-[#8a95a8] bg-clip-text text-transparent">
								Match History
							</h1>
							<p className="text-sm text-[#5d6877] mt-1.5">
								Track every duel. Learn from every trade.
							</p>
						</div>
					</div>

					<div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
						<StatCard
							label="Total PnL"
							value={formatMoney(stats.totalPnl)}
							sub={`${matchHistory.length} matches played`}
							icon={<Activity className="w-3.5 h-3.5" />}
							accent={stats.totalPnl >= 0 ? "emerald" : "rose"}
						/>
						<StatCard
							label="Win Rate"
							value={`${stats.winRate.toFixed(1)}%`}
							sub={`${stats.wins} / ${stats.losses}L / ${stats.draws}D`}
							icon={<Target className="w-3.5 h-3.5" />}
							accent={stats.winRate >= 50 ? "emerald" : "rose"}
						/>
						<StatCard
							label="Current Streak"
							value={`${stats.streak} ${stats.streakType === "WIN" ? "Wins" : stats.streakType === "LOSS" ? "Losses" : "Draws"}`}
							sub={stats.streak >= 3 ? "On fire 🔥" : "Keep pushing"}
							icon={<Flame className="w-3.5 h-3.5" />}
							accent={stats.streakType === "WIN" ? "amber" : stats.streakType === "LOSS" ? "rose" : "gray"}
						/>
						<StatCard
							label="Best Trade"
							value={formatMoney(stats.bestTrade)}
							sub={`Worst: ${formatMoney(stats.worstTrade)}`}
							icon={<Trophy className="w-3.5 h-3.5" />}
							accent="blue"
						/>
					</div>

					<div className="rounded-[10px] border border-white/[.07] bg-[#0f131b] p-5 mb-6">
						<div className="flex items-center justify-between mb-4">
							<div className="flex items-center gap-2">
								<TrendingUp className="w-4 h-4 text-blue-400" />
								<span className="text-sm font-semibold">Cumulative PnL</span>
							</div>
							<div className={`text-sm font-bold ${stats.totalPnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
								{formatMoney(stats.totalPnl)}
							</div>
						</div>
						<CumulativeChart data={cumulativeData} />
					</div>

					<div className="flex items-center gap-1 mb-4 p-1 rounded-lg bg-[#0f131b] border border-white/[.07] w-fit">
						{filters.map((f) => (
							<button
								key={f.key}
								onClick={() => setFilter(f.key)}
								className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${filter === f.key
									? "bg-white/[.08] text-[#eef2f8] shadow-sm"
									: "text-[#5d6877] hover:text-[#eef2f8]"
									}`}
							>
								{f.label}
								<span className={`text-[10px] px-1.5 py-0.5 rounded-full ${filter === f.key ? "bg-white/[.08]" : "bg-white/[.04]"}`}>
									{f.count}
								</span>
							</button>
						))}
					</div>

					<div className="flex flex-col gap-2.5">
						{filteredMatches.length === 0 ? (
							<div className="rounded-[10px] border border-white/[.07] bg-[#0f131b] p-12 text-center">
								<Swords className="w-8 h-8 text-[#5d6877] mx-auto mb-3" />
								<p className="text-sm text-[#5d6877]">No matches found for this filter.</p>
							</div>
						) : (
							filteredMatches.map((match) => (
								<Link key={match.id} href={`/history/${match.id}`} className="block w-full">
									<div className={`group relative rounded-[10px] border border-white/[.07] bg-[#0f131b] p-4 transition-all duration-200 hover:border-white/[.14] hover:-translate-y-[1px] cursor-pointer ${getResultGlow(match.result)}`}>

										<div className="flex items-center justify-between gap-4">
											{/* Left Side: Opponent & Symbol */}
											<div className="flex items-center gap-3 min-w-0">
												<div className={`w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${getResultBadgeStyle(match.result)}`}>
													{match.result === "WIN" ? (
														<TrendingUp className="w-4 h-4" />
													) : match.result === "LOSS" ? (
														<TrendingDown className="w-4 h-4" />
													) : (
														<span>—</span>
													)}
												</div>

												<div className="min-w-0">
													<div className="flex items-center gap-1.5">
														<span className="text-[10px] uppercase tracking-wider text-[#5d6877]">vs</span>
														<span className="text-sm font-semibold truncate">{match.opponent}</span>
													</div>
													<div className="flex items-center gap-2 mt-0.5 text-[11px] text-[#5d6877]">
														<span className="font-mono">{match.symbol}</span>
														<span className="opacity-40">•</span>
														<span>{getRelativeTime(match.starts_at)}</span>
													</div>
												</div>
											</div>

											{/* Right Side: Stats & Chevron */}
											<div className="flex items-center gap-6">
												<div className="hidden md:flex items-center gap-6">
													<div className="text-right">
														<div className="text-[10px] uppercase tracking-wider text-[#5d6877]">Final</div>
														<div className="text-sm font-semibold font-mono mt-0.5">
															${match.final_capital.toLocaleString(undefined, { minimumFractionDigits: 2 })}
														</div>
													</div>
													<div className="text-right">
														<div className="text-[10px] uppercase tracking-wider text-[#5d6877]">Net PnL</div>
														<div className={`text-sm font-bold mt-0.5 font-mono ${getResultColor(match.result)}`}>
															{formatMoney(match.realized_pnl)}
														</div>
														<div className={`text-[10px] font-mono ${getResultColor(match.result)} opacity-70`}>
															{formatPct(match.realized_pnl, match.starting_capital)}
														</div>
													</div>
													<div className="text-right">
														<div className="text-[10px] uppercase tracking-wider text-[#5d6877]">Duration</div>
														<div className="text-sm font-semibold mt-0.5 flex items-center gap-1 justify-end">
															<Clock className="w-3 h-3 text-[#5d6877]" />
															{formatDuration(match.starts_at, match.ends_at)}
														</div>
													</div>
												</div>

												{/* Chevron is now in the right place */}
												<ChevronRight className="w-4 h-4 text-[#5d6877] opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all shrink-0" />
											</div>
										</div>

										{/* Mobile Stats Grid - Properly nested.*/}
										<div className="md:hidden grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-white/[.04]">
											<div>
												<div className="text-[10px] uppercase tracking-wider text-[#5d6877]">Final</div>
												<div className="text-xs font-semibold font-mono mt-0.5">
													${match.final_capital.toLocaleString(undefined, { minimumFractionDigits: 2 })}
												</div>
											</div>
											<div>
												<div className="text-[10px] uppercase tracking-wider text-[#5d6877]">Net PnL</div>
												<div className={`text-xs font-bold mt-0.5 font-mono ${getResultColor(match.result)}`}>
													{formatMoney(match.realized_pnl)}
												</div>
											</div>
											<div>
												<div className="text-[10px] uppercase tracking-wider text-[#5d6877]">Duration</div>
												<div className="text-xs font-semibold mt-0.5">
													{formatDuration(match.starts_at, match.ends_at)}
												</div>
											</div>
										</div>
									</div>
								</Link>
							))
						)}
					</div>
				</div>
			</div>
		</SideNav>
	);
}