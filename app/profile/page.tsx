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
// For redirects like in the Sidenav and also the Login.
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Avatar } from "../components/duel/avatar";
// Importing for the use of the Avatar.

function getRiskRating(wins: number, losses: number): string
{
	if (wins > losses) return "Pro";
	if (wins === losses) return "Amateur";
	return "Beginner";
}

function generateSandwichUsername(emailOrUsername: string): string
{
	const prefix = emailOrUsername.split("@")[0];

	if(prefix.length <= 7)
	{
		return prefix;
	}

	const firstChar = prefix.charAt(0);
	const lastSixChar = prefix.slice(-6);

	return firstChar + lastSixChar;
}


function fireIcon({unlocked}: {unlocked: boolean})
{
	if(!unlocked)
	{
		return (<svg className="w-7 h-7 stroke-gray-600 fill-none" viewBox="0 0 24 24" strokeWidth="1.5">
			<path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0 1 12 21 8.25 8.25 0 0 1 6.038 7.047 8.287 8.287 0 0 0 9 9.601a8.983 8.983 0 0 1 3.361-6.867 8.21 8.21 0 0 0 3 2.48Z" />
		</svg>);
	}
	
	return (
		<div className="relative flex items-center justify-center w-8 h-8">
			{/* Animated glowy thinggy particles */}
			<span className="absolute -top-1 left-2 w-1.5 h-1.5 bg-amber-400 rounded-full animate-ember-1 pointer-events-none" />
			<span className="absolute -top-2 right-2 w-1 h-1 bg-orange-500 rounded-full animate-ember-2 pointer-events-none" />
			<span className="absolute -top-1.5 left-4 w-1 h-1 bg-yellow-300 rounded-full animate-ember-3 pointer-events-none" />

			{/* Glowing Orange flame */}
			<svg className="w-7 h-7 drop-shadow-[0_0_8px_rgba(249,115,22,0.8)]" viewBox="0 0 24 24" fill="none">
				<path
					d="M15.362 5.214A8.252 8.252 0 0 1 12 21 8.25 8.25 0 0 1 6.038 7.047 8.287 8.287 0 0 0 9 9.601a8.983 8.983 0 0 1 3.361-6.867 8.21 8.21 0 0 0 3 2.48Z"
					className="fill-gradient"
					fill="url(#flameGradient)"
				/>
				<defs>
					<linearGradient id="flameGradient" x1="12" y1="2" x2="12" y2="21" gradientUnits="userSpaceOnUse">
						<stop offset="0%" stopColor="#fef08a" />
						<stop offset="40%" stopColor="#f97316" />
						<stop offset="100%" stopColor="#dc2626" />
					</linearGradient>
				</defs>
			</svg>
		</div>
	);
}


