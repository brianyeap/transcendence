"use client";

import type React from "react";
import { Avatar } from "../../components/duel/avatar";
import type { PlayerRef } from "@/lib/match/types";

export function PlayerSlot({
  player,
  viewerUserId,
  emptyLabel = "Waiting for a player",
}: {
  player: PlayerRef | null;
  viewerUserId: string | null;
  emptyLabel?: string;
}): React.ReactElement {
  if (player === null) {
    return (
      <div className="flex flex-1 items-center gap-3 rounded-[7px] border border-dashed border-white/[.12] bg-[#0f131b] px-4 py-3.5">
        <span
          aria-hidden="true"
          className="grid size-9 shrink-0 place-items-center rounded-[30%] border border-dashed border-white/[.12] text-sm text-[#3a434f]"
        >
          ?
        </span>
        <div className="min-w-0">
          <p aria-hidden="true" className="truncate text-[14px] font-semibold text-[#5d6877]">
            {emptyLabel}
          </p>
          <p aria-hidden="true" className="mt-0.5 text-[11.5px] text-[#3a434f]">
            Open seat
          </p>
          <p className="sr-only">{emptyLabel}. This seat is open.</p>
        </div>
      </div>
    );
  }

  const isViewer = player.userId === viewerUserId;

  return (
    <div className="flex flex-1 items-center gap-3 rounded-[7px] border border-white/[.07] bg-[#151b25] px-4 py-3.5">
      <Avatar name={player.username} size="md" />
      <div className="min-w-0">
        <p className="flex items-baseline gap-2 text-[14px] font-semibold text-[#eef2f8]">
          <span className="truncate">{player.username}</span>
          {isViewer ? (
            <span className="rounded border border-[#4d86ff]/30 px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-[.08em] text-[#4d86ff]">
              You
            </span>
          ) : null}
        </p>
        <p aria-hidden="true" className="mt-0.5 text-[11.5px] text-[#1fcb83]">
          Ready
        </p>
        <p className="sr-only">{isViewer ? "You are ready." : "This player is ready."}</p>
      </div>
    </div>
  );
}
