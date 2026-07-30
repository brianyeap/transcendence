import type { Room } from "./types";
import { Avatar } from "./avatar";
import { Icon } from "./duel-icon";
import { fmtClock, fmtUSD, timeAgo } from "./format";

export function RoomCard({
  room,
  deleting = false,
  joining = false,
  onDelete,
  onJoin,
  onEnter,
}: {
  room: Room;
  deleting?: boolean;
  joining?: boolean;
  onDelete?: (room: Room) => void;
  onJoin?: (room: Room) => void;
  onEnter?: (room: Room) => void; // owner going back into their own room
}) {
  // Your own room card is clickable so you can walk back into the room you left.
  const isOwner = room.ownedByCurrentUser;

  return (
    <article
      onClick={isOwner ? () => onEnter?.(room) : undefined}
      className={`flex flex-col gap-4 overflow-hidden rounded-2xl border border-white/[.07] bg-[#0f131b] p-5 transition hover:-translate-y-0.5 hover:border-white/[.12] hover:shadow-[0_8px_24px_-8px_rgba(0,0,0,.55)] ${isOwner ? "cursor-pointer" : ""}`}
    >
      <div className="flex items-center gap-3.5">
        <Avatar name={room.creator} size="lg" />
        <div className="min-w-0">
          <h3 className="truncate text-[15.5px] font-semibold tracking-[-.01em]">{room.name}</h3>
          <p className="flex items-center gap-1.5 text-xs text-[#9aa6b6]">
            <span>
              by{" "}
              {room.ownedByCurrentUser ? (
                <span className="rounded-full border border-[#1fcb83]/25 bg-[#1fcb83]/10 px-2 py-0.5 font-semibold text-[#1fcb83]">
                  you
                </span>
              ) : (
                room.creator
              )}
            </span>
            <span className="text-[#3a434f]">·</span>
            <span>{timeAgo(room.ageMin)}</span>
          </p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2.5">
        {[
          ["Symbol", room.symbol],
          ["Duration", fmtClock(room.duration)],
          ["Capital", fmtUSD(room.capital)],
        ].map(([label, value]) => (
          <div key={label}>
            <p className="mb-1 text-[10.5px] font-bold uppercase tracking-[.04em] text-[#5d6877]">{label}</p>
            <p className="font-mono text-[13.5px] font-semibold">{value}</p>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-white/[.07] pt-3.5">
        <div className="flex items-center gap-2 text-xs text-[#9aa6b6]">
          <Icon name="users" className="size-4" />
          <span className="font-mono font-semibold text-[#eef2f8]">
            {room.players}/{room.capacity}
          </span>
        </div>
        {isOwner ? (
          <div className="flex items-center gap-2">
            <button
              // stopPropagation so deleting doesn't also trigger the card's "enter" click
              onClick={(event) => {
                event.stopPropagation();
                onDelete?.(room);
              }}
              disabled={deleting}
              className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-[7px] border border-[#f6485d]/30 bg-[#f6485d]/10 px-3 text-xs font-semibold text-[#ff8c99] transition hover:bg-[#f6485d]/15 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Icon name="trash" className="size-3.5" />
              {deleting ? "Deleting" : "Delete"}
            </button>
            <button
              onClick={(event) => {
                event.stopPropagation();
                onEnter?.(room);
              }}
              className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-[7px] bg-[#4d86ff] px-3 text-xs font-semibold text-white transition hover:brightness-110"
            >
              Re-enter
              <Icon name="chevR" className="size-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => onJoin?.(room)}
            disabled={joining}
            className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-[7px] bg-[#4d86ff] px-3 text-xs font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {joining ? "Joining" : "Join"}
            <Icon name="chevR" className="size-4" />
          </button>
        )}
      </div>
    </article>
  );
}
