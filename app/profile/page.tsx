export default function ProfilePage() {
	const userStats = {
		username: "Tigger",
		gamesPlayed: 12,
		wins: 7,
		losses: 4,
		draws: 1,
		winPercentage: 58.3,
	};

	return (
		<div className="p-8 text-[#eef2f8]">
			<h1 className="text-2xl font-bold mb-6">{userStats.username}</h1>

			<div className="grid grid-cols-2 md:grid-cols-3 gap-4">
				<div className="rounded-[7px] border border-white/[.07] bg-[#0f131b] p-4">
					<div className="text-xs uppercase tracking-wide text-[#5d6877]">Games played</div>
					<div className="text-xl font-semibold mt-1">{userStats.gamesPlayed}</div>
				</div>

				<div className="rounded-[7px] border border-white/[.07] bg-[#0f131b] p-4">
					<div className="text-xs uppercase tracking-wide text-[#5d6877]">Wins</div>
					<div className="text-xl font-semibold mt-1">{userStats.wins}</div>
				</div>

				<div className="rounded-[7px] border border-white/[.07] bg-[#0f131b] p-4">
					<div className="text-xs uppercase tracking-wide text-[#5d6877]">Losses</div>
					<div className="text-xl font-semibold mt-1">{userStats.losses}</div>
				</div>

				<div className="rounded-[7px] border border-white/[.07] bg-[#0f131b] p-4">
					<div className="text-xs uppercase tracking-wide text-[#5d6877]">Draws</div>
					<div className="text-xl font-semibold mt-1">{userStats.draws}</div>
				</div>

				<div className="rounded-[7px] border border-white/[.07] bg-[#0f131b] p-4">
					<div className="text-xs uppercase tracking-wide text-[#5d6877]">Win %</div>
					<div className="text-xl font-semibold mt-1">{userStats.winPercentage}%</div>
				</div>
			</div>
		</div>
	);
}