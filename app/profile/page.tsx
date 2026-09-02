import { SideNav } from "../components/duel/side-nav";
import { Avatar } from "../components/duel/avatar";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Sword, TrendingUp, Layers } from "lucide-react";
import { profile } from "console";


function getRiskRating(wins: number, losses: number): string {
	if (wins > losses)
		return "Pro";
	if (wins === losses)
		return "Amateur";
	return "Beginner";
}

function getRiskRatingColor(rating: string): string {
	if (rating === "Pro")
		return "text-emerald-400";
	if (rating === "Amateur")
		return "text-amber-400";
	return "text-rose-400";
}

function getAchievements(wins: number) {
	return [
		{
			id: "create_an_account",
			name: "Funded & Ready",
			description: "Register an account",
			requirement: 0,
			unlocked: wins >= 0,
			icon: "🌱",
		},
		{
			id: "first_5_wins",
			name: "Greenhorn Trader",
			description: "Win 5 matches",
			requirement: 5,
			unlocked: wins >= 5,
			icon: "📈",
		},
		{
			id: "first_10_wins",
			name: "Market Competitor",
			description: "Win 10 matches",
			requirement: 10,
			unlocked: wins >= 10,
			icon: "🐋",
		},
		{
			id: "first_42_wins",
			name: "42",
			description: "The answer to everything",
			requirement: 42,
			unlocked: wins >= 42,
			icon: "💻",
		},
		{
			id: "first_500_wins",
			name: "Market Veteran",
			description: "Win 500 matches",
			requirement: 500,
			unlocked: wins >= 500,
			icon: "🏛️",
		},
		{
			id: "first_1000_wins",
			name: "Trading Champion",
			description: "Win 1,000 matches",
			requirement: 1000,
			unlocked: wins >= 1000,
			icon: "👑",
		},
	];
}

export default async function ProfilePage() {
	const supabase = await createSupabaseServerClient();
	// Create Connection to SubaBase. 
	// Benefits- Code is running on Next.js server, not Browser.
	//			 Helps ensure security, User can control and potentially
	//			 bypass by manipulating Javascipt.
	const { data: { user } } = await supabase.auth.getUser();
	// Checks cookies for user logged in.

	if (!user) {
		redirect("/login");
	}

	const { data: matches, error } = await supabase
		.from("matches")
		.select(`
		winner_user_id,
		player_one_user_id,
		player_two_user_id,
		status
	`)
		.or(`player_one_user_id.eq.${user.id},player_two_user_id.eq.${user.id}`)
		.eq("status", "completed");

	console.log("Matches:", matches);
	console.log("Error:", error);

	let wins = 0;
	let losses = 0;
	let draws = 0;

	for (const match of matches ?? []) {
		if (!match.winner_user_id) {
			draws++;
		} else if (match.winner_user_id === user.id) {
			wins++;
		} else {
			losses++;
		}
	}

	const gamesPlayed = wins + losses + draws;

	const winPercentage =
		gamesPlayed === 0
			? 0
			: Number(((wins / gamesPlayed) * 100).toFixed(1));

	const achievements = getAchievements(wins);

	const { data: profile } = await supabase
		.from("profiles")
		.select("username")
		.eq("id", user.id)
		.single();

	const userStats = {
		username: profile?.username ?? "Unknown",
		gamesPlayed,
		wins,
		losses,
		draws,
		winPercentage,
	};

	const riskRating = getRiskRating(userStats.wins, userStats.losses);

	return (
		<SideNav user={userStats.username}>
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
				{/* Achievements */}
				<div className="mt-8 rounded-[10px] border border-white/[.10] bg-[#0f131b] p-5">
					<div className="text uppercase tracking-wide text-[#5d6877] mb-4">
						Achievements
					</div>

					<div className="grid grid-cols-2 gap-4">
						{achievements.map((achievement) => (
							<div
								key={achievement.id}
								className={`rounded-[7px] border p-4 ${achievement.unlocked
									? "border-emerald-500/30 bg-emerald-500/[.05]"
									: "border-white/[.07] bg-white/[.02] opacity-40"
									}`}
							>
								<div className="flex items-center gap-3">
									<div className="text-2xl">
										{achievement.icon}
									</div>

									<div>
										<div className="font-semibold">
											{achievement.name}
										</div>

										<div className="text-sm text-[#5d6877]">
											{achievement.description}
										</div>
									</div>
								</div>

								<div className="mt-3 text-xs">
									{achievement.unlocked ? (
										<span className="text-emerald-400">
											Unlocked
										</span>
									) : (
										<span className="text-[#5d6877]">
											{wins}/{achievement.requirement} wins
										</span>
									)}
								</div>
							</div>
						))}
					</div>
				</div>
			</div>
		</SideNav>
	);
}

