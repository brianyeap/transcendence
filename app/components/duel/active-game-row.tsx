// Imports
import type { ActiveGame } from "./types";
import { Avatar } from "./avatar";
import { fmtClock } from "./format";

//  
export function ActiveGameRow({ game }: { game: ActiveGame }) {
	// /15 is the opacity
	let statusText = "";
	let statusClasses = "";
	
	// Identify the game.status and chooses the correct label + CSS classes
	if (game.status === "countdown")
	{
			statusText = "Countdown";
			statusClasses = "bg-[#e8b341]/15 text-[#e8b341]";
	}
	else if (game.status === "live")
	{
			statusText = "Live";
			statusClasses = "bg-[#1fcb83]/15 text-[#1fcb83]";
	}
	else if(game.status === "ending")
	{
			statusText = "Ending Soon";
			statusClasses = "bg-[#f6485d]/15 text-[#f6485d]";
	}

	// Main Container for One Active game
	return (
		// inline flex takes as much width as it's content
		// This part would handle for vertically small screens and also for horizontal larger screens.
		<article className="flex flex-col gap-4 rounded-xl border border-white/[.07] bg-[#0f131b] p-4 transition hover:border-white/[.12] hover:bg-[#151b25] sm:flex-row sm:items-center">
			<span className={`inline-flex w-fit min-w-24 items-center justify-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[.04em] ${statusClasses}`}>
				{/* Only show this pulsing dot when the game is LIVE. */}
				{game.status === "live" && <span className="size-2 animate-pulse rounded-full bg-[#1fcb83] shadow-[0_0_10px_#1fcb83]" />}
				{statusText}
			</span>

			{/* Players section */ }
			<div className="flex min-w-0 flex-1 items-center gap-2.5">
				{/* Shows Player 1's avatar & Truncate cuts off the long names. */}
				<Avatar name={game.p1} size="sm" />
				<span className="truncate text-sm font-semibold">{game.p1}</span>
				{/* Simple VS badge */}
				<span className="rounded bg-[#151b25] px-2 py-0.5 font-mono text-[11px] font-bold text-[#3a434f]">VS</span>
				{/* Shows Player 2's avatar & Trucate cuts off the long names. */}
				<span className="truncate text-sm font-semibold">{game.p2}</span>
				<Avatar name={game.p2} size="sm" />
			</div>

			{/* Game Information: Symbol + Remaining time. */}
			<div className="flex items-center gap-7 sm:text-right">
				<div>
					{/* Display the game's symbols */}
					<p className="text-[10.5px] font-bold uppercase tracking-[.04em] text-[#5d6877]">Symbol</p>
					<p className="font-mono text-[13px] font-semibold">{game.symbol}</p>
				</div>
				<div className="min-w-16">
					{/* Countdown games say "Starts in".
						Other games say "Time left" .*/}
					<p className="text-[10.5px] font-bold uppercase tracking-[.04em] text-[#5d6877]">{game.status === "countdown" ? "Starts in" : "Time left"}</p>
					<p className={`font-mono text-sm font-bold ${game.status === "ending" ? "text-[#f6485d]" : ""}`}>{game.status === "countdown" ? `${game.remaining}s` : fmtClock(game.remaining)}</p>
				</div>
			</div>
		</article>
	);
}

// 
// ActiveGameRow In Plain English
/* 
ActiveGameRow is a React component that recives an ActiveGame object as a prop and renders a
responsive game row. It determines the appropriate label and styling based on the game's status,
display both players and their avatars, shows the game's symbol, and formats the remaining time
differently depending on weather the game is still counting down or already active.

*/
