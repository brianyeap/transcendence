import { Sword, TrendingUp } from "lucide-react";
import { Avatar } from "../components/duel/avatar";

function getRiskRating(wins:number, losses:number): string
{
	if (wins > losses)
		return "Pro";
	if (wins === losses)
		return "Ammature";
	return "Beginner";
}

function getRiskRatingColor(rating: string): string
{
	if (rating === "Pro")
		return "text-emerald-400";
	if (rating === "Amature")
		return "text-amber-400";
	return "text-rose-400";
}

export default function ProfilePage() {
	const userStats = {
		username: "Transcendance",
		gamesPlayed: 12,
		wins: 7,
		losses: 4,
		draws: 1,
		winPercentage: 58.3,
	};
	const riskRating = getRiskRating(userStats.wins, userStats.losses);

	return (
		<div className="p-8 text-[#eef2f8]">
			<div className="flex items-center gap-4 mb-8">
				<Avatar name={userStats.username} size="lg" />
				<div>
					<h1 className="text-2xl font-bold">{userStats.username}</h1>
					<p className="text-sm text-[#5d6877] mt-1"> Risk Rating : <span className={`font-semibold ${getRiskRatingColor(riskRating)}`}>{riskRating}</span></p>
				</div>
			</div>

			<div className="grid grid-cols-2 gap-4">
				<div className="rounded-[7px] border border-white/[.07] bg-[#0f131b] p-6">
					<div className="text-s uppercase tracking-wide text-[#5d6877]">Games played</div>
					<div className="text-xl font-semibold mt-1">{userStats.gamesPlayed}</div>
				</div>

				<div className="rounded-[7px] border border-white/[.07] bg-[#0f131b] p-6">
					<div className="text-s uppercase tracking-wide text-[#5d6877]">Win %</div>
					<div className="text-xl font-semibold mt-1">{userStats.winPercentage}%</div>
				</div>
			</div>
			{/* Distribution Bar */}
			<div className="mt-8 rounded-[10px] border border-white/[.10] bg-[#0f131b] p-5">
				<div className="text uppercase tracking-wide text-[#5d6877] mb-2">Match Outcome Distribution</div>

				<div className="h-10 w-full rounded-md overflow-hidden flex border border-black/40">
					<div
						style={{ width: `${(userStats.wins / userStats.gamesPlayed) * 100}%` }}
						className="bg-emerald-600"
					>
					</div>
					<div
						style={{ width: `${(userStats.losses / userStats.gamesPlayed) * 100}%` }}
						className="bg-rose-800"
					>
					</div>
					<div
						style={{ width: `${(userStats.draws / userStats.gamesPlayed) * 100}%` }}
						className="bg-gray-500"
					>
					</div>
				</div>

				{/* Legend
				<div className="mt-3 flex item-center gap-4 text-s text-[#5d6877]">
					<div className="flex items-center gap-1.5">
						<span className="h-3 w-3 rounded-full bg-emerald-500"  />
						<div>
							<div>Wins</div>
							<div className="text-[10px] text-[#5d6877]/60 italic">Profitable Swaps</div>
						</div>
					</div>
					<div className="flex items-center gap-1.5">	
						<span className="h-3 w-3 rounded-full bg-rose-600"  />
						<div>
							<div>Losses</div>
							<div className="text-[10px] text-[#5d6877]/60 italic">Reversed Margins</div>

						</div>
					</div>
					<div className="flex items-center gap-1.5">
						<span className="h-3 w-3 rounded-full bg-gray-400"  />
						<div>
							<div>Draws</div>
							<div className="text-[10px] text-[#5d6877]/60 italic">Equilibrium Cores</div>
						</div>
					</div>
				</div> */}
				{/*legend V2*/}
				<div className="mt-4 grid grid-cols-3 gap-3 w-full">
					{/* Win Box */}
					<div className="rounded-[7px] border border-white/[.07] bg-white/[.02] p-3">
						<div className="flex items-center gap-1.5">
							<span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
							<span className="text-s font-semibold"> Wins</span>
						</div>
						<div className="text-[14px] text-[#5d6877] italic mt-0.5">Profitable Swaps</div>
						<div className="text-xl font-semibold mt-1 text-emerald-400">{userStats.wins}</div>
					</div>

					<div className="rounded-[7px] border border-white/[.07] bg-white/[.02] p-3">
						<div className="flex items-center gap-1.5">
							<span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
							<span className="text-s font-semibold">Losses</span>
						</div>
						<div className="text-[14px] text-[#5d6877] italic mt-0.5">Reversed Margins</div>
						<div className="text-xl font-semibold mt-1 text-rose-400">{userStats.losses}</div>
					</div>

					<div className="rounded-[7px] border border-white/[.07] bg-white/[.02] p-3">
						<div className="flex items-center gap-1.5">
							<span className="h-2.5 w-2.5 rounded-full bg-gray-500" />
							<span className="text-s font-semibold">Draws</span>
						</div>
						<div className="text-[14px] text-[#5d6877] italic mt-0.5">Equilibrium Cores</div>
						<div className="text-xl font-semibold mt-1 text-gray-500">{userStats.draws}</div>
					</div>
				</div>
			</div>
		</div>
	);
}

