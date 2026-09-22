"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { RoomCard } from "./room-card";
import { Icon } from "./duel-icon";
import { Button } from "./button";
import type { Room } from "./types";
import { CreateMatchModal } from "./create-match-modal";
import { useTranslations } from "next-intl";

//  A match you are already in. /api/rooms sends this back so the lobby can
//  offer a way in — a match in countdown or active is NOT in the open-rooms
//  list, so without this you would be locked out of your own game.
type ActiveMatch = {
  id: string;
  name: string;
  status: string;
  opponent: string;
  endsAt: string | null;
};

//  Your own room goes to the top of the list, then the newest rooms.
function ownRoomFirst(rooms: Room[]) {
  return rooms.toSorted((roomA, roomB) => {
    if (roomA.ownedByCurrentUser !== roomB.ownedByCurrentUser) {
      return roomA.ownedByCurrentUser ? -1 : 1;
    }

    return roomA.ageMin - roomB.ageMin;
  });
}

export function LobbyScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [openRooms, setOpenRooms] = useState<Room[]>([]);
  const [deletingRoomIds, setDeletingRoomIds] = useState<string[]>([]);
  const [joiningRoomId, setJoiningRoomId] = useState<string | null>(null);
  const [activeMatch, setActiveMatch] = useState<ActiveMatch | null>(null);
  const t = useTranslations("Lobby");

  //  You may only have one room at a time, so this disables "Create Room".
  const hasCurrentUserRoom = openRooms.some((room) => room.ownedByCurrentUser);

  const deleteRoom = useCallback(async (room: Room) => {
    if (!room.ownedByCurrentUser) {
      return;
    }

    setDeletingRoomIds((roomIds) => [...roomIds, room.id]);

    try {
      const response = await fetch("/api/rooms", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId: room.id }),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error ?? "Could not delete room.");
      }

      setOpenRooms((rooms) => rooms.filter((existingRoom) => existingRoom.id !== result.roomId));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete room.");
    } finally {
      setDeletingRoomIds((roomIds) => roomIds.filter((roomId) => roomId !== room.id));
    }
  }, []);

  //  Join someone else's room: tell the server, then go to the match page.
  const joinRoom = useCallback(async (room: Room) => {
    setJoiningRoomId(room.id);

    try {
      const response = await fetch("/api/rooms/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId: room.id }),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error ?? "Could not join room.");
      }

      router.push(`/matches/${result.roomId}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not join room.");
      setJoiningRoomId(null);
    }
  }, [router]);

  //  Go back into a room you created and left. No API call needed — you are
  //  already player one, so we just open the match page again.
  const enterOwnRoom = useCallback((room: Room) => {
    router.push(`/matches/${room.id}`);
  }, [router]);

  const refresh = useCallback(async () => {
    setRefreshing(true);

    try {
      const response = await fetch("/api/rooms", { cache: "no-store" });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error ?? "Could not load rooms.");
      }

      setOpenRooms(ownRoomFirst(result.rooms));
      setActiveMatch(result.activeMatch ?? null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not load rooms.");
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <>
      {/* Page header: title on the left, refresh and create on the right */}
      <header className="flex items-center gap-4 border-b border-line px-6 py-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-bold">{t("title")}</h1>
          <p className="text-sm text-muted">{t("subtitle")}</p>
        </div>

        <Button variant="quiet" onClick={refresh}>
          <Icon name="refresh" className={`size-4 ${refreshing ? "animate-spin" : ""}`} />
        </Button>

        <Button
          onClick={() => setModalOpen(true)}
          disabled={hasCurrentUserRoom}
          title={hasCurrentUserRoom ? t("tooltipLimit") : undefined}
        >
          <Icon name="plus" className="size-4" />
          {t("createRoom")}
        </Button>
      </header>

      <CreateMatchModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />

      <div className="flex-1 overflow-y-auto p-6">
        {/* Your game in progress. Shown above the list so it is the first thing
            you see when you come back to the lobby mid-match. */}
        {activeMatch ? (
          <div className="mb-6 flex items-center gap-4 rounded-lg border border-brand/40 bg-brand/10 px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">
                {activeMatch.status === "countdown"
                  ? t("matchStarting")
                  : t("matchLive")}
              </p>
              <p className="truncate text-xs text-muted">
                {activeMatch.name} · {t("vs")} {activeMatch.opponent}
              </p>
            </div>

            <Button onClick={() => router.push(`/matches/${activeMatch.id}`)}>
              {t("rejoin")}
            </Button>
          </div>
        ) : null}

        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-dim">
          <Icon name="users" className="size-4" />
          {t("openGames")} ({openRooms.length})
        </h2>

        <div className="grid gap-4 xl:grid-cols-2">
          {!refreshing && openRooms.length === 0 ? (
            <p className="rounded-md border border-line bg-panel px-4 py-3 text-sm text-muted">
              {t("noOpenRooms")}
            </p>
          ) : null}

          {openRooms.map((room) => (
            <RoomCard
              key={room.id}
              room={room}
              deleting={deletingRoomIds.includes(room.id)}
              joining={joiningRoomId === room.id}
              onDelete={deleteRoom}
              onJoin={joinRoom}
              onEnter={enterOwnRoom}
            />
          ))}
        </div>
      </div>
    </>
  );
}
