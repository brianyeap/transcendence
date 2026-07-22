"use client";

// The end-of-Match state, reached when the clock runs out.
//
// Ticket 13 fills this in: winner, both final capitals, net PnL, the final price
// that settled any open exposure, and the three exits. Today it holds the shape
// so ticket 14 can prove the whole arc — waiting, countdown, live, completed —
// lands somewhere deliberate rather than on a stub.

import Link from "next/link";
import { Avatar } from "@/app/components/duel/avatar";
import { fmtClock, fmtUSD } from "@/app/components/duel/format";
import type { RoomState } from "@/lib/api/types";
import { Pending } from "./placeholder";

export function ResultScreen({ room }: { room: RoomState }) {
  const players = [room.playerOne, room.playerTwo];

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#090b10] p-4 text-[#eef2f8]">
      <div className="w-full max-w-lg rounded-2xl border border-white/[.07] bg-[#0f131b] p-6">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <p className="text-[10.5px] font-bold uppercase tracking-[.04em] text-[#5d6877]">
              Match complete
            </p>
            <h1 className="mt-1 text-[21px] font-bold tracking-[-.01em]">
              Winner: <Pending className="text-[19px]" />
            </h1>
          </div>
          <span className="rounded-full border border-white/[.12] bg-[#151b25] px-2.5 py-1 font-mono text-[10.5px] font-bold uppercase tracking-[.04em] text-[#5d6877]">
            Ticket 13
          </span>
        </div>

        <div className="flex flex-col gap-2.5">
          {players.map((player, index) => (
            <div
              key={player?.userId ?? index}
              className="flex items-center gap-3 rounded-xl border border-white/[.07] bg-[#151b25] p-3.5"
            >
              <Avatar name={player?.username ?? "?"} size="sm" />
              <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                {player?.username ?? "—"}
              </span>
              <div className="text-right">
                <p className="text-[10.5px] font-bold uppercase tracking-[.04em] text-[#5d6877]">
                  Final capital
                </p>
                <Pending className="text-sm font-bold" />
              </div>
            </div>
          ))}
        </div>

        <dl className="mt-4 grid grid-cols-3 gap-3 border-t border-white/[.07] pt-4">
          <Summary label="Started with" value={fmtUSD(room.startingCapital)} />
          <Summary label="Duration" value={fmtClock(room.durationSeconds)} />
          <Summary label="Final price" value={<Pending className="text-[13.5px]" />} />
        </dl>

        <div className="mt-5 flex flex-col gap-2.5 sm:flex-row">
          <Link
            href={`/history/${room.id}`}
            className="flex h-11 flex-1 items-center justify-center rounded-[7px] bg-[#4d86ff] text-sm font-semibold text-white shadow-[0_6px_18px_-6px_rgba(77,134,255,.4)] transition hover:brightness-110"
          >
            View Match Summary
          </Link>
          <Link
            href="/"
            className="flex h-11 flex-1 items-center justify-center rounded-[7px] border border-white/[.07] bg-[#151b25] text-sm font-semibold text-[#9aa6b6] transition hover:border-white/[.12] hover:text-[#eef2f8]"
          >
            Back To Games
          </Link>
        </div>
      </div>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="mb-1 text-[10.5px] font-bold uppercase tracking-[.04em] text-[#5d6877]">
        {label}
      </dt>
      <dd className="font-mono text-[13.5px] font-semibold">{value}</dd>
    </div>
  );
}
