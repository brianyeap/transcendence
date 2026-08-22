"use client";

import type React from "react";
import { fmtClock } from "../../components/duel/format";
import { LeaveMatch } from "./leave-match";
import { PlayerSlot } from "./player-slot";
import { useRemainingSeconds } from "@/lib/match/use-remaining-seconds";
import type { Match } from "@/lib/match/types";

const BARE_SECONDS_UNDER = 60;

export function CountdownScreen({
  match,
  viewerUserId,
  serverNow,
}: {
  match: Match;
  viewerUserId: string | null;
  serverNow: () => number;
}): React.ReactElement {
  const remaining = useRemainingSeconds(match.startsAt, serverNow);
  const starting = remaining === null || remaining === 0;

  return (
    <div className="relative flex flex-1 items-center justify-center px-5 py-5">
      <LeaveMatch needsConfirm={false} className="absolute right-5 top-5 sm:right-7" />
      <div className="w-full max-w-lg rounded-xl border border-white/[.07] bg-[#0f131b] p-6 sm:p-7">
        <div className="flex flex-col items-center text-center">
          <span className="inline-flex items-center gap-1.5 rounded-[7px] border border-[#1fcb83]/30 bg-[#1fcb83]/10 px-2.5 py-1 text-[11.5px] font-bold uppercase tracking-[.08em] text-[#1fcb83]">
            Both players in
          </span>
          <h1 className="mt-3.5 text-[21px] font-bold tracking-[-.01em]">
            {match.symbol} opens in
          </h1>
          <p
            aria-hidden="true"
            className="mt-2 font-mono text-[64px] font-semibold leading-none tracking-[-.03em] tabular-nums text-[#eef2f8]"
          >
            {starting ? "—" : remaining < BARE_SECONDS_UNDER ? remaining : fmtClock(remaining)}
          </p>
          <p className="sr-only">
            {starting
              ? "The match is starting."
              : `The match starts in ${remaining} second${remaining === 1 ? "" : "s"}.`}
          </p>
          <p className="mt-3 text-[13px] text-[#9aa6b6]">
            {starting
              ? "Starting…"
              : "Get ready. The chart and your controls appear the moment it starts."}
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
          <PlayerSlot
            player={match.playerTwo}
            viewerUserId={viewerUserId}
            emptyLabel="Opponent"
          />
        </div>
      </div>
    </div>
  );
}
