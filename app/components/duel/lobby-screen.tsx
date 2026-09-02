"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { RoomCard } from "./room-card";
import { Icon } from "./duel-icon";
import { Button } from "./button";
import type { Room } from "./types";
import { CreateMatchModal } from "./create-match-modal";

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
  const router = useRouter(); // lets us send the user to the match page after joining
  const [refreshing, setRefreshing] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [openRooms, setOpenRooms] = useState<Room[]>([]);
  const [deletingRoomIds, setDeletingRoomIds] = useState<string[]>([]);
  const [joiningRoomId, setJoiningRoomId] = useState<string | null>(null);

  //  You may only have one room at a time, so this disables "Create Room".
  const hasCurrentUserRoom = openRooms.some((room) => room.ownedByCurrentUser);

  const deleteRoom = useCallback(async (room: Room) => {
    if (!room.ownedByCurrentUser) {
      return;
    }

    setDeletingRoomIds((roomIds) => [...roomIds, room.id]); // for keeping track which room is deleting

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
    } finally { // runs no matter what
      setDeletingRoomIds((roomIds) => roomIds.filter((roomId) => roomId !== room.id));
    }
  }, []);

  //  Join someone else's room: tell the server, then go to the match page.
  const joinRoom = useCallback(async (room: Room) => {
    setJoiningRoomId(room.id); // show "Joining" on this room's button

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

      // The room id is also the match id — open the match page.
      router.push(`/matches/${result.roomId}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not join room.");
      setJoiningRoomId(null); // let them try again
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
          <h1 className="text-xl font-bold">Games</h1>
          <p className="text-sm text-muted">Find an open match or jump into the action</p>
        </div>

        <Button variant="quiet" onClick={refresh}>
          <Icon name="refresh" className={`size-4 ${refreshing ? "animate-spin" : ""}`} />
        </Button>

        <Button
          onClick={() => setModalOpen(true)}
          disabled={hasCurrentUserRoom}
          title={hasCurrentUserRoom ? "Delete or finish your current game before creating another." : undefined}
        >
          <Icon name="plus" className="size-4" />
          Create Room
        </Button>
      </header>

      <CreateMatchModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />

      <div className="flex-1 overflow-y-auto p-6">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-dim">
          <Icon name="users" className="size-4" />
          Open Games ({openRooms.length})
        </h2>

        <div className="grid gap-4 xl:grid-cols-2">
          {!refreshing && openRooms.length === 0 ? (
            <p className="rounded-md border border-line bg-panel px-4 py-3 text-sm text-muted">
              No open rooms yet.
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
