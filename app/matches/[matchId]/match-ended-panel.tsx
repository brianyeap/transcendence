"use client";

import type React from "react";
import { useEffect, useRef } from "react";
import { MatchResultCard } from "./match-result-card";
import type { Match, MatchEnded } from "@/lib/match/types";

const FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function MatchEndedPanel({
  ended,
  match,
  viewerUserId,
}: {
  ended: MatchEnded;
  match: Match;
  viewerUserId: string;
}): React.ReactElement {
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const card = cardRef.current;
    if (card === null) return;

    card.focus();

    function trapTab(event: KeyboardEvent) {
      if (event.key !== "Tab" || card === null) return;

      const stops = [...card.querySelectorAll<HTMLElement>(FOCUSABLE)];
      const first = stops[0];
      const last = stops[stops.length - 1];
      const active = document.activeElement;

      if (first === undefined || last === undefined) {
        event.preventDefault();
        card.focus();
        return;
      }

      if (event.shiftKey && (active === first || active === card || !card.contains(active))) {
        event.preventDefault();
        last.focus();
        return;
      }

      if (!event.shiftKey && (active === last || !card.contains(active))) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", trapTab);
    return () => document.removeEventListener("keydown", trapTab);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div
        ref={cardRef}
        tabIndex={-1}
        className="max-h-full w-full max-w-lg overflow-y-auto rounded-xl border border-white/[.07] bg-[#0f131b] p-6 shadow-2xl outline-none sm:p-7"
      >
        <OutcomeHeader outcome={outcome} opponentName={opponentName} />

        <div className="mt-6 flex flex-col gap-2.5">
          <PlayerResult
            name={you.username}
            isViewer
            isWinner={outcome === "win"}
            isDraw={outcome === "draw"}
            finalCapital={ended.yourFinalCapital}
            startingCapital={match.startingCapital}
          />
          <PlayerResult
            name={opponentName}
            isViewer={false}
            isWinner={outcome === "loss"}
            isDraw={outcome === "draw"}
            finalCapital={ended.opponentFinalCapital}
            startingCapital={match.startingCapital}
          />
        </div>

        <Settlement
          finalPrice={ended.finalPrice}
          symbol={match.symbol}
          startingCapital={match.startingCapital}
        />

        {/* Only offer this when we actually know who the opponent was. */}
        {opponent === null ? null : (
          <AddFriendButton
            viewerUserId={viewerUserId}
            opponentUserId={opponent.userId}
            opponentName={opponent.username}
          />
        )}

        <div className="mt-6 flex flex-col gap-2.5 sm:flex-row">
          <Link
            href={`/history/${match.id}`}
            className="flex flex-1 items-center justify-center gap-2 rounded-[7px] bg-[#4d86ff] px-4 py-2.5 text-[13.5px] font-semibold text-white transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4d86ff]"
          >
            <ScrollText className="size-4" aria-hidden />
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

        <p className="mt-4 text-center text-[11.5px] text-[#5d6877]">{copy.footnote}</p>
      </div>
    </div>
  );
}
