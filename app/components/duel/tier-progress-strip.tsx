"use client";

import { useTranslations } from "next-intl";
import { Trophy, Lock } from "lucide-react";
import { TIER_ORDER, type RiskRating } from "@/lib/stats";

/**
 * The rank-progression strip shown under the achievement cards.
 *
 * TWO STATES PER BADGE, AND WHY THEY ARE DIFFERENT FROM "CURRENT":
 *
 *   - unlocked  : a tier the player has REACHED OR PASSED. These stay lit
 *                 forever, because dropping back down a tier does not un-earn
 *                 the rank you reached — the strip is a record of progress, not
 *                 a live gauge.
 *   - current   : the tier the player is in RIGHT NOW. Rendered with a stronger
 *                 ring/glow so it is clearly "you are here" among the lit ones.
 *   - locked    : a tier still ahead. Dimmed, with a lock icon.
 *
 * So a player sitting at `amateur` shows rookie+beginner+amateur lit, amateur
 * additionally marked current, and pro+elite dim. If they later fall back to
 * `beginner`, the amateur badge STAYS lit (it is unlocked) but the current ring
 * moves to beginner. That is the behaviour asked for: "if you passed that
 * status it should be unlocked and stay illuminated".
 *
 * Colour per tier mirrors the badge on the profile header so the two agree.
 */

// Literal class strings, not interpolated: Tailwind scans source text, so a
// class built at runtime (`${colour}-500/30`) would never be generated.
const TIER_STYLES: Record<
	RiskRating,
	{ unlocked: string; ring: string; label: string; dot: string; dotSoft: string }
> = {
	rookie: {
		unlocked: "border-slate-500/40 bg-slate-500/10 text-slate-300",
		ring: "ring-2 ring-slate-400/60",
		label: "text-slate-300",
		dot: "bg-slate-400",
		dotSoft: "bg-slate-400/20",
	},
	beginner: {
		unlocked: "border-sky-500/40 bg-sky-500/10 text-sky-400",
		ring: "ring-2 ring-sky-400/60",
		label: "text-sky-400",
		dot: "bg-sky-400",
		dotSoft: "bg-sky-400/20",
	},
	amateur: {
		unlocked: "border-amber-500/40 bg-amber-500/10 text-amber-400",
		ring: "ring-2 ring-amber-400/60",
		label: "text-amber-400",
		dot: "bg-amber-400",
		dotSoft: "bg-amber-400/20",
	},
	pro: {
		unlocked: "border-emerald-500/40 bg-emerald-500/10 text-emerald-400",
		ring: "ring-2 ring-emerald-400/60",
		label: "text-emerald-400",
		dot: "bg-emerald-400",
		dotSoft: "bg-emerald-400/20",
	},
	elite: {
		unlocked: "border-violet-500/40 bg-violet-500/10 text-violet-400",
		ring: "ring-2 ring-violet-400/60",
		label: "text-violet-400",
		dot: "bg-violet-400",
		dotSoft: "bg-violet-400/20",
	},
};

// The win rate each tier asks for, shown under its name. Rookie and beginner
// have no rate bar, so they are left out and show nothing. Keep these in sync
// with getRiskRating() in lib/stats.ts.
const TIER_WIN_RATE: Partial<Record<RiskRating, number>> = {
	amateur: 45,
	pro: 57,
	elite: 65,
};

export function TierProgressStrip({ currentTier }: { currentTier: RiskRating }) {
	const t = useTranslations("profile");

	const currentIndex = TIER_ORDER.indexOf(currentTier);

	return (
		<div className="w-full mt-8 p-6 rounded-xl bg-white/[0.02] border border-white/10 backdrop-blur-md">
			<div className="flex items-start justify-between gap-4 mb-1">
				<div className="text-left">
					<h2 className="text-lg font-semibold text-gray-200 flex items-center gap-2">
						<Trophy className="w-4 h-4 text-indigo-400" />
						{t("tierProgress.title")}
					</h2>
					<p className="text-xs text-gray-500 mt-1">{t("tierProgress.subtitle")}</p>
				</div>
			</div>

			{/* BADGE ROW
			    Five badges side by side from sm upwards; wrapped two-per-row on
			    the narrowest phones so nothing is squeezed into an unreadable
			    sliver. Each badge is a fixed-height tile so the row lines up. */}
			<div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
				{TIER_ORDER.map((tier, index) => {
					const isCurrent = tier === currentTier;
					// Everything at or below the current index has been reached.
					const isUnlocked = index <= currentIndex;
					const style = TIER_STYLES[tier];

					return (
						<div
							key={tier}
							className={`relative flex flex-col items-center gap-2 rounded-lg border px-2 py-3 text-center transition-all duration-300 ${
								isUnlocked
									? `${style.unlocked} ${isCurrent ? style.ring : ""}`
									: "border-white/[.06] bg-white/[0.01] text-gray-600"
							}`}
						>
							{/* The lit indicator. A filled dot when reached, a lock when
							    not — distinct shapes so the state reads without colour. */}
							<span
								className={`flex h-8 w-8 items-center justify-center rounded-full border ${
									isUnlocked
										? `border-white/20 ${style.dotSoft}`
										: "border-white/[.06] bg-white/[0.02]"
								}`}
								aria-hidden="true"
							>
								{isUnlocked ? (
									<span className={`h-2.5 w-2.5 rounded-full ${style.dot}`} />
								) : (
									<Lock className="h-3.5 w-3.5 text-gray-600" />
								)}
							</span>

							<span
								className={`text-[11px] font-semibold leading-tight ${
									isUnlocked ? style.label : "text-gray-600"
								}`}
							>
								{t(`tierLabel.${tier}`)}
							</span>

							{/* Win-rate requirement, only for tiers that have one. */}
							{TIER_WIN_RATE[tier] !== undefined && (
								<span className="text-[10px] leading-tight text-gray-500">
									{t("tierProgress.requirement", { rate: TIER_WIN_RATE[tier] })}
								</span>
							)}

							{/* Only one of these chips ever renders. `mt-auto` pins it to
							    the bottom so chips line up even when some tiles have the
							    extra requirement line and others do not. */}
							{isCurrent ? (
								<span className="mt-auto rounded-full bg-white/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">
									{t("tierProgress.current")}
								</span>
							) : isUnlocked ? (
								<span className="mt-auto rounded-full border border-white/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-gray-400">
									{t("tierProgress.unlocked")}
								</span>
							) : (
								<span className="mt-auto rounded-full border border-white/[.06] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-gray-600">
									{t("tierProgress.locked")}
								</span>
							)}
						</div>
					);
				})}
			</div>
		</div>
	);
}
