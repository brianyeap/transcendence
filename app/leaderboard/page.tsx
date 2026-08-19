import { SideNav } from "../components/duel/side-nav";
import { Avatar } from "../components/duel/avatar";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Trophy, Medal, Crown, TrendingUp, Swords } from "lucide-react";

interface PlayerStats {
  userId: string;
  username: string;
  wins: number;
  losses: number;
  draws: number;
  gamesPlayed: number;
  winRate: number;
}

export default async function LeaderboardPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch all public profiles
  const { data: profiles, error: profilesError } = await supabase
    .from("public_profiles")
    .select("id, username");

  // Fetch all completed matches
  const { data: matches, error: matchesError } = await supabase
    .from("matches")
    .select("id, winner_user_id, player_one_user_id, player_two_user_id, status")
    .eq("status", "completed");

  const error = profilesError || matchesError;
  if (error) {
    console.error("Leaderboard database error:", error);
  }

  // Calculate statistics
  const statsMap = new Map<string, PlayerStats>();

  // Initialize statistics map with profiles
  for (const profile of profiles ?? []) {
    statsMap.set(profile.id, {
      userId: profile.id,
      username: profile.username || "Unknown",
      wins: 0,
      losses: 0,
      draws: 0,
      gamesPlayed: 0,
      winRate: 0,
    });
  }

  // Populate games played, wins, losses, and draws
  for (const match of matches ?? []) {
    const p1 = match.player_one_user_id;
    const p2 = match.player_two_user_id;
    const winner = match.winner_user_id;

    const p1Stats = statsMap.get(p1);
    const p2Stats = p2 ? statsMap.get(p2) : null;

    if (p1Stats) p1Stats.gamesPlayed++;
    if (p2Stats) p2Stats.gamesPlayed++;

    if (winner === null) {
      if (p1Stats) p1Stats.draws++;
      if (p2Stats) p2Stats.draws++;
    } else if (winner === p1) {
      if (p1Stats) p1Stats.wins++;
      if (p2Stats) p2Stats.losses++;
    } else if (p2Stats && winner === p2) {
      if (p2Stats) p2Stats.wins++;
      if (p1Stats) p1Stats.losses++;
    }
  }

  // Calculate win rate & create sorted list
  const leaderboardList: PlayerStats[] = Array.from(statsMap.values()).map(p => {
    p.winRate = p.gamesPlayed === 0 ? 0 : (p.wins / p.gamesPlayed) * 100;
    return p;
  });

  // Sort by Wins (descending), then Win Rate (descending), then Games Played (descending)
  leaderboardList.sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins;
    if (b.winRate !== a.winRate) return b.winRate - a.winRate;
    return b.gamesPlayed - a.gamesPlayed;
  });

  // Slice to Top 25
  const top25 = leaderboardList.slice(0, 25);

  // Extract Top 3 for the Showcase Podium
  const p1 = top25[0];
  const p2 = top25[1];
  const p3 = top25[2];

  // Fetch username for current logged in user to pass to SideNav
  const currentUserStats = statsMap.get(user.id);
  const currentUsername = currentUserStats?.username ?? "you_degen";

  return (
    <SideNav user={currentUsername}>
      <div className="relative min-h-screen">
        {/* Glow effects */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full bg-blue-600/[.07] blur-3xl" />
          <div className="absolute top-1/3 -left-40 w-[400px] h-[400px] rounded-full bg-emerald-600/[.05] blur-3xl" />
        </div>

        <div className="relative p-6 md:p-8 text-[#eef2f8] max-w-5xl mx-auto">
          {/* Header */}
          <div className="mb-8 flex items-end justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-1 h-6 rounded-full bg-gradient-to-b from-blue-400 to-emerald-400" />
                <span className="text-[11px] uppercase tracking-[0.2em] text-[#5d6877] font-medium">
                  Competition
                </span>
              </div>
              <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-[#eef2f8] to-[#8a95a8] bg-clip-text text-transparent">
                Leaderboard
              </h1>
              <p className="text-sm text-[#5d6877] mt-1.5">
                Top traders ranked by wins. Make your moves, climb the ranks.
              </p>
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
              Could not retrieve leaderboard data. Displaying local or cached values.
            </div>
          )}

          {/* Top 3 Showcase Podium */}
          {top25.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 items-end">
              {/* 2nd Place */}
              {p2 && p2.wins > 0 ? (
                <div className="relative order-2 md:order-1 flex flex-col items-center p-5 rounded-[10px] border border-slate-400/20 bg-gradient-to-b from-[#1b2230]/40 to-[#0f131b] shadow-md backdrop-blur-sm">
                  <div className="absolute -top-5 w-10 h-10 rounded-full bg-slate-400 flex items-center justify-center shadow-md">
                    <Medal className="w-5 h-5 text-black" />
                  </div>
                  <div className="mt-3 flex flex-col items-center text-center">
                    <span className="text-[10px] uppercase tracking-widest text-slate-300 font-bold">2nd Place</span>
                    <div className="mt-3">
                      <Avatar name={p2.username} size="md" />
                    </div>
                    <span className="mt-2.5 font-bold truncate max-w-[130px]">{p2.username}</span>
                    <div className="mt-4 grid grid-cols-3 gap-2 w-full border-t border-white/[.04] pt-3 text-center">
                      <div>
                        <div className="text-[9px] uppercase tracking-wider text-[#5d6877]">Wins</div>
                        <div className="text-xs font-semibold text-slate-300">{p2.wins}</div>
                      </div>
                      <div>
                        <div className="text-[9px] uppercase tracking-wider text-[#5d6877]">Played</div>
                        <div className="text-xs font-semibold text-[#eef2f8]">{p2.gamesPlayed}</div>
                      </div>
                      <div>
                        <div className="text-[9px] uppercase tracking-wider text-[#5d6877]">Win %</div>
                        <div className="text-xs font-semibold text-emerald-400">{p2.winRate.toFixed(1)}%</div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="order-2 md:order-1 hidden md:block" />
              )}

              {/* 1st Place */}
              {p1 && p1.wins > 0 ? (
                <div className="relative order-1 md:order-2 flex flex-col items-center p-6 rounded-[10px] border border-amber-500/30 bg-gradient-to-b from-[#2e2417]/50 to-[#0f131b] shadow-[0_0_25px_-5px_rgba(245,158,11,0.15)] md:-translate-y-4 backdrop-blur-sm">
                  <div className="absolute -top-6 w-12 h-12 rounded-full bg-amber-500 flex items-center justify-center shadow-lg">
                    <Crown className="w-6 h-6 text-black" />
                  </div>
                  <div className="mt-4 flex flex-col items-center text-center">
                    <span className="text-[10px] uppercase tracking-widest text-amber-400 font-bold">Champion</span>
                    <div className="mt-3">
                      <Avatar name={p1.username} size="lg" />
                    </div>
                    <span className="mt-3 text-lg font-bold truncate max-w-[150px]">{p1.username}</span>
                    <div className="mt-5 grid grid-cols-3 gap-2 w-full border-t border-white/[.04] pt-4 text-center">
                      <div>
                        <div className="text-[9px] uppercase tracking-wider text-[#5d6877]">Wins</div>
                        <div className="text-sm font-semibold text-amber-400">{p1.wins}</div>
                      </div>
                      <div>
                        <div className="text-[9px] uppercase tracking-wider text-[#5d6877]">Played</div>
                        <div className="text-sm font-semibold text-[#eef2f8]">{p1.gamesPlayed}</div>
                      </div>
                      <div>
                        <div className="text-[9px] uppercase tracking-wider text-[#5d6877]">Win %</div>
                        <div className="text-sm font-semibold text-emerald-400">{p1.winRate.toFixed(1)}%</div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="order-1 md:order-2 flex flex-col items-center justify-center p-6 rounded-[10px] border border-white/[.07] bg-[#0f131b] text-center min-h-[220px]">
                  <Trophy className="w-10 h-10 text-[#5d6877] mb-2" />
                  <p className="text-sm text-[#5d6877]">No wins registered yet</p>
                </div>
              )}

              {/* 3rd Place */}
              {p3 && p3.wins > 0 ? (
                <div className="relative order-3 md:order-3 flex flex-col items-center p-5 rounded-[10px] border border-amber-700/20 bg-gradient-to-b from-[#251b17]/40 to-[#0f131b] shadow-md backdrop-blur-sm">
                  <div className="absolute -top-5 w-10 h-10 rounded-full bg-amber-700 flex items-center justify-center shadow-md">
                    <Medal className="w-5 h-5 text-black" />
                  </div>
                  <div className="mt-3 flex flex-col items-center text-center">
                    <span className="text-[10px] uppercase tracking-widest text-amber-600 font-bold">3rd Place</span>
                    <div className="mt-3">
                      <Avatar name={p3.username} size="md" />
                    </div>
                    <span className="mt-2.5 font-bold truncate max-w-[130px]">{p3.username}</span>
                    <div className="mt-4 grid grid-cols-3 gap-2 w-full border-t border-white/[.04] pt-3 text-center">
                      <div>
                        <div className="text-[9px] uppercase tracking-wider text-[#5d6877]">Wins</div>
                        <div className="text-xs font-semibold text-amber-600">{p3.wins}</div>
                      </div>
                      <div>
                        <div className="text-[9px] uppercase tracking-wider text-[#5d6877]">Played</div>
                        <div className="text-xs font-semibold text-[#eef2f8]">{p3.gamesPlayed}</div>
                      </div>
                      <div>
                        <div className="text-[9px] uppercase tracking-wider text-[#5d6877]">Win %</div>
                        <div className="text-xs font-semibold text-emerald-400">{p3.winRate.toFixed(1)}%</div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="order-3 md:order-3 hidden md:block" />
              )}
            </div>
          )}

          {/* Leaderboard Table */}
          <div className="rounded-[10px] border border-white/[.07] bg-[#0f131b] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[600px]">
                <thead>
                  <tr className="bg-white/[.02] border-b border-white/[.07]">
                    <th className="py-4 px-5 text-[10px] uppercase tracking-wider text-[#5d6877] font-semibold text-center w-20">Rank</th>
                    <th className="py-4 px-5 text-[10px] uppercase tracking-wider text-[#5d6877] font-semibold">Player</th>
                    <th className="py-4 px-5 text-[10px] uppercase tracking-wider text-[#5d6877] font-semibold text-right">Games Played</th>
                    <th className="py-4 px-5 text-[10px] uppercase tracking-wider text-[#5d6877] font-semibold text-right">Wins</th>
                    <th className="py-4 px-5 text-[10px] uppercase tracking-wider text-[#5d6877] font-semibold text-right">Losses</th>
                    <th className="py-4 px-5 text-[10px] uppercase tracking-wider text-[#5d6877] font-semibold text-right">Win Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {top25.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-[#5d6877]">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <Swords className="w-8 h-8 opacity-40" />
                          <span>No matches have been played yet. Be the first to start a duel!</span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    top25.map((player, index) => {
                      const rank = index + 1;
                      const isSelf = player.userId === user.id;

                      let rankBadge = null;
                      if (rank === 1) {
                        rankBadge = (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-500 text-black text-xs font-bold shadow-[0_0_8px_rgba(245,158,11,0.3)]">
                            1
                          </span>
                        );
                      } else if (rank === 2) {
                        rankBadge = (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-400 text-black text-xs font-bold shadow-[0_0_8px_rgba(156,163,175,0.3)]">
                            2
                          </span>
                        );
                      } else if (rank === 3) {
                        rankBadge = (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-700 text-black text-xs font-bold shadow-[0_0_8px_rgba(180,83,9,0.3)]">
                            3
                          </span>
                        );
                      } else {
                        rankBadge = <span className="text-[#5d6877] font-mono text-sm">#{rank}</span>;
                      }

                      return (
                        <tr
                          key={player.userId}
                          className={`border-b border-white/[.04] hover:bg-white/[.01] transition-colors ${isSelf ? "bg-[#4d86ff]/[0.03] border-l-2 border-l-[#4d86ff]" : ""
                            }`}
                        >
                          <td className="py-3.5 px-5 text-center font-semibold">{rankBadge}</td>
                          <td className="py-3.5 px-5 font-semibold">
                            <div className="flex items-center gap-3">
                              <Avatar name={player.username} size="sm" />
                              <span className="truncate max-w-[150px] md:max-w-xs text-sm">
                                {player.username}
                                {isSelf && (
                                  <span className="ml-2 text-[9px] uppercase tracking-wider bg-[#4d86ff]/15 text-[#4d86ff] px-1.5 py-0.5 rounded-[4px] font-bold">
                                    You
                                  </span>
                                )}
                              </span>
                            </div>
                          </td>
                          <td className="py-3.5 px-5 text-right font-semibold font-mono text-[#eef2f8] text-sm">
                            {player.gamesPlayed}
                          </td>
                          <td className="py-3.5 px-5 text-right font-semibold font-mono text-emerald-400 text-sm">
                            {player.wins}
                          </td>
                          <td className="py-3.5 px-5 text-right font-semibold font-mono text-rose-400 text-sm">
                            {player.losses}
                          </td>
                          <td className="py-3.5 px-5 text-right font-semibold font-mono text-emerald-400 text-sm">
                            {player.winRate.toFixed(1)}%
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </SideNav>
  );
}
