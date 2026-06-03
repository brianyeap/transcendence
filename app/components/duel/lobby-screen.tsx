"use client";

import { useState } from "react";
import { activeGames, openRooms } from "./data";
import { Logo } from "./logo";
import { ActiveGameRow } from "./active-game-row";
import { RoomCard } from "./room-card";
import { Icon } from "./duel-icon";
import type { IconName } from "./types";

export function LobbyScreen() {
  // (open) make it start on open
  const [tab, setTab] = useState<"open" | "active">("open");
  const [refreshing, setRefreshing] = useState(false);

  function refresh() {
    setRefreshing(true);
    window.setTimeout(() => setRefreshing(false), 700);
  }

  return (
    <>
      <header className="flex min-h-[74px] items-center gap-4 border-b border-white/[.07] px-5 py-4 sm:px-7">
        <div className="min-w-0 flex-1">
          <h1 className="text-[21px] font-bold tracking-[-.01em]">Games</h1>
          <p className="mt-1 text-[13px] text-[#9aa6b6]">Find an open match or jump into the action</p>
        </div>
        <button onClick={refresh} className="grid size-10 cursor-pointer place-items-center rounded-[7px] border border-white/[.07] bg-[#0f131b] text-[#9aa6b6] transition hover:border-white/[.12]">
          <Icon name="refresh" className={`size-4 ${refreshing ? "animate-spin" : ""}`} />
        </button>
        <button className="hidden h-10 cursor-pointer items-center gap-2 rounded-[7px] bg-[#4d86ff] px-4 text-sm font-semibold text-white shadow-[0_6px_18px_-6px_rgba(77,134,255,.4)] transition hover:brightness-110 sm:inline-flex">
          <Icon name="plus" className="size-4" />
          Create Room
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-7">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
          <div className="inline-flex rounded-[7px] border border-white/[.07] bg-[#151b25] p-1">
            {[
              ["open", "Open Games", "users", openRooms.length],
              ["active", "Active Games", "bolt", activeGames.length],
            ].map(([value, label, icon, count]) => {
              const active = tab === value;
              return (
                <button
                  key={value}
                  onClick={() => setTab(value as "open" | "active")}
                  className={`flex cursor-pointer items-center gap-2 rounded-md px-3.5 py-2 text-[13.5px] font-semibold transition ${active ? "bg-[#1c2430] text-[#eef2f8] shadow-sm" : "text-[#5d6877] hover:text-[#9aa6b6]"}`}
                >
                  <Icon name={icon as IconName} className="size-4" />
                  {label}
                  <span className={`font-mono text-[11px] font-bold ${active ? "text-[#4d86ff]" : "text-[#3a434f]"}`}>{count}</span>
                </button>
              );
            })}
          </div>
          <p className="flex items-center gap-2 text-xs text-[#5d6877]">
            <span className="size-2 animate-pulse rounded-full bg-[#1fcb83] shadow-[0_0_10px_#1fcb83]" />
            Live · updated now
          </p>
        </div>

        {tab === "open" ? (
          <div className="grid gap-4 xl:grid-cols-2 2xl:grid-cols-3">
            {openRooms.map((room) => (
              <RoomCard key={room.id} room={room} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {activeGames.map((game) => (
              <ActiveGameRow key={game.id} game={game} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
