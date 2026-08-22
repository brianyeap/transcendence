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
        <MatchResultCard result={ended} match={match} viewerUserId={viewerUserId} />
      </div>
    </div>
  );
}
