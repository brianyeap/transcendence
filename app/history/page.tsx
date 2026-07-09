// "use client";

// import { SideNav } from "../components/duel/side-nav";

// const matchHistory = [
// 	{ id: "550e8400-e29b-41d4-a716-446655440001", opponent: "satoshi_jr", result: "WIN", symbol: "BTCUSDT", starting_capital: 10000, final_capital: 11250.00, realized_pnl: 1250.00, starts_at: "2025-06-28T14:00:00Z", ends_at: "2025-06-28T14:02:00Z" },
// 	{ id: "550e8400-e29b-41d4-a716-446655440002", opponent: "delta_neutral", result: "LOSS", symbol: "BTCUSDT", starting_capital: 10000, final_capital: 8450.00, realized_pnl: -1550.00, starts_at: "2025-06-27T10:00:00Z", ends_at: "2025-06-27T10:01:00Z" },
// 	{ id: "550e8400-e29b-41d4-a716-446655440003", opponent: "apex_07", result: "WIN", symbol: "BTCUSDT", starting_capital: 10000, final_capital: 12100.25, realized_pnl: 2100.25, starts_at: "2025-06-26T16:00:00Z", ends_at: "2025-06-26T16:03:00Z" },
// 	{ id: "550e8400-e29b-41d4-a716-446655440004", opponent: "nightowl", result: "DRAW", symbol: "BTCUSDT", starting_capital: 10000, final_capital: 10000.00, realized_pnl: 0.00, starts_at: "2025-06-25T20:00:00Z", ends_at: "2025-06-25T20:01:30Z" },
// 	{ id: "550e8400-e29b-41d4-a716-446655440005", opponent: "shortking", result: "LOSS", symbol: "BTCUSDT", starting_capital: 10000, final_capital: 7800.00, realized_pnl: -2200.00, starts_at: "2025-06-24T09:00:00Z", ends_at: "2025-06-24T09:02:00Z" },
// ];

// function getResultColor(result: string): string
// {
// 	if (result === "WIN")
// 		return "text-emerald-400";
// 	if (result === "LOSS")
// 		return "text-rose-400";
// 	return "text-grey-400";
// }

// function getResultBadgeStyle(result: string): string
// {
// 	if (result === "WIN")
// 		return "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";
// 	if (result === "LOSS")
// 		return "bg-rose-500/10 text-rose-400 border border-rose-500/20";
// 	return "bg-gray-500/10 text-gray-400 border border-gray-500/20";
// }

// function formatDuration(starts_at: string, ends_at: string): string
// {
// 	const seconds = Math.round((new Date(ends_at).getTime() - new Date(starts_at).getTime()) / 1000);
// 	const minutes = Math.floor(seconds / 60);
// 	const remainingSeconds = seconds % 60;
// 	return `${minutes}m ${remainingSeconds}s`;
// }

// function formatDate(dateString: string): string{
// 	return new Date(dateString).toLocaleDateString("en-GB", {
// 	  day: "numeric",
// 	  month: "short",
// 	  year: "numeric",
// 	});
// }

// export default function HistoryPage()
// {
// 	return (
// 	  <SideNav>
// 		<div className="p-8 text-[#eef2f8]">
	
// 		  {/* Page header */}
// 		  <div className="mb-6">
// 			<h1 className="text-2xl font-bold">Match History</h1>
// 			<p className="text-sm text-[#5d6877] mt-1">{matchHistory.length} matches total</p>
// 		  </div>
	
// 		  {/* Match list */}
// 		  <div className="flex flex-col gap-3">
// 			{matchHistory.map((match) => (
// 			  <div key={match.id} className="rounded-[7px] border border-white/[.07] bg-[#0f131b] p-4 hover:border-white/[.12] transition-colors">
	
// 				{/* Top row: opponent + result badge */}
// 				<div className="flex items-center justify-between mb-3">
// 				  <div>
// 					<span className="text-xs uppercase tracking-wide text-[#5d6877]">vs</span>
// 					<span className="text-sm font-semibold ml-1">{match.opponent}</span>
// 				  </div>
// 				  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${getResultBadgeStyle(match.result)}`}>
// 					{match.result}
// 				  </span>
// 				</div>
	
// 				{/* Stats row */}
// 				<div className="grid grid-cols-2 md:grid-cols-4 gap-3">
// 				  <div>
// 					<div className="text-[10px] uppercase tracking-wide text-[#5d6877]">Final Capital</div>
// 					<div className="text-sm font-semibold mt-0.5">
// 					  ${match.final_capital.toLocaleString(undefined, { minimumFractionDigits: 2 })}
// 					</div>
// 				  </div>
	
// 				  <div>
// 					<div className="text-[10px] uppercase tracking-wide text-[#5d6877]">Net PnL</div>
// 					<div className={`text-sm font-semibold mt-0.5 ${getResultColor(match.result)}`}>
// 					  {match.realized_pnl > 0 ? "+" : ""}{match.realized_pnl.toLocaleString(undefined, { minimumFractionDigits: 2 })}
// 					</div>
// 				  </div>
	
// 				  <div>
// 					<div className="text-[10px] uppercase tracking-wide text-[#5d6877]">Symbol</div>
// 					<div className="text-sm font-semibold mt-0.5 font-mono">{match.symbol}</div>
// 				  </div>
	
// 				  <div>
// 					<div className="text-[10px] uppercase tracking-wide text-[#5d6877]">Duration</div>
// 					<div className="text-sm font-semibold mt-0.5">{formatDuration(match.starts_at, match.ends_at)}</div>
// 				  </div>
// 				</div>
	
