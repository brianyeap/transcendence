"use client";

import { useCallback, useEffect, useState } from "react";
import { ActiveGameRow } from "./active-game-row";
import { RoomCard } from "./room-card";
import { Icon } from "./duel-icon";
import type { ActiveGame, IconName, Room } from "./types";
import { CreateMatchModal } from "./create-match-modal";

export function LobbyScreen() {
  // (open) make it start on open
  const [tab, setTab] = useState<"open" | "active">("open");
  const [refreshing, setRefreshing] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [openRooms, setOpenRooms] = useState<Room[]>([]);
  const [activeGames] = useState<ActiveGame[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [deletingRoomIds, setDeletingRoomIds] = useState<string[]>([]);
  const hasCurrentUserRoom = openRooms.some((room) => room.ownedByCurrentUser);

  const putCurrentUserRoomFirst = useCallback((rooms: Room[]) => {
    return rooms.toSorted((roomA, roomB) => {
      if (roomA.ownedByCurrentUser !== roomB.ownedByCurrentUser) {
        return roomA.ownedByCurrentUser ? -1 : 1;
      }

      return roomA.ageMin - roomB.ageMin;
    });
  }, []);

  const upsertRoom = useCallback((room: Room) => { // usecallback is used to prevent unnecessaey render of the component, only render if dependencies changed
    setOpenRooms((rooms) =>
      putCurrentUserRoomFirst([
        room, // places the new room at the top of the list
        ...rooms.filter((existingRoom) => existingRoom.id !== room.id), // filter out the room that is being updated, so we don't have duplicates
      ])
    );
  }, [putCurrentUserRoomFirst]);

  const deleteRoom = useCallback(async (room: Room) => {
    if (!room.ownedByCurrentUser) {
      return;
    }

    setDeletingRoomIds((roomIds) => [...roomIds, room.id]); // for keeping track whch room deleting
    setError(null);

    try {
      const response = await fetch("/api/rooms", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ roomId: room.id }),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error ?? "Could not delete room.");
      }

      setOpenRooms((rooms) =>
        rooms.filter((existingRoom) => existingRoom.id !== result.roomId)
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete room.");
    } finally { // rusn no matter wjat
      setDeletingRoomIds((roomIds) =>
        roomIds.filter((roomId) => roomId !== room.id)
      );
    }
  }, []);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    setError(null);

    try {
      const response = await fetch("/api/rooms", {
        cache: "no-store",
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error ?? "Could not load rooms.");
      }

      setOpenRooms(putCurrentUserRoomFirst(result.rooms));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load rooms.");
    } finally {
      setRefreshing(false);
    }
  }, [putCurrentUserRoomFirst]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    function handleRoomCreated(event: Event) {
      const createdRoom = (event as CustomEvent<Room>).detail;

      if (createdRoom) {
        upsertRoom(createdRoom);
      } else {
        refresh();
      }
    }

    window.addEventListener("room-created", handleRoomCreated);
    return () => window.removeEventListener("room-created", handleRoomCreated); // cleanup
  }, [refresh, upsertRoom]);

  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent("current-user-room-state", {
        detail: { hasCurrentUserRoom },
      })
    );
  }, [hasCurrentUserRoom]);

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
        <button
          onClick={() => setModalOpen(true)}
          disabled={hasCurrentUserRoom}
          title={hasCurrentUserRoom ? "Delete or finish your current game before creating another." : undefined}
          className="hidden h-10 cursor-pointer items-center gap-2 rounded-[7px] bg-[#4d86ff] px-4 text-sm font-semibold text-white shadow-[0_6px_18px_-6px_rgba(77,134,255,.4)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50 sm:inline-flex"
        >
          <Icon name="plus" className="size-4" />
          Create Room
        </button>
      </header>

      <CreateMatchModal isOpen={modalOpen} onClose={() => setModalOpen(false)} onCreated={upsertRoom}/>

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
            {error ? (
              <p className="rounded-[7px] border border-[#f6485d]/30 bg-[#f6485d]/10 px-3 py-2 text-sm text-[#ff8c99]">
                {error}
              </p>
            ) : null}
            {!error && !refreshing && openRooms.length === 0 ? (
              <p className="rounded-[7px] border border-white/[.07] bg-[#0f131b] px-4 py-3 text-sm text-[#9aa6b6]">
                No open rooms yet.
              </p>
            ) : null}
            {openRooms.map((room) => (
              <RoomCard
                key={room.id}
                room={room}
                deleting={deletingRoomIds.includes(room.id)}
                onDelete={deleteRoom}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {activeGames.length === 0 ? (
              <p className="rounded-[7px] border border-white/[.07] bg-[#0f131b] px-4 py-3 text-sm text-[#9aa6b6]">
                No active games yet.
              </p>
            ) : null}
            {activeGames.map((game) => (
              <ActiveGameRow key={game.id} game={game} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
