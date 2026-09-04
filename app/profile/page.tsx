// // version-2/ProfilePage.tsx
// // The "I just learned basics" version - extremely basic

// import { SideNav } from "../components/duel/side-nav";
// import { Avatar } from "../components/duel/avatar";
// import { redirect } from "next/navigation";
// import { createSupabaseServerClient } from "@/lib/supabase/server";

// function getRiskRating(wins: number, losses: number): string {
// 	if (wins > losses) return "Pro";
// 	if (wins === losses) return "Amateur";
// 	return "Beginner";
// }

// function getAchievements(wins: number) {
// 	return [
// 		{
// 			id: "create_an_account",
// 			name: "Funded & Ready",
// 			description: "Register an account",
// 			requirement: 0,
// 			unlocked: wins >= 0,
// 		},
// 		{
// 			id: "first_5_wins",
// 			name: "Greenhorn Trader",
// 			description: "Win 5 matches",
// 			requirement: 5,
// 			unlocked: wins >= 5,
// 		},
// 		{
// 			id: "first_10_wins",
// 			name: "Market Competitor",
// 			description: "Win 10 matches",
// 			requirement: 10,
// 			unlocked: wins >= 10,
// 		},
// 		{
// 			id: "first_42_wins",
// 			name: "42",
// 			description: "The answer to everything",
// 			requirement: 42,
// 			unlocked: wins >= 42,
// 		},
// 		{
// 			id: "first_500_wins",
// 			name: "Market Veteran",
// 			description: "Win 500 matches",
// 			requirement: 500,
// 			unlocked: wins >= 500,
// 		},
// 		{
// 			id: "first_1000_wins",
// 			name: "Trading Champion",
// 			description: "Win 1,000 matches",
// 			requirement: 1000,
// 			unlocked: wins >= 1000,
// 		},
// 	];
// }

// export default async function ProfilePage() {
// 	const supabase = await createSupabaseServerClient();
// 	const { data: { user } } = await supabase.auth.getUser();

// 	if (!user) {
// 		redirect("/login");
// 	}

// 	const { data: matches } = await supabase
// 		.from("matches")
// 		.select(`winner_user_id, player_one_user_id, player_two_user_id, status`)
// 		.or(`player_one_user_id.eq.${user.id},player_two_user_id.eq.${user.id}`)
// 		.eq("status", "completed");

// 	let wins = 0;
// 	let losses = 0;
// 	let draws = 0;

// 	for (const match of matches ?? []) {
// 		if (!match.winner_user_id) {
// 			draws++;
// 		} else if (match.winner_user_id === user.id) {
// 			wins++;
// 		} else {
// 			losses++;
// 		}
// 	}

// 	const gamesPlayed = wins + losses + draws;
// 	const winPercentage = gamesPlayed === 0 ? 0 : Number(((wins / gamesPlayed) * 100).toFixed(1));
// 	const achievements = getAchievements(wins);

// 	const { data: profile } = await supabase
// 		.from("profiles")
// 		.select("username")
// 		.eq("id", user.id)
// 		.single();

// 	const userStats = {
// 		username: profile?.username ?? "Unknown",
// 		gamesPlayed,
// 		wins,
// 		losses,
// 		draws,
// 		winPercentage,
// 	};

// 	const riskRating = getRiskRating(userStats.wins, userStats.losses);

// 	return (
// 		<SideNav user={userStats.username}>
// 			<div style={{ padding: "20px", color: "white" }}>
// 				<div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
// 					<Avatar name={userStats.username} size="lg" />
// 					<div>
// 						<h1 style={{ fontSize: "24px", fontWeight: "bold" }}>{userStats.username}</h1>
// 						<p style={{ fontSize: "14px", color: "gray" }}>
// 							Risk Rating: <b>{riskRating}</b>
// 						</p>
// 					</div>
// 				</div>

// 				<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
// 					<div style={{ border: "1px solid gray", padding: "20px" }}>
// 						<div>Games played</div>
// 						<div style={{ fontSize: "20px", fontWeight: "bold" }}>{userStats.gamesPlayed}</div>
// 					</div>

// 					<div style={{ border: "1px solid gray", padding: "20px" }}>
// 						<div>Win %</div>
// 						<div style={{ fontSize: "20px", fontWeight: "bold" }}>{userStats.winPercentage}%</div>
// 					</div>
// 				</div>

// 				<div style={{ marginTop: "20px", border: "1px solid gray", padding: "15px" }}>
// 					<div>Match Outcome Distribution</div>

// 					<div style={{ height: "30px", width: "100%", display: "flex", marginTop: "10px" }}>
// 						<div
// 							style={{
// 								width: `${(userStats.wins / userStats.gamesPlayed) * 100}%`,
// 								background: "green",
// 							}}
// 						></div>
// 						<div
// 							style={{
// 								width: `${(userStats.losses / userStats.gamesPlayed) * 100}%`,
// 								background: "red",
// 							}}
// 						></div>
// 						<div
// 							style={{
// 								width: `${(userStats.draws / userStats.gamesPlayed) * 100}%`,
// 								background: "gray",
// 							}}
// 						></div>
// 					</div>

// 					<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px", marginTop: "10px" }}>
// 						<div style={{ border: "1px solid gray", padding: "10px" }}>
// 							<div>Wins</div>
// 							<div style={{ fontSize: "18px", color: "green" }}>{userStats.wins}</div>
// 						</div>

// 						<div style={{ border: "1px solid gray", padding: "10px" }}>
// 							<div>Losses</div>
// 							<div style={{ fontSize: "18px", color: "red" }}>{userStats.losses}</div>
// 						</div>

// 						<div style={{ border: "1px solid gray", padding: "10px" }}>
// 							<div>Draws</div>
// 							<div style={{ fontSize: "18px", color: "gray" }}>{userStats.draws}</div>
// 						</div>
// 					</div>
// 				</div>

// 				<div style={{ marginTop: "20px", border: "1px solid gray", padding: "15px" }}>
// 					<div>Achievements</div>

// 					<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginTop: "10px" }}>
// 						{achievements.map((achievement) => (
// 							<div
// 								key={achievement.id}
// 								style={{
// 									border: "1px solid gray",
// 									padding: "15px",
// 									opacity: achievement.unlocked ? 1 : 0.4,
// 								}}
// 							>
// 								<div style={{ fontWeight: "bold" }}>{achievement.name}</div>
// 								<div style={{ fontSize: "14px", color: "gray" }}>{achievement.description}</div>
// 								<div style={{ fontSize: "12px", marginTop: "10px" }}>
// 									{achievement.unlocked ? (
// 										<span style={{ color: "green" }}>Unlocked</span>
// 									) : (
// 										<span style={{ color: "gray" }}>
// 											{wins}/{achievement.requirement} wins
// 										</span>
// 									)}
// 								</div>
// 							</div>
// 						))}
// 					</div>
// 				</div>
// 			</div>
// 		</SideNav>
// 	);
// }


{/* Date : 3/9/2026 .
	- The modification of the Profile page starts here, I realized that this page is too simple and there are many tools online which I
	I can use to my advantage, for example Daisy UI is a website that provides the code for components found in most web-pages now days.
	But I would also like to incorporate some newer things too. Thus I am going to work on this profile page, but then use the previously made helpers to my advantage.

	COMING UP :
	- Banner.
	- Profile Pic.
	- Light Dark Mode.
	- Adding Picture to Banner.
	- Adding colour for default banner.
	
*/}

import { SideNav } from "../components/duel/side-nav";
// Importing the Sidenav for it to be displayed in this page.
import { redirect } from "next/navigation";
// 
import { createSupabaseServerClient } from "@/lib/supabase/server";
//

export default async function ProfilePage()
{
	const supabase = await createSupabaseServerClient();
	const { data: { user } } = await supabase.auth.getUser();

	if (!user)
	{
		redirect("/login");
	}

	// Fetch user's profile data from DB
	const { data: profile } = await supabase
		.from("profiles")
		.select("username")
		.eq("id", user.id)
		.single();

	const username = profile?.username ?? "Unknown";

	return(

		<SideNav user={username}>
			{/* Blank Main Canvas */}
			<main className="min-h-screen w-full bg-[#0a0c10] text-white">
				{/* Compact Banner would come right here.. ! */}
			</main>
		</SideNav>
	);
}