// Box 2: Bronze Medal (5 Wins)
function bronzeMedalIcon({ unlocked }: { unlocked: boolean }) {
	if (!unlocked) {
		return (
			<svg className="w-7 h-7 stroke-gray-600 fill-none" viewBox="0 0 24 24" strokeWidth="1.5">
				<path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
			</svg>
		);
	}

	return (
		<div className="relative flex items-center justify-center w-9 h-9">
			{/* DUAL SPARKLE STAR ANIMATION (Using existing animate-medal-sparkle) */}
			{/* Star 1: Top-Right (Larger) */}
			<div className="absolute -top-0.0 -right-0.5 w-3.5 h-3.5 animate-medal-sparkle pointer-events-none z-10">
				<svg viewBox="0 0 24 24" fill="#fbbf24" className="w-full h-full drop-shadow-[0_0_6px_rgba(251,191,36,0.8)]">
					<path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" />
				</svg>
			</div>

			{/* Star 2: Bottom-Left (Smaller with 1s delay for asynchronous sparkle) */}
			<div className="absolute bottom-[-0px] -left-[1px] w-2.5 h-2.5 animate-ember-2 [animation-delay:700ms] pointer-events-none z-10">
				<svg viewBox="0 0 24 24" fill="#f59e0b" className="w-full h-full drop-shadow-[0_0_4px_rgba(245,158,11,0.8)]">
					<path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" />
				</svg>
			</div>

			{/* METALLIC BRONZE MEDAL SVG */}
			<svg className="w-8 h-8 drop-shadow-[0_4px_12px_rgba(180,83,9,0.45)]" viewBox="0 0 24 24" fill="none">
				{/* WIDER FLAT BLUE RIBBON WITH DARK NAVY STRIPES */}
				<path d="M5 1.5 L8.5 11 H15.5 L19 1.5 Z" fill="url(#blueRibbonBase)" stroke="#1e3a8a" strokeWidth="0.5" strokeLinejoin="miter" />
				<path d="M7.5 1.5 L10 11 H11 L9 1.5 Z" fill="#0f172a" opacity="0.6" />
				<path d="M16.5 1.5 L14 11 H13 L15 1.5 Z" fill="#0f172a" opacity="0.6" />
				<path d="M11.5 1.5 L11.8 11 H12.2 L12.5 1.5 Z" fill="#0f172a" opacity="0.4" />

				{/* OUTER BRONZE MEDAL RIM */}
				<circle cx="12" cy="15.5" r="6.5" fill="url(#trueBronzeGradient)" stroke="#f97316" strokeWidth="0.5" />
				<circle cx="12" cy="15.5" r="5.8" fill="none" stroke="#451a03" strokeWidth="0.5" opacity="0.6" />

				{/* INNER DOTTED BRONZE RING DETAIL */}
				<circle cx="12" cy="15.5" r="4.6" fill="none" stroke="#7c2d12" strokeWidth="0.65" strokeDasharray="1 1" />

				{/* EMBOSSED BRONZE CENTER STAR */}
				<path d="M12 12.2L12.8 14.1L14.8 14.3L13.3 15.7L13.7 17.7L12 16.6L10.3 17.7L10.7 15.7L9.2 14.3L11.2 14.1L12 12.2Z" fill="#451a03" />

				{/* GRADIENT DEFINITIONS */}
				<defs>
					<linearGradient id="trueBronzeGradient" x1="6" y1="9" x2="18" y2="22" gradientUnits="userSpaceOnUse">
						<stop offset="0%" stopColor="#ea580c" />
						<stop offset="30%" stopColor="#cd7f32" />
						<stop offset="70%" stopColor="#9a3412" />
						<stop offset="100%" stopColor="#451a03" />
					</linearGradient>

					<linearGradient id="blueRibbonBase" x1="5" y1="1.5" x2="19" y2="11" gradientUnits="userSpaceOnUse">
						<stop offset="0%" stopColor="#2563eb" />
						<stop offset="50%" stopColor="#1d4ed8" />
						<stop offset="100%" stopColor="#1e3a8a" />
					</linearGradient>
				</defs>
			</svg>
		</div>
	);
}

// Box 3: Silver Medal
function silverMedalIcon({ unlocked }: { unlocked: boolean }) {
	if (!unlocked) {
		return (
			<svg className="w-7 h-7 stroke-gray-600 fill-none" viewBox="0 0 24 24" strokeWidth="1.5">
				<path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
			</svg>
		);
	}

	return (
		<div className="relative flex items-center justify-center w-9 h-9">
			{/* DUAL SPARKLE STAR ANIMATION */}
			{/* Star 1: Top-Right (Cool White / Silver Sparkle) */}
			<div className="absolute top-[7px] -right-[1px] w-3.5 h-3.5 animate-medal-sparkle pointer-events-none z-10">
				<svg viewBox="0 0 24 24" fill="#f8fafc" className="w-full h-full drop-shadow-[0_0_6px_rgba(248,250,252,0.9)]">
					<path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" />
				</svg>
			</div>

			{/* Star 2: Bottom-Left (Cyan-Tinted Sparkle with emberTwo drift) */}
			<div className="absolute bottom-[-0px] -left-[1px] w-2.5 h-2.5 animate-ember-2 [animation-delay:700ms] pointer-events-none z-10">
				<svg viewBox="0 0 24 24" fill="#38bdf8" className="w-full h-full drop-shadow-[0_0_4px_rgba(56,189,248,0.8)]">
					<path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" />
				</svg>
			</div>

			{/* METALLIC SILVER MEDAL SVG */}
			<svg className="w-8 h-8 drop-shadow-[0_4px_12px_rgba(148,163,184,0.45)]" viewBox="0 0 24 24" fill="none">
				{/* WIDER FLAT RED/CRIMSON RIBBON WITH DARK STRIPES */}
				<path d="M5 1.5 L8.5 11 H15.5 L19 1.5 Z" fill="url(#silverRibbonBase)" stroke="#991b1b" strokeWidth="0.5" strokeLinejoin="miter" />
				<path d="M7.5 1.5 L10 11 H11 L9 1.5 Z" fill="#450a0a" opacity="0.6" />
				<path d="M16.5 1.5 L14 11 H13 L15 1.5 Z" fill="#450a0a" opacity="0.6" />
				<path d="M11.5 1.5 L11.8 11 H12.2 L12.5 1.5 Z" fill="#450a0a" opacity="0.4" />

				{/* OUTER SILVER MEDAL RIM */}
				<circle cx="12" cy="15.5" r="6.5" fill="url(#trueSilverGradient)" stroke="#e2e8f0" strokeWidth="0.5" />
				<circle cx="12" cy="15.5" r="5.8" fill="none" stroke="#1e293b" strokeWidth="0.5" opacity="0.5" />

				{/* INNER DOTTED SILVER RING DETAIL */}
				<circle cx="12" cy="15.5" r="4.6" fill="none" stroke="#475569" strokeWidth="0.65" strokeDasharray="1 1" />

				{/* EMBOSSED SILVER CENTER STAR */}
				<path d="M12 12.2L12.8 14.1L14.8 14.3L13.3 15.7L13.7 17.7L12 16.6L10.3 17.7L10.7 15.7L9.2 14.3L11.2 14.1L12 12.2Z" fill="#334155" />

				{/* GRADIENT DEFINITIONS */}
				<defs>
					{/* Authentic Metallic Silver Gradient */}
					<linearGradient id="trueSilverGradient" x1="6" y1="9" x2="18" y2="22" gradientUnits="userSpaceOnUse">
						<stop offset="0%" stopColor="#ffffff" />
						<stop offset="30%" stopColor="#cbd5e1" />
						<stop offset="70%" stopColor="#64748b" />
						<stop offset="100%" stopColor="#334155" />
					</linearGradient>

					{/* Deep Red Ribbon Gradient */}
					<linearGradient id="silverRibbonBase" x1="5" y1="1.5" x2="19" y2="11" gradientUnits="userSpaceOnUse">
						<stop offset="0%" stopColor="#ef4444" />
						<stop offset="50%" stopColor="#dc2626" />
						<stop offset="100%" stopColor="#7f1d1d" />
					</linearGradient>
				</defs>
			</svg>
		</div>
	);
}

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

	const{ data: matches, error } = await supabase
		.from("matches")
		.select("winner_user_id, status")
		.or(`player_one_user_id.eq.${user.id}, player_two_user_id.eq.${user.id}`)
		.eq("status", "completed");

	let wins = 0;
	let losses = 0;
	let draws = 0;

	const rawIdentifier = user.email
		? user.email
		: (profile?.username?.split("_")[0] ?? "Unknown");

	const displayUsername = generateSandwichUsername(rawIdentifier);

	for (const match of matches ?? [] )
	{
		if(match.winner_user_id === user.id)
			wins++;
		else if (match.winner_user_id === null)
			draws++;
		else if (match.winner_user_id)
			losses++;
	}


	const totalMatches = wins + losses + draws;
	const winRate = totalMatches > 0 ? Math.round((wins / totalMatches) * 100 ) : 0;
	const riskRating = getRiskRating(wins, losses);
	const shortUserId = user.id.slice(0, 8);

	return(

		<SideNav user={displayUsername}>
			{/* Main canvas with relative positioning so the glowy-thinggy anchors to it */}
			<main className="relative min-h-screen w-full bg-[#0a0c10] text-white overflow-hidden pb-20">

				{/* AMBIENT BODY GLOW EFFECT */}
				{/* 
					- pointer-events-none: stops the glow overlay from blocking mouse clicks on buttons
					- absolute left-1/2 -translate-x-1/2: centers the glow circle horizontally in the main panel
					- top-5 & blur-[100px]: positions the indigo haze right behind the banner and avatar

					What this line does in a nutshell is that it would make sure that the glow overlay does not block the mouse clicks
					and then it will center the glow circle horizontally in the main panel and finally it will position the indigo haze
					right behind the banner and the avatar.
				*/}
				<div className="pointer-events-none absolute left-1/2 top-5 -translate-x-1/2 h-[450px] w-full max-w-5xl bg-indigo-500/20 blur-[100px] rounded-full" />

				{/* BANNER */}
				<div className="relative w-full">

					{/* The banner background & Dividing Border */}
					{/*
						- h-32 sm:h-36: keeps banner compact so it doesn't take up too much vertical space
						- border-b-[3px] border-white/20: crisp bottom line separating banner from page body
					*/}
					<div className="h-32 sm:h-36 w-full overflow-hidden border-b-[3px] border-white/20 bg-gradient-to-r from-slate-950 via-indigo-900 to-slate-950 relative overflow-hidden">
						{/* Subtle background glow effect, (current version is for the default but then I will change it so that it can be replaced with a image) */}
						<div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-indigo-500/20 via-transparent to-transparent" />
					</div>

					{/* OVERLAPPING AVATAR */}
					{/*
						- absolute left-1/2 -translate-x-1/2: keeps profile picture centered in the main panel
						- style bottom -1.0rem: pushes avatar over the dividing line
						- ring-1 ring-white/20 & scale-530: applies the custom border ring cutout
					*/}
					<div className="absolute left-1/2 -translate-x-1/2" style ={{ bottom: "-1.0rem" }}>
						<div className="rounded-full bg-[#0a0c10] ring-1 ring-white/20 scale-530 overflow-hidden">
							<Avatar name={displayUsername}/>
						</div>
					</div>
				</div>

				{/* CONTENT AREA */}
				{/* Pushing the content down so the overlapping avatar doesn't cover the text or like stats */}
				<div className="mt-16 px-6 sm:mt-26 flex flex-col items-center text-center">

					{/* USERNAME WITH MOTION GLOW AURA */}
					<div className="relative group">
						<div className="absolute -inset-1 rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-70 blur-lg animate-pulse" />

						<h1 className="relative text-2xl sm:text-3xl font-bold tracking-wide text-white">
							{displayUsername}
						</h1>
					</div>
					
					{/* ID & RISK RATING BADGES */}
					<div className="mt-4 flex items-center gap-3">
						<span className="rounded-full border border-white/[0.03] px-3 py-1 text-xs font-mono text-gray-400">
							ID: {shortUserId}
						</span>

						<span className={`rounded-full border px-3 py-1 text-xs font-semibold tracking-wider uppercase ${
							riskRating === "Pro"
							? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
							: riskRating === "Amateur"
							? "border-amber-500/30 bg-amber-500/10 text-amber-400"
							: "border-slate-500/30 bg-slate-500/10 text-slate-400"
						}`}>
							{riskRating} Trader
						</span>
					</div>
					
					{/* PERFORMANCE STATS GRID & WIN/LOSS/DRAW BAR */}
					<div className="w-full mt-10 p-6 rounded-xl bg-white/[0.02] border border-white/10 backdrop-blur-md">
						<div className="flex justify-between items-center mb-4">
							<h2 className="text-xl font-semibold text-gray-200">Performance Stats</h2>
							<span className="text-sm font-mono text-indigo-400">{winRate}% Win Rate</span>
						</div>

						{/* STAT CARDS */}
						<div className="grid grid-cols-3 gap-4 mb-6">
							<div className="p-4 rounded-lg bg-emerald-500/5 border border-emerald-500/20 text-center">
								<p className="text-xs text-emerald-400 uppercase tracking-wider font-semibold">Wins</p>
								<p className="text-2xl font-bold text-emerald-300 mt-1">{wins}</p>
							</div>
							<div className="p-4 rounded-lg bg-amber-500/5 border border-amber-500/20 text-center">
								<p className="text-xs text-amber-400 uppercase tracking-wider font-semibold">Draws</p>
								<p className="text-2xl font-bold text-amber-300 mt-1">{draws}</p>
							</div>
							<div className="p-4 rounded-lg bg-rose-500/5 border border-rose-500/20 text-center">
								<p className="text-xs text-rose-400 uppercase tracking-wider font-semibold">Losses</p>
								<p className="text-2xl font-bold text-rose-300 mt-1">{losses}</p>
							</div>
						</div>

						<div className="w-full h-3 bg-gray-800 rounded-full overflow-hidden flex">
							{totalMatches > 0 ? (
								<>
									<div style={{width: `${(wins / totalMatches) * 100}%` }} className="bg-emerald-500 h-full" title={`Wins: ${wins}`} />
									<div style={{ width: `${(draws / totalMatches) * 100}%` }} className="bg-amber-500 h-full" title={`Draws: ${draws}`} />
									<div style={{ width: `${(losses / totalMatches) * 100}%` }} className="bg-rose-500 h-full" title={`Losses: ${losses}`} />
								</>
							) : (
								<div className="w-full h-full bg-gray-700/50" />
							)}
						</div>
					</div>

					<div className="w-full mt-8 p-6 rounded-xl bg-white/[0.02] border border-white/10 backdrop-blur-md">
						<div className="flex justify-between items-center mb-6">
							<h2 className="text-lg font-semibold text-gray-200">Achievements</h2>
						</div>

						{/* Stack of Achivement box placeholder */}
						<div className="grid grid-cols-2 gap-4 w-full">

							{/* Achievement Box 1[Special Fire] */}
							<div className={`"h-20 rounded-lg border transition-all duration-300 flex items-center justify-between px-4 ${
								wins >= 1
									? "bg-orange-500/[0.03] border-orange-500/30 shadow-[0_0_15px_rgba(249,115,22,0.1)]"
									: "bg-white/[0.01] border-white/5 opacity-40 grayscale"
							}`}>
								<div className="flex items-center gap-4">
									{/* FIRE ICON CONTAINER */}
									<div className={`p-2.5 rounded-lg border ${
										wins >= 1
											? "bg-orange-500/10 border-orange-500/30"
											: "bg-white/[0.02] border-white/10"
									}`}>

										{/* Calling the custom fireIcon function */}
										{fireIcon({unlocked: wins >= 1 })}
								</div>

								{/* Tittle & Description */}
								<div className="text-left">
									<div className="flex items-center gap-2">
										<h3 className={`font-semibold text-sm sm:text-base ${wins >= 1 ? "text-white" : "text-gray-400"}`}>
											First Victory
										</h3>
										<span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${ 
											wins >= 1
												? "bg-orange-500/30 text-orange-400 bg-orange-500/10"
												:"border-gray-700 text-gray-500 bg-gray-800/20"
										}`}>
											Novice
										</span>
									</div>
									<p className="text-xs text-gray-400 mt-0.5"> Win your first duel on the platform !</p>
								</div>
							</div>

							{/* UNLOCKED / LOCKED BADGE */}
							<div className="shrink-0 text-right">
								{wins >= 1 ? (
									<span className="inline-flex items-center gap-1.5 text-xs font-semibold text-orange-400 bg-orange-500/10 border border-orange-500/20 px-2.5 py-1 rounded-md">
										Unlocked
									</span>
								) : (
									<span className="text-xs font-mono text-gray-500 bg-white/[0.02] border border-white/5 px-2.5 py-1 rounded-md">
										1 Win Left.
									</span>
								)}
							</div>
						</div>
							


						{/* ACHIEVEMENT BOX 2: Greenhorn Trader (5 Wins - Bronze) */}
							<div className={`h-20 rounded-lg border transition-all duration-300 flex items-center justify-between px-4 ${
								wins >= 1
									? "bg-amber-600/[0.03] border-amber-600/30 shadow-[0_0_15px_rgba(217,119,6,0.1)]"
									: "bg-white/[0.01] border-white/5 opacity-40 grayscale"
							}`}>
								<div className="flex items-center gap-4">
									{/* BRONZE MEDAL CONTAINER */}
									<div className={`p-2.5 rounded-lg border ${
										wins >= 5
											? "bg-amber-600/10 border-amber-600/30"
											: "bg-white/[0.02] border-white/10"
									}`}>
										{bronzeMedalIcon({ unlocked: wins >= 1 })}
									</div>
									{/* TITLE & DESCRIPTION */}
									<div className="text-left">
										<div className="flex items-center gap-2">
											<h3 className={`font-semibold text-sm sm:text-base ${wins >= 1 ? "text-white" : "text-gray-400"}`}>
												Greenhorn Trader
											</h3>
											<span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
												wins >= 1
													? "border-amber-600/30 text-amber-500 bg-amber-600/10"
													: "border-gray-700 text-gray-500 bg-gray-800/20"
											}`}>
												Bronze
											</span>
										</div>
										<p className="text-xs text-gray-400 mt-0.5">Win 5 matches to earn your Bronze Medal</p>
									</div>
								</div>
								{/* UNLOCKED / LOCKED BADGE */}
								<div className="shrink-0 text-right">
									{wins >= 1 ? (
										<span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-500 bg-amber-600/10 border border-amber-600/20 px-2.5 py-1 rounded-md">
											Unlocked
										</span>
									) : (
										<span className="text-xs font-mono text-gray-500 bg-white/[0.02] border border-white/5 px-2.5 py-1 rounded-md">
											{5 - wins} Wins Left
										</span>
									)}
								</div>
							</div>


							{/* ACHIEVEMENT BOX 3: Market Competitor (10 Wins - Silver) */}
							<div className={`h-20 rounded-lg border transition-all duration-300 flex items-center justify-between px-4 ${
								wins >= 1 // Change to wins >= 10 when done testing
									? "bg-slate-500/[0.03] border-slate-500/30 shadow-[0_0_15px_rgba(148,163,184,0.1)]"
									: "bg-white/[0.01] border-white/5 opacity-40 grayscale"
							}`}>
								<div className="flex items-center gap-4">
									{/* SILVER MEDAL CONTAINER */}
									<div className={`p-2.5 rounded-lg border ${
										wins >= 1
											? "bg-slate-500/10 border-slate-500/30"
											: "bg-white/[0.02] border-white/10"
									}`}>
										{silverMedalIcon({ unlocked: wins >= 1 })}
									</div>

									{/* TITLE & DESCRIPTION */}
									<div className="text-left">
										<div className="flex items-center gap-2">
											<h3 className={`font-semibold text-sm sm:text-base ${wins >= 1 ? "text-white" : "text-gray-400"}`}>
												Market Competitor
											</h3>
											<span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
												wins >= 1
													? "border-slate-500/30 text-slate-300 bg-slate-500/10"
													: "border-gray-700 text-gray-500 bg-gray-800/20"
											}`}>
												Silver
											</span>
										</div>
										<p className="text-xs text-gray-400 mt-0.5">Win 10 matches</p>
									</div>
								</div>

								{/* UNLOCKED / WINS LEFT STATUS BADGE */}
								<div className="shrink-0 text-right">
									{wins >= 1 ? (
										<span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-300 bg-slate-500/10 border border-slate-500/20 px-2.5 py-1 rounded-md">
											Unlocked
										</span>
									) : (
										<span className="text-xs font-mono text-gray-500 bg-white/[0.02] border border-white/5 px-2.5 py-1 rounded-md">
											{10 - wins} Wins Left
										</span>
									)}
								</div>
							</div>



							{/* Achievement Box 3 */}
							<div className="h-20 rounded-lg border border-white/10 bg-white/[0.02] flex items-center justify-between px-4">
								<span className="text-xs font-mono text-gray-500">// Box 4 Placeholder</span>
							</div>
						</div>
					</div>
				</div>
			</main>
		</SideNav>
	);
}
