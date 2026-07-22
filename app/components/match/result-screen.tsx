"use client";

// The end-of-Match state.
//
// The server settled any open exposure at final_price and decided the winner
// before this renders; nothing here recomputes that. It reads the result and
// makes it obvious who won without anyone having to study the chart.

import { useEffect, useState } from "react";
import Link from "next/link";
import { Avatar } from "@/app/components/duel/avatar";
import { fmtClock, fmtPrice, fmtSigned } from "@/app/components/duel/format";
import { MOCK_ME, getResult } from "@/lib/api/matches";
import type { MatchResult, RoomState } from "@/lib/api/types";

export function ResultScreen({ room }: { room: RoomState }) {
  const [result, setResult] = useState<MatchResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    getResult(room.id)
      .then((loaded) => {
        if (!cancelled) setResult(loaded);
      })
      .catch(() => {
        if (!cancelled) setError("Could not load this Match's result.");
      });

    return () => {
      cancelled = true;
    };
  }, [room.id]);

  const winner = result?.players.find((player) => player.userId === result.winnerUserId);
  const draw = result !== null && result.winnerUserId === null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#090b10] p-4 text-[#eef2f8]">
      <div className="w-full max-w-lg rounded-2xl border border-white/[.07] bg-[#0f131b] p-6">
        <p className="text-[10.5px] font-bold uppercase tracking-[.04em] text-[#5d6877]">
          Match complete
        </p>

        <h1 className="mt-1 mb-5 text-[26px] font-bold tracking-[-.01em]">
          {error ? (
            <span className="text-[19px] text-[#ff8c99]">{error}</span>
          ) : !result ? (
            <span className="text-[19px] text-[#5d6877]">Settling…</span>
          ) : draw ? (
            "It's a draw"
          ) : (
            <>
              <span className="text-[#1fcb83]">{winner?.username ?? "—"}</span> wins
            </>
          )}
        </h1>

        <div className="flex flex-col gap-2.5">
          {result?.players.map((player) => {
            const isMe = player.userId === MOCK_ME.userId;
            const won = player.result === "win";

            return (
              <div
                key={player.userId}
                className={`flex items-center gap-3 rounded-xl border p-3.5 ${
                  won
                    ? "border-[#1fcb83]/30 bg-[#1fcb83]/[.06]"
                    : "border-white/[.07] bg-[#151b25]"
                }`}
              >
                <Avatar name={player.username} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">
                    {player.username}
                    {isMe ? (
                      <span className="ml-2 rounded-full border border-[#4d86ff]/25 bg-[#4d86ff]/10 px-2 py-0.5 text-[10.5px] font-bold text-[#4d86ff]">
                        you
                      </span>
                    ) : null}
                  </p>
                  <p
                    className={`font-mono text-xs ${
                      player.netPnl > 0
                        ? "text-[#1fcb83]"
                        : player.netPnl < 0
                          ? "text-[#ff8c99]"
                          : "text-[#5d6877]"
                    }`}
                  >
                    {fmtSigned(player.netPnl)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10.5px] font-bold uppercase tracking-[.04em] text-[#5d6877]">
                    Final capital
                  </p>
                  <p className="font-mono text-sm font-bold">{fmtPrice(player.finalCapital)}</p>
                </div>
              </div>
            );
          })}
        </div>

        <dl className="mt-4 grid grid-cols-3 gap-3 border-t border-white/[.07] pt-4">
          <Summary label="Started with" value={fmtPrice(room.startingCapital)} />
          <Summary label="Duration" value={fmtClock(room.durationSeconds)} />
          <Summary
            label="Final price"
            value={result ? fmtPrice(result.finalPrice) : "—"}
          />
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