// 				{/* Bottom row: date */}
// 				<div className="mt-3 pt-3 border-t border-white/[.04]">
// 				  <span className="text-[10px] text-[#5d6877]">{formatDate(match.starts_at)}</span>
// 				</div>
	
// 			  </div>
// 			))}
// 		  </div>
	
// 		</div>
// 	  </SideNav>
// 	);
// }

"use client";

import {useState, useMemo } from "react";
import { SideNav } from "../components/duel/side-nav";
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

const matchHistory = [
	{ id: "550e8400-e29b-41d4-a716-446655440001", opponent: "satoshi_jr", result: "WIN", symbol: "BTCUSDT", starting_capital: 10000, final_capital: 11250.00, realized_pnl: 1250.00, starts_at: "2026-07-06T14:00:00Z", ends_at: "2026-07-06T14:02:00Z" },
	{ id: "550e8400-e29b-41d4-a716-446655440002", opponent: "delta_neutral", result: "LOSS", symbol: "BTCUSDT", starting_capital: 10000, final_capital: 8450.00, realized_pnl: -1550.00, starts_at: "2026-07-05T10:00:00Z", ends_at: "2026-07-05T10:01:00Z" },
	{ id: "550e8400-e29b-41d4-a716-446655440003", opponent: "apex_07", result: "WIN", symbol: "BTCUSDT", starting_capital: 10000, final_capital: 12100.25, realized_pnl: 2100.25, starts_at: "2026-07-04T16:00:00Z", ends_at: "2026-07-04T16:03:00Z" },
	{ id: "550e8400-e29b-41d4-a716-446655440004", opponent: "nightowl", result: "DRAW", symbol: "BTCUSDT", starting_capital: 10000, final_capital: 10000.00, realized_pnl: 0.00, starts_at: "2026-07-03T20:00:00Z", ends_at: "2026-07-03T20:01:30Z" },
	{ id: "550e8400-e29b-41d4-a716-446655440005", opponent: "shortking", result: "LOSS", symbol: "BTCUSDT", starting_capital: 10000, final_capital: 7800.00, realized_pnl: -2200.00, starts_at: "2026-07-02T09:00:00Z", ends_at: "2026-07-02T09:02:00Z" },
	{ id: "550e8400-e29b-41d4-a716-446655440006", opponent: "moonboy42", result: "WIN", symbol: "BTCUSDT", starting_capital: 10000, final_capital: 10850.50, realized_pnl: 850.50, starts_at: "2026-07-01T12:00:00Z", ends_at: "2026-07-01T12:01:45Z" },
	{ id: "550e8400-e29b-41d4-a716-446655440007", opponent: "liquidator", result: "WIN", symbol: "BTCUSDT", starting_capital: 10000, final_capital: 13200.00, realized_pnl: 3200.00, starts_at: "2026-06-30T18:00:00Z", ends_at: "2026-06-30T18:02:30Z" },
];

function getResultColor(result: string): string
{
	if (result === "WIN")
		return "text-emerald-400";
	if (result === "LOSS")
		return "text-rose-400";
	return "text-gray-400";
}

function getResultGlow(result: string): string
{
	if (result === "WIN")
		return "shadow-[inset_3px_0_0_0_#34d399] hover:shadow-[inset_3px_0_0_0_#34d399,0_0_20px_-5px_rgba(52,211,153,0.3)]";
	if (result === "LOSS")
		return "shadow-[inset_3px_0_0_0_#fb7185] hover:shadow-[inset_3px_0_0_0_#fb7185,0_0_20px_-5px_rgba(251,113,133,0.3)]";
	return "shadow-[inset_3px_0_0_0_#6b7280] hover:shadow-[inset_3px_0_0_0_#6b7280,0_0_20px_-5px_rgba(107,114,128,0.2)]";
}

function getResultBadgeStyle(result: string): string
{
	if (result === "WIN")
		return "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-[0_0_10px_-3px_rgba(52,211,153,0.4)]";
	if (result === "LOSS")
		return "bg-rose-500/10 text-rose-400 border border-rose-500/30 shadow-[0_0_10px_-3px_rgba(251,113,133,0.4)]";
	return "bg-gray-500/10 text-gray-400 border border-gray-500/30";
}

function formatDuration(starts_at: string, ends_at: string): string
{
	const seconds = Math.round((new Date(ends_at).getTime() - new Date(starts_at).getTime()) / 1000);
	const minutes = Math.floor(seconds / 60);
	const remainingSeconds = seconds % 60;
	return `${minutes}m ${remainingSeconds}s`;
}

function getRelativeTime(dateString: string): string
{
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
		return '${diffMins} minutes ago';
	if (diffHours < 24)
		return '${diffHours} hours ago';
	if (diffDays < 7)
		return '${diffDays} days ago';
	if (diffDays < 30)
		return '{Math.floor(diffDays / 7)} weeks ago';
	if (diffDays < 365)
		return '{Math.floor(diffDays / 30)} months ago';
	return '${Math.floor(diffDays / 365)} years ago';
}

function formatMoney(value: number): string
{
	const sign = value > 0 ? "+" : "";
	return '${sign}$${Math.abs(value).toLocalString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2})}';
}

function formatPct(value: number, base: number): string
{
	const pct = (value / base) * 100;
	const sign = pct > 0 ? "+" : "";
	return `${sign}${pct.toFixed(2)}%`;
}