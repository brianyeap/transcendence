export default function ProfilePage() {
	const userStats = {
		username: "  Somebody, Maybe Nobody!  ",
		gamesPlayed: 12,
		wins: 7, 
		losses: 4,
		draws: 1,
		winPercentage: 58.3,
	};
	return (
		<div className="p-8 text=[#eef2f8">
			<h1 className="text-2x1 font-bold mb-6">{userStats.username}</h1>

			<div className="grid grid-cols-2 md:grid-cols-3 gap-4">
				<div className="rounded-[7px] border border-white/[.07] bg-[#of131b] p-4">
				<div className="text-xs uppercase tracking-wide text-[#5d6877]">Games Played</div>
				<div className="text-xl font-semibold mt-1">{userStats.username}</div>
			</div>
				
			 {/* {userStats.wins}</p>
			{userStats.losses}</p>
			{userStats.draws}</p>
			 {userStats.winPercentage}</p> */}
			 </div>
		</div>
	);
}