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
import { getTranslations } from "next-intl/server";
// Server-side translations for next-intl, so every label on this page is locale-aware.
import {
	AchievementCard,
	fireIcon,
	bronzeMedalIcon,
	silverMedalIcon,
	fortyTwoIcon,
	bitcoinIcon,
	treasureChestIcon,
} from "../components/duel/achievement-card";
// The achievement cards are a client component (they need tap-to-expand state),
// so the icons are imported from there too and this page stays a server component.

function getRiskRating(wins: number, losses: number): "pro" | "amateur" | "beginner"
{
	if (wins > losses) return "pro";
	if (wins === losses) return "amateur";
	return "beginner";
}

export default async function ProfilePage()
{
	const supabase = await createSupabaseServerClient();
	const { data: { user } } = await supabase.auth.getUser();

	if (!user)
	{
		redirect("/login");
	}

	const t = await getTranslations("profile");

	// Fetch user's profile data from DB
	const { data: profile } = await supabase
		.from("profiles")
		.select("username, avatar_url")
		.eq("id", user.id)
		.single();

	const username = profile?.username ?? t("unknownUser");
	const avatarUrl = profile?.avatar_url ?? null;

	const{ data: matches, error } = await supabase
		.from("matches")
		.select("winner_user_id, status")
		.or(`player_one_user_id.eq.${user.id}, player_two_user_id.eq.${user.id}`)
		.eq("status", "completed");

	let wins = 0;
	let losses = 0;
	let draws = 0;

	const displayUsername = username;

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
							<Avatar name={displayUsername} imageUrl={avatarUrl}/>
						</div>
					</div>
				</div>

				{/* CONTENT AREA */}
				{/* Pushing the content down so the overlapping avatar doesn't cover the text or like stats */}
				<div className="mt-24 px-6 sm:mt-28 flex flex-col items-center text-center">

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
							riskRating === "pro"
							? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
							: riskRating === "amateur"
							? "border-amber-500/30 bg-amber-500/10 text-amber-400"
							: "border-slate-500/30 bg-slate-500/10 text-slate-400"
						}`}>
							{t("traderTier", { tier: t(riskRating) })}
						</span>
					</div>

					{/* PERFORMANCE STATS GRID & WIN/LOSS/DRAW BAR */}
					<div className="w-full mt-10 p-6 rounded-xl bg-white/[0.02] border border-white/10 backdrop-blur-md">
						<div className="flex justify-between items-center mb-4">
							<h2 className="text-xl font-semibold text-gray-200">{t("performanceStats")}</h2>
							<span className="text-sm font-mono text-indigo-400">{winRate}{t("winRateSuffix")}</span>
						</div>

						{/* STAT CARDS */}
						<div className="grid grid-cols-3 gap-4 mb-6">
							<div className="p-4 rounded-lg bg-emerald-500/5 border border-emerald-500/20 text-center">
								<p className="text-xs text-emerald-400 uppercase tracking-wider font-semibold">{t("wins")}</p>
								<p className="text-2xl font-bold text-emerald-300 mt-1">{wins}</p>
							</div>
							<div className="p-4 rounded-lg bg-amber-500/5 border border-amber-500/20 text-center">
								<p className="text-xs text-amber-400 uppercase tracking-wider font-semibold">{t("draws")}</p>
								<p className="text-2xl font-bold text-amber-300 mt-1">{draws}</p>
							</div>
							<div className="p-4 rounded-lg bg-rose-500/5 border border-rose-500/20 text-center">
								<p className="text-xs text-rose-400 uppercase tracking-wider font-semibold">{t("losses")}</p>
								<p className="text-2xl font-bold text-rose-300 mt-1">{losses}</p>
							</div>
						</div>

						<div className="w-full h-3 bg-gray-800 rounded-full overflow-hidden flex">
							{totalMatches > 0 ? (
								<>
									<div style={{width: `${(wins / totalMatches) * 100}%` }} className="bg-emerald-500 h-full" title={`${t("wins")}: ${wins}`} />
									<div style={{ width: `${(draws / totalMatches) * 100}%` }} className="bg-amber-500 h-full" title={`${t("draws")}: ${draws}`} />
									<div style={{ width: `${(losses / totalMatches) * 100}%` }} className="bg-rose-500 h-full" title={`${t("losses")}: ${losses}`} />
								</>
							) : (
								<div className="w-full h-full bg-gray-700/50" />
							)}
						</div>
					</div>

					<div className="w-full mt-8 p-6 rounded-xl bg-white/[0.02] border border-white/10 backdrop-blur-md">
						<div className="flex justify-between items-center mb-6">
							<h2 className="text-lg font-semibold text-gray-200">{t("achievementsLabel")}</h2>
						</div>

						{/* Achievements list.

							Follows the same pattern as the Lobby's room grid: one column on
							phones (where the cards simply do not fit side by side), two only
							from sm upwards. Every card below is a single component that stacks
							its own content vertically on mobile, so nothing can overlap. */}
						<div className="grid grid-cols-1 gap-4 w-full sm:grid-cols-2">
							{/* Achievement 1 — Special Fire (1 win) */}
							<AchievementCard
								icon={fireIcon}
								name={t("achievements.first_1_win.name")}
								description={t("achievements.first_1_win.description")}
								tier={t("tiers.novice")}
								requirement={1}
								wins={wins}
								unlocked={wins >= 1}
								accent="orange"
							/>

							{/* Achievement 2 — Greenhorn Trader (5 wins, Bronze) */}
							<AchievementCard
								icon={bronzeMedalIcon}
								name={t("achievements.first_5_wins.name")}
								description={t("achievements.first_5_wins.description")}
								tier={t("tiers.bronze")}
								requirement={5}
								wins={wins}
								unlocked={wins >= 5}
								accent="bronze"
							/>

							{/* Achievement 3 — Market Competitor (10 wins, Silver) */}
							<AchievementCard
								icon={silverMedalIcon}
								name={t("achievements.first_10_wins.name")}
								description={t("achievements.first_10_wins.description")}
								tier={t("tiers.silver")}
								requirement={10}
								wins={wins}
								unlocked={wins >= 10}
								accent="silver"
							/>

							{/* Achievement 4 — The Answer to Everything (42 wins) */}
							<AchievementCard
								icon={fortyTwoIcon}
								name={t("achievements.first_42_wins.name")}
								description={t("achievements.first_42_wins.description")}
								tier={t("tiers.special")}
								requirement={42}
								wins={wins}
								unlocked={wins >= 42}
								accent="emerald"
							/>

							{/* Achievement 5 — BITCOIN / HODL (100 wins) */}
							<AchievementCard
								icon={bitcoinIcon}
								name={t("achievements.first_100_wins.name")}
								description={t("achievements.first_100_wins.description")}
								tier={t("tiers.crypto")}
								requirement={100}
								wins={wins}
								unlocked={wins >= 100}
								accent="amber"
							/>

							{/* Achievement 6 — Treasure Chest / Tycoon (500 wins) */}
							<AchievementCard
								icon={treasureChestIcon}
								name={t("achievements.first_500_wins.name")}
								description={t("achievements.first_500_wins.description")}
								tier={t("tiers.legendary")}
								requirement={500}
								wins={wins}
								unlocked={wins >= 500}
								accent="yellow"
							/>
						</div>
					</div>
				</div>
			</main>
		</SideNav>
	);
}