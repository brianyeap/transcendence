/**
 * Shared win/tier statistics.
 *
 * WHY THIS FILE EXISTS
 * The profile page, the leaderboard and the history page each used to count
 * wins/losses/draws and derive a win rate on their own. Three copies of the
 * same maths means three chances to disagree, and a user could see a different
 * win rate on the profile than on the leaderboard. Everything now comes from
 * here, so the numbers are identical everywhere by construction.
 *
 * Two ideas are worth understanding before reading the code:
 *
 * 1. PROVISIONAL RATES. A player who has played 1 match and won it has a 100%
 *    win rate, which is true but meaningless. Below MIN_MATCHES_FOR_RATE we
 *    still report the rate, but flag it as `provisional` so the UI can label it,
 *    and the leaderboard refuses to rank those players above established ones.
 *
 * 2. TIERS USE THE PLAIN WIN RATE. The tier is wins / games played, the same
 *    number the profile shows, so the rank never disagrees with what the player
 *    sees. Draws are not wins. To stop one lucky early win from jumping a new
 *    player straight to the top, the higher tiers also need a minimum number of
 *    games (Pro 10+, Elite 20+).
 */

export type RiskRating = "rookie" | "beginner" | "amateur" | "pro" | "elite";

/**
 * Below this many completed matches a win rate is shown as provisional and the
 * player is ranked after everyone who has reached it.
 */
export const MIN_MATCHES_FOR_RATE = 5;

export function getRiskRating(
	wins: number,
	losses: number,
	draws: number
): RiskRating {
	const played = wins + losses + draws;

	// Anything under 5 games is "we don't know yet", regardless of the rate.
	if (played < MIN_MATCHES_FOR_RATE) return "rookie";

	// Plain win rate: only wins count, draws and losses do not.
	const winRate = wins / played;

	// These thresholds are shown on the progress strip
	// (TIER_WIN_RATE in app/components/duel/tier-progress-strip.tsx).
	if (played >= 20 && winRate > 0.65) return "elite";
	if (played >= 10 && winRate > 0.57) return "pro";
	if (winRate > 0.45) return "amateur";
	return "beginner";
}

export function getWinStats(wins: number, losses: number, draws: number) {
	const played = wins + losses + draws;

	// No games at all: there is no rate to show, and callers must render "—"
	// rather than calling toFixed() on null.
	if (played === 0)
		return { played, winRate: null, winPct: 0, drawPct: 0, lossPct: 0, provisional: true };

	// One decimal place, e.g. 71.4. Kept as a number so callers can .toFixed(1)
	// it again without changing the value.
	const winRate = Math.round((wins / played) * 1000) / 10;

	// The bar works in whole percent. Rounding win and draw independently can
	// make them sum to 101 (e.g. 16.5% + 83.5% rounds to 17 + 84). Deriving the
	// loss share as the remainder keeps the TOTAL at 100, but it does not keep
	// the parts sane: if win+draw rounds to 101 the remainder is -1, and if it
	// rounds to 99 the remainder is +1 — the bar would overflow its container or
	// leave a gap.
	//
	// So we round win and draw, clamp each into [0, 100], and then give loss
	// whatever is LEFT OVER. Loss is the smallest of the three in every case
	// that matters here, and taking the remainder last guarantees the three
	// segments always sum to exactly 100 with no negative width.
	const winPct = Math.max(0, Math.min(100, Math.round((wins / played) * 100)));
	const drawPct = Math.max(0, Math.min(100 - winPct, Math.round((draws / played) * 100)));
	const lossPct = 100 - winPct - drawPct;

	return {
		played,
		winRate,
		winPct,
		drawPct,
		lossPct,
		provisional: played < MIN_MATCHES_FOR_RATE,
	};
}

// ---------------------------------------------------------------------------
// TIER PROGRESSION
// ---------------------------------------------------------------------------

/**
 * Every tier, weakest first. The order is what the progress strip renders, so
 * the UI and the ranking can never disagree about which tier comes "next".
 */
export const TIER_ORDER: readonly RiskRating[] = [
	"rookie",
	"beginner",
	"amateur",
	"pro",
	"elite",
] as const;
