"use client";

import type React from "react";
import { ArrowLeft, CircleSlash2 } from "lucide-react";
import Link from "next/link";
import type { Match } from "@/lib/match/types";

export function MatchCancelled({ match }: { match: Match }): React.ReactElement {
  return (
    <div className="flex flex-1 items-center justify-center px-5 py-5">
      <div className="w-full max-w-md rounded-xl border border-white/[.07] bg-[#0f131b] p-8 text-center">
        <span className="inline-flex items-center gap-1.5 rounded-[7px] border border-white/[.12] bg-white/[.04] px-2.5 py-1 text-[11.5px] font-bold uppercase tracking-[.08em] text-[#9aa6b6]">
          <CircleSlash2 className="size-3.5" aria-hidden />
          Cancelled
        </span>

        <h1 className="mt-3.5 text-[21px] font-bold tracking-[-.01em]">Match cancelled</h1>
        <p className="mt-2 text-[13px] text-[#9aa6b6]">
          This {match.symbol} match was cancelled before it started. No trades were placed and
          no capital changed hands.
        </p>

        <Link
          href="/"
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-[7px] bg-[#4d86ff] px-4 py-2.5 text-[13.5px] font-semibold text-white transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4d86ff]"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Back to games
        </Link>
      </div>
    </div>
  );
}
