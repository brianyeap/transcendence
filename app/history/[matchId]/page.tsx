import { SideNav } from "@/app/components/duel/side-nav";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { TrendingUp, TrendingDown, Clock, ArrowLeft, Swords } from "lucide-react";
import Link from "next/link";

// --- Helper Functions ---
function formatMoney(value: number): string
{
	const sign = value > 0 ? "+" : "";
	return `${sign}$${Math.abs(value).toLocaleString(undefined, {
	minimumFractionDigits: 2,
	maximumFractionDigits: 2,
	})}`;
}

function formatDuration(starts_at: string, ends_at: string): string
{
	const seconds = Math.round((new Date(ends_at).getTime() - new Date(starts_at).getTime()) / 1000);
	const minutes = Math.floor(seconds / 60);
	const remainingSeconds = seconds % 60;
	return `${minutes}m ${remainingSeconds}s`;
}

function formatDateTime(dateString: string): string
{
	return new Date(dateString).toLocaleDateString("en-GB", {
		day: "numeric",
		month: "short",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
}

function getPnLColor(value: number): string
{
	if (value > 0)
		return "text-emerald-400";
	if (value < 0)
		return "text-rose-400";
	return "text-gray-400";
}

const mockMatch = 
{
	id: "550e8400-e29b-41d4-a716-446655440001",
	symbol: "BTCUSDT",
	starting_capital: 10000,
	starts_at: "2026-07-06T14:00:00Z",
	ends_at: "2026-07-06T14:02:00Z",
	final_price: 107250.50,
	status: "completed",
	winner_username: "Trancendance",
	players: [
		{
			user_id: "current-user-uuid",
			username: "Trancendance",
			final_capital: 11250.00,
			realized_pnl: 1250.00,
			is_current_user: true, 
		},
		{
			user_id: "opponent-uuid",
			username: "satoshi_jr",
			final_capital: 8750.00,
			realized_pnl: -1250.00,
			is_current_user: false,
		}
	],
	trades: [
		{
			id: "trade-001",
			user_id: "current-user-uuid",
			username: "Tigger",
			side: "long",
			amount_usdt: 5000,
			execution_price: 106000.00,
			executed_at: "2026-07-06T14:00:30Z",
			candle_sequence: 1,
		},
		{
			id: "trade-002",
			user_id: "opponent-uuid",
			username: "satoshi_jr",
			side: "short",
			amount_usdt: 8000,
			execution_price: 106500.00,
			executed_at: "2026-07-06T14:01:00Z",
			candle_sequence: 2,
		},
		{
			id: "trade-003",
			user_id: "current-user-uuid",
			username: "Tigger",
			side: "short",
			amount_usdt: 5000,
			execution_price: 107250.50,
			executed_at: "2026-07-06T14:01:45Z",
			candle_sequence: 4,
		},
	],
};

// --- Server Component ---
export default async function MatchDetailPage({
	params,
}: {
	params: { matchId: string };
}) {
	// Auth Guard
	const supabase = await createSupabaseServerClient();
	const { data: { user } } = await supabase.auth.getUser();

	if (!user)
	{
		redirect("/login");
	}

	// In real version: fetch from Supabase using params.matchId
	const match = mockMatch;

	const currentPlayer = match.players.find((p) => p.is_current_user)!;
	const opponent = match.players.find((p) => !p.is_current_user)!;
	const userWon = currentPlayer.realized_pnl > opponent.realized_pnl;
	const isDraw = currentPlayer.realized_pnl === opponent.realized_pnl;
	const result = isDraw ? "DRAW" : userWon ? "WIN" : "LOSS";

	return (
		<SideNav user={user?.email ?? "Unknown"}>
			<div className="p-6 md:p-8 text-[#eef2f8] max-w-5xl mx-auto">

				{/* BACK BUTTON */}
				<Link
					href="/history"
					className="inline-flex items-center gap-2 text-sm text-[#5d6877] hover:text-[#eef2f8] transition-colors mb-6"
				>
					<ArrowLeft className="w-4 h-4" />
					Back to History
				</Link>

				{/* MATCH RESULT HERO BANNER */}
				<div className={`rounded-[10px] border p-6 mb-6 ${
					result === "WIN"
						? "border-emerald-500/30 bg-emerald-500/5"
						: result === "LOSS"
						? "border-rose-500/30 bg-rose-500/5"
						: "border-gray-500/30 bg-gray-500/5"
				}`}>
					<div className="flex items-center justify-between flex-wrap gap-4">

						{/* Result label */}
						<div>
							<div className={`text-3xl font-bold mb-1 ${
								result === "WIN" ? "text-emerald-400" :
								result === "LOSS" ? "text-rose-400" : "text-gray-400"
							}`}>
								{result === "WIN" ? "Victory" : result === "LOSS" ? "Defeat" : "Draw"}
							</div>
							<div className="text-sm text-[#5d6877]">
								{match.symbol} · {formatDuration(match.starts_at, match.ends_at)}
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
								<span className="text-[10px] text-[#5d6877] mt-1">VS</span>
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
								<Clock className="w-3 h-3" /> Start Time
								</div>
									<div className="text-sm font-semibold">{formatDateTime(match.starts_at)}</div>
							</div>

							<div className="rounded-[7px] border border-white/[.07] bg-[#0f131b] p-4">
								<div className="text-[10px] uppercase tracking-wide text-[#5d6877] flex items-center gap-1 mb-1">
									<Clock className="w-3 h-3" /> End Time
								</div>
								<div className="text-sm font-semibold">{formatDateTime(match.ends_at)}</div>
							</div>

							  <div className="rounded-[7px] border border-white/[.07] bg-[#0f131b] p-4">
								<div className="text-[10px] uppercase tracking-wide text-[#5d6877] mb-1">Duration</div>
								<div className="text-sm font-semibold">{formatDuration(match.starts_at, match.ends_at)}</div>
							</div>

							<div className="rounded-[7px] border border-white/[.07] bg-[#0f131b] p-4">
								<div className="text-[10px] uppercase tracking-wide text-[#5d6877] mb-1">Final Price</div>
								<div className="text-sm font-semibold font-mono">
									${match.final_price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
								</div>
							</div>
						</div>

						{/* CHART PLACEHOLDER */}
						<div className="rounded-[10px] border border-white/[.07] bg-[#0f131b] p-5 mb-6">
								<div className="flex items-center gap-2 mb-4">
									<TrendingUp className="w-4 h-4 text-[#4d86ff]" />
									<span className="text-sm font-semibold">Match Chart</span>
									<span className="text-[10px] text-[#5d6877] border border-white/[.07] rounded px-2 py-0..5 ml-auto">
										Coming soon - requires match_candles data from backend
									</span>
								</div>
								<div className="h-48 rounded-md bg-white/[.02] border border-white/[.04] flex items-center justify-center">
									<div className="text-center">
										<TrendingUp className="w-8 h-8 text-[#5d6877] mx-auto mb-2 opacity-40" />
										<p className="text-sm text-[#5d6877]">Chart will render here</p>
										<p className="text-[10px] text-[#5d6877] mt-1 opacity-60">
											match_candles table · match_id: {match.id.slice(0, 8)}...
										</p>
									</div>
								</div>
							</div>
						</div>

						{/* TRADE TABLE */}
						<div className="rounded-[10px] border border-white/[.07] bg-[#0f131b] overflow-hidden">
							<div className="px-4 py-3 border-b border-white/[.05] flex item-center gap-2">
								<TrendingUp className="w-4 h-4 text-[#4d86ff]" />
								<span className="text-sm font-semibold"> Trade Log</span>
								<span className="text-[10px] text-[#5d6877]  ml-auto">{match.trades.length} trades</span>
							</div>
							<div className="grid grid-cols-5 px-4 py-2 border-b border-white/[.04]">
								{["Player", "Side", "Amount", "Price", "Time"].map((col) => (
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
													you
												</span>
											)}
										</div>
										<div className="flex items-center gap-1">
											{trade.side === "long" ? (
												<TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
											) : (
												<TrendingDown className="w-3.5 h-3.5 text-rose-400" />
											)}
											<span className={`text-sm font-semibold capitalize ${
												trade.side === "long" ? "text-emerald-400" : "text-rose-400"
											}`}>
												{trade.side}
											</span>
										</div>
										<div className="text-sm font-mono">
											${trade.amount_usdt.toLocaleString(undefined, { minimumFractionDigits: 2 })}
										</div>
										<div className="text-[11px] text-[#5d6877]">
											{new Date(trade.executed_at).toLocaleTimeString("en-GB", {
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

