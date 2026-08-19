"use client";

// Everything before the first candle: waiting for an opponent, then counting
// down. One screen, because it is one Match with a changing status.
//
// The countdown is derived from the server's startsAt on every tick rather than
// decremented locally, so a late page load, a throttled tab or a skewed clock
// all still land on zero at the same instant for both players.

import Link from "next/link";
import { Avatar } from "@/app/components/duel/avatar";
import { fmtClock, fmtPrice } from "@/app/components/duel/format";
import type { Player, RoomState } from "@/lib/api/types";
import { secondsUntil, useNow } from "./use-match-clock";

export function PreMatchScreen({ room }: { room: RoomState }) {
  const counting = room.status === "countdown" && room.startsAt !== null;
  const secondsToStart = useSecondsUntil(counting ? room.startsAt : null);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#090b10] p-4 text-[#eef2f8]">
      <div className="w-full max-w-lg rounded-2xl border border-white/[.07] bg-[#0f131b] p-6">
        <p className="text-[10.5px] font-bold uppercase tracking-[.04em] text-[#5d6877]">
          {counting ? "Match starting" : "Waiting room"}
        </p>

        <h1 className="mt-1 mb-5 text-[26px] font-bold tracking-[-.01em]">
          {counting ? (
            <span className="font-mono tabular-nums text-[#4d86ff]">{secondsToStart}s</span>
          ) : (
            "Waiting for an opponent"
          )}
        </h1>

        <div className="flex flex-col gap-2.5">
          <PlayerSlot player={room.playerOne} />
          <PlayerSlot player={room.playerTwo} />
        </div>

        <dl className="mt-4 grid grid-cols-3 gap-3 border-t border-white/[.07] pt-4">
          <Summary label="Symbol" value={room.symbol} />
          <Summary label="Capital" value={fmtPrice(room.startingCapital)} />
          <Summary label="Duration" value={fmtClock(room.durationSeconds)} />
        </dl>

        {counting ? (
          <p className="mt-5 text-center text-xs text-[#5d6877]">
            You&apos;ll be taken into the Match automatically.
          </p>
        ) : (
          <Link
            href="/"
            className="mt-5 flex h-11 items-center justify-center rounded-[7px] border border-white/[.07] bg-[#151b25] text-sm font-semibold text-[#9aa6b6] transition hover:border-white/[.12] hover:text-[#eef2f8]"
          >
            Leave room
          </Link>
        )}
      </div>
    </div>
  );
}

function PlayerSlot({ player }: { player: Player | null }) {
  if (!player) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-dashed border-white/[.12] p-3.5">
        <div className="size-8 shrink-0 rounded-[30%] border border-dashed border-white/[.12]" />
        <span className="text-sm text-[#5d6877]">Empty slot</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/[.07] bg-[#151b25] p-3.5">
      <Avatar name={player.username} size="sm" />
      <span className="min-w-0 flex-1 truncate text-sm font-semibold">{player.username}</span>
      <span className="size-2 rounded-full bg-[#1fcb83] shadow-[0_0_10px_#1fcb83]" />
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="mb-1 text-[10.5px] font-bold uppercase tracking-[.04em] text-[#5d6877]">
        {label}
      </dt>
      <dd className="font-mono text-[13.5px] font-semibold">{value}</dd>
    </div>
  );
}

/** Whole seconds until an ISO timestamp, re-read on the shared clock tick. */
function useSecondsUntil(iso: string | null): number {
  return secondsUntil(iso, useNow());
}
