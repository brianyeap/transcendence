import type { ActiveGame } from "./types";
import { Avatar } from "./avatar";
import { fmtClock } from "./format";

export function ActiveGameRow({ game }: { game: ActiveGame }) {
  // /15 is the opacity
  const status = {
    countdown: ["Countdown", "bg-[#e8b341]/15 text-[#e8b341]"],
    live: ["Live", "bg-[#1fcb83]/15 text-[#1fcb83]"],
    ending: ["Ending Soon", "bg-[#f6485d]/15 text-[#f6485d]"],
  }[game.status];

  return (
    // inline flex takes as much width as it's content
    <article className="flex flex-col gap-4 rounded-xl border border-white/[.07] bg-[#0f131b] p-4 transition hover:border-white/[.12] hover:bg-[#151b25] sm:flex-row sm:items-center">
      <span className={`inline-flex w-fit min-w-24 items-center justify-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[.04em] ${status[1]}`}>
        {game.status === "live" && <span className="size-2 animate-pulse rounded-full bg-[#1fcb83] shadow-[0_0_10px_#1fcb83]" />}
        {status[0]}
      </span>
      <div className="flex min-w-0 flex-1 items-center gap-2.5">
        <Avatar name={game.p1} size="sm" />
        {/* Truncate cuts off the long names */}
        <span className="truncate text-sm font-semibold">{game.p1}</span>
        <span className="rounded bg-[#151b25] px-2 py-0.5 font-mono text-[11px] font-bold text-[#3a434f]">VS</span>
        <span className="truncate text-sm font-semibold">{game.p2}</span>
        <Avatar name={game.p2} size="sm" />
      </div>
      <div className="flex items-center gap-7 sm:text-right">
        <div>
          <p className="text-[10.5px] font-bold uppercase tracking-[.04em] text-[#5d6877]">Symbol</p>
          <p className="font-mono text-[13px] font-semibold">{game.symbol}</p>
        </div>
        <div className="min-w-16">
          <p className="text-[10.5px] font-bold uppercase tracking-[.04em] text-[#5d6877]">{game.status === "countdown" ? "Starts in" : "Time left"}</p>
          <p className={`font-mono text-sm font-bold ${game.status === "ending" ? "text-[#f6485d]" : ""}`}>{game.status === "countdown" ? `${game.remaining}s` : fmtClock(game.remaining)}</p>
        </div>
      </div>
    </article>
  );
}
