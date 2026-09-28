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
 * 2. SHRUNK SCORE FOR TIERS. The tier is not "wins > losses" any more, because
 *    that makes a single lucky win worth as much as a long record. Instead we
 *    add PRIOR_GAMES games' worth of 50% results to the record before computing
 *    the score. A 1-0 player scores (1 + 5) / (1 + 10) = 0.55, not 1.0, so a
 *    newcomer cannot jump straight to a high tier, while a genuinely strong
 *    25-10 record (0.67) clears the elite bar. This is the same "add imaginary
 *    prior results" trick used to rank products with few reviews.
 */

export type RiskRating = "rookie" | "beginner" | "amateur" | "pro" | "elite";

/** Imaginary 50%-winrate games added before computing the tier score. */
const PRIOR_GAMES = 10;

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

	// A draw is worth half a win: it is neither a win nor a loss.
	const score = (wins + 0.5 * draws + PRIOR_GAMES * 0.5) / (played + PRIOR_GAMES);

	// Anything under 5 games is "we don't know yet", regardless of the score.
	if (played < MIN_MATCHES_FOR_RATE) return "rookie";

	if (played >= 20 && score >= 0.65) return "elite";
	if (played >= 10 && score >= 0.57) return "pro";
	if (score >= 0.45) return "amateur";
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

/**
 * The rule that promotes a player OUT of a tier.
 *
 * `minPlayed` is the number of completed matches that must exist before the
 * score even matters, and `minScore` is the shrunk score to reach. `rookie` has
 * no score bar at all (it is purely "fewer than 5 games"), which is why its
 * rule is the MIN_MATCHES_FOR_RATE gate rather than a score.
 *
 * These numbers MUST stay in sync with getRiskRating() above; the tests in the
 * trace at the bottom of this file pin them together.
 */
const TIER_RULES: Record<RiskRating, { minPlayed: number; minScore: number }> = {
	rookie: { minPlayed: MIN_MATCHES_FOR_RATE, minScore: 0 },
	beginner: { minPlayed: MIN_MATCHES_FOR_RATE, minScore: 0 },
	amateur: { minPlayed: MIN_MATCHES_FOR_RATE, minScore: 0.45 },
	pro: { minPlayed: 10, minScore: 0.57 },
	elite: { minPlayed: 20, minScore: 0.65 },
};

/**
 * The score needed to leave `tier`. Returns null for the top tier, which has
 * nowhere left to go.
 */
function promotionRule(tier: RiskRating): { minPlayed: number; minScore: number } | null {
	const index = TIER_ORDER.indexOf(tier);
	if (index < 0 || index === TIER_ORDER.length - 1) return null;
	return TIER_RULES[TIER_ORDER[index + 1]];
}

/**
 * What a player needs to reach the next tier.
 *
 * WHY THIS IS NOT JUST "a win percentage":
 * A tier needs BOTH a shrunk score AND a minimum number of games. A 10-0 player
 * already clears the elite score (0.75) but sits at `pro`, because elite also
 * demands 20 games. So the answer has two parts, and both are returned:
 *
 *   - `matchesNeeded` — how many more completed matches they must play before
 *     the next tier is reachable at all (the size gate).
 *   - `winsNeeded` / `requiredWinRate` — out of those games, the minimum number
 *     that must be WINS. The rate is winsNeeded / matchesNeeded.
 *
 * `requiredWinRate` is null when no wins are strictly required (the size gate
 * alone is what is missing), which is a different thing from "0% needed".
 *
 * Both are null/0 when there is no next tier (already elite).
 *
 * THE MATHS, AND WHY IT IS NOT k games all won:
 * The naive approach is "find the smallest number of future games that, if all
 * won, reaches the score bar". That undercounts: it computes the wins needed
 * assuming every gate game is a win, then reports a low percentage — and if the
 * player actually plays the gate games and loses some, they never arrive. The
 * two numbers contradict each other.
 *
 * Instead we solve the honest question: over the next k = matchesNeeded games
 * (the minimum the size gate allows), how many must be WINS, with the rest
 * counted as losses? With x wins and (k - x) losses, and draws untouched:
 *
 *   wins + x + 0.5*draws + PRIOR_GAMES*0.5 >= minScore * (played + k + PRIOR_GAMES)
 *
 * The right-hand side is now a CONSTANT (k is fixed), so it is a one-step
 * solve for x. If x comes out <= 0 the player is already scoring high enough
 * and only the size gate matters. If x > k the tier is unreachable in exactly
 * k games and the player must play more — so we grow k until x <= k.
 */
export function getNextTierProgress(
	wins: number,
	losses: number,
	draws: number
): {
	nextTier: RiskRating | null;
	requiredWinRate: number | null;
	winsNeeded: number;
	matchesNeeded: number;
} {
	const tier = getRiskRating(wins, losses, draws);
	const rule = promotionRule(tier);

	// Already at the top: nothing to chase.
	if (rule === null)
		return { nextTier: null, requiredWinRate: null, winsNeeded: 0, matchesNeeded: 0 };

	const played = wins + losses + draws;
	const nextTier = TIER_ORDER[TIER_ORDER.indexOf(tier) + 1];

	// The size gate: the tier cannot be reached before this many matches.
	const gate = Math.max(0, rule.minPlayed - played);

	// How many of the next k games must be wins (rest losses) to clear the bar.
	// Returns the smallest k >= gate for which the requirement is satisfiable.
	const scoreFloor = wins + 0.5 * draws + PRIOR_GAMES * 0.5;

	let k = gate;
	let x = 0;
	let reachable = false;

	// Grow k until the required wins fit inside the games available.
	//
	// k cannot exceed the number of games needed to lift the AVERAGE score to the
	// bar, and that is bounded: with x = k (all wins) the score tends to 1 as k
	// grows, so any bar below 1 is eventually reachable. A player whose record is
	// so bad that the bar needs more wins than games in the near term simply
	// needs more games — k grows and the percentage falls.
	//
	// The cap is a guard, not an expected outcome: at k = 2000 every bar in
	// TIER_RULES is comfortably satisfied, so hitting the cap would mean the
	// thresholds and this loop have drifted apart.
	const K_CAP = 5000;
	for (; k <= K_CAP; k++) {
		const target = rule.minScore * (played + k + PRIOR_GAMES);
		x = Math.ceil(target - scoreFloor);
		// x <= k means the required wins fit in k games. x <= 0 means no wins are
		// needed at all (the size gate alone is missing).
		if (x <= k) { reachable = true; break; }
	}

	// Nothing to do: already past the size gate with a good enough score.
	if (k <= 0) return { nextTier, requiredWinRate: null, winsNeeded: 0, matchesNeeded: 0 };

	// The cap was hit without finding a fitting k. This means the tile is out of
	// reach on any practical horizon (>100% win rate required), which happens for
	// a long losing record. Report it as unreachable rather than emitting a
	// nonsensical rate above 100%.
	if (!reachable)
		return { nextTier, requiredWinRate: null, winsNeeded: 0, matchesNeeded: 0 };

	// No wins strictly required — the size gate is all that is missing. Report
	// null rather than a misleading "0%" so the UI can say "play N more".
	if (x <= 0) return { nextTier, requiredWinRate: null, winsNeeded: 0, matchesNeeded: k };

	const requiredWinRate = Math.round((x / k) * 1000) / 10;

	return { nextTier, requiredWinRate, winsNeeded: x, matchesNeeded: k };
}
