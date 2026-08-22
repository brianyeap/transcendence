"use client";

import type React from "react";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { MatchResultCard } from "./match-result-card";
import { useCompletedResult } from "./use-completed-result";
import type { Match, MatchEnded } from "@/lib/match/types";

export function MatchResult({
  match,
  ended,
  viewerUserId,
}: {
  match: Match;
  ended: MatchEnded | null;
  viewerUserId: string | null;
}): React.ReactElement {
  const settled = useCompletedResult(match.id, viewerUserId);

  const result = ended ?? (settled.status === "ready" ? settled.result : null);

  if (result === null || viewerUserId === null) {
    return settled.status === "loading" ? <ResultLoading /> : <ResultUnavailable match={match} />;
  }

  return (
    <div className="flex flex-1 items-center justify-center px-5 py-5">
      <div className="w-full max-w-lg rounded-xl border border-white/[.07] bg-[#0f131b] p-6 sm:p-7">
        <p className="mb-4 text-center text-[10.5px] font-bold uppercase tracking-[.08em] text-[#3a434f]">
          Final result
        </p>
        <MatchResultCard
          result={result}
          match={match}
          viewerUserId={viewerUserId}
          headingLevel={1}
        />
      </div>
    </div>
  );
}

function ResultLoading() {
  return (
    <div className="flex flex-1 items-center justify-center px-5 py-5">
      <p
        role="status"
        aria-live="polite"
        className="flex items-center gap-2.5 text-sm text-[#5d6877]"
      >
        <span aria-hidden="true" className="size-2 animate-pulse rounded-full bg-[#4d86ff]" />
        Loading the final result…
      </p>
    </div>
  );
}

function ResultUnavailable({ match }: { match: Match }) {
  return (
    <div className="flex flex-1 items-center justify-center px-5 py-5">
      <div className="w-full max-w-md rounded-xl border border-white/[.07] bg-[#0f131b] p-8 text-center">
        <h1 className="text-[21px] font-bold tracking-[-.01em]">This match has finished</h1>
        <p className="mt-2 text-[13px] text-[#9aa6b6]">
          The final figures are not available on this screen. The match summary has the full
          record.
        </p>
        <div className="mt-6 flex flex-col gap-2.5 sm:flex-row">
          <Link
            href={`/history/${match.id}`}
            className="flex flex-1 items-center justify-center gap-2 rounded-[7px] bg-[#4d86ff] px-4 py-2.5 text-[13.5px] font-semibold text-white transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4d86ff]"
          >
            View match summary
          </Link>
          <Link
            href="/"
            className="flex flex-1 items-center justify-center gap-2 rounded-[7px] border border-white/[.1] bg-gray-800 px-4 py-2.5 text-[13.5px] font-semibold text-[#eef2f8] transition hover:bg-gray-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4d86ff]"
          >
            <ArrowLeft className="size-4" aria-hidden />
            Back to games
          </Link>
        </div>
      </div>
    </div>
  );
}
