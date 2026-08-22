"use client";

import type React from "react";
import { ArrowLeft, Loader } from "lucide-react";
import Link from "next/link";
import { fmtUSD } from "../../components/duel/format";
import { PlayerSlot } from "./player-slot";
import type { Match } from "@/lib/match/types";

export function WaitingRoom({
  match,
  viewerUserId,
}: {
  match: Match;
  viewerUserId: string | null;
}): React.ReactElement {
  return (
    <div className="flex flex-1 items-center justify-center px-5 py-5">
      <div className="w-full max-w-lg rounded-xl border border-white/[.07] bg-[#0f131b] p-6 sm:p-7">
        <div className="flex flex-col items-center text-center">
          <span className="inline-flex items-center gap-1.5 rounded-[7px] border border-[#4d86ff]/30 bg-[#4d86ff]/10 px-2.5 py-1 text-[11.5px] font-bold uppercase tracking-[.08em] text-[#4d86ff]">
            <Loader className="size-3.5 motion-safe:animate-spin" aria-hidden />
            Open
          </span>
          <h1 className="mt-3.5 text-[27px] font-bold tracking-[-.02em]">
            Waiting for an opponent
          </h1>
          <p className="mt-1.5 text-[13px] text-[#9aa6b6]">
            The match starts the moment someone takes the open seat. You do not need to
            refresh — this screen moves on by itself.
          </p>
        </div>
        <div className="mt-6 flex flex-col gap-2.5">
          <PlayerSlot player={match.playerOne} viewerUserId={viewerUserId} />
          <div
            aria-hidden="true"
            className="text-center text-[11px] font-bold uppercase tracking-[.08em] text-[#3a434f]"
          >
            vs
          </div>
          <PlayerSlot player={match.playerTwo} viewerUserId={viewerUserId} />
        </div>
        <MatchSettings match={match} />
        <div className="mt-6">

          <Link
            href="/"
            className="flex w-full items-center justify-center gap-2 rounded-[7px] border border-white/[.1] bg-gray-800 px-4 py-2.5 text-[13.5px] font-semibold text-[#eef2f8] transition hover:bg-gray-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4d86ff]"
          >
            <ArrowLeft className="size-4" aria-hidden />
            Back to games
          </Link>
          <p className="mt-2.5 text-center text-[11.5px] text-[#5d6877]">
            The match stays open while you are away. Return from the lobby at any time.
          </p>
        </div>
      </div>
    </div>
  );
}
function MatchSettings({ match }: { match: Match }) {
  return (
    <div className="mt-5 rounded-[7px] border border-white/[.07] bg-[#151b25] px-4 py-3.5">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-[10.5px] font-bold uppercase tracking-[.08em] text-[#3a434f]">
            Market
          </p>
          <p className="mt-1 font-mono text-[15px] font-semibold tabular-nums text-[#eef2f8]">
            {match.symbol}
          </p>
        </div>
        <div>
          <p className="text-[10.5px] font-bold uppercase tracking-[.08em] text-[#3a434f]">
            Starting capital
          </p>
          <p className="mt-1 font-mono text-[15px] font-semibold tabular-nums text-[#eef2f8]">
            {fmtUSD(Math.round(match.startingCapital))}
          </p>
          <p className="mt-0.5 text-[10.5px] text-[#5d6877]">Each player</p>
        </div>
      </div>
    </div>
  );
}
