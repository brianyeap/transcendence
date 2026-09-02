import type { Room } from "./types";
import { Avatar } from "./avatar";
import { Button } from "./button";
import { Icon } from "./duel-icon";
import { fmtClock, fmtUSD, timeAgo } from "./format";

//  One card in the lobby. Your own room is clickable so you can walk back
//  into the room you left; other people's rooms have a Join button.
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
  onEnter?: (room: Room) => void;
}) {
  const isOwner = room.ownedByCurrentUser;

  return (
    <article
      onClick={isOwner ? () => onEnter?.(room) : undefined}
      className={`flex flex-col gap-4 rounded-lg border border-line bg-panel p-5 ${isOwner ? "cursor-pointer" : ""}`}
    >
      {/* Top: who made the room and how long ago */}
      <div className="flex items-center gap-3">
        <Avatar name={room.creator} size="lg" />
        <div className="min-w-0">
          <h3 className="truncate font-semibold">{room.name}</h3>
          <p className="text-xs text-muted">
            by {isOwner ? "you" : room.creator} · {timeAgo(room.ageMin)}
          </p>
        </div>
      </div>

      {/* Middle: the three settings the creator chose */}
      <div className="grid grid-cols-3 gap-2">
        <Detail label="Symbol" value={room.symbol} />
        <Detail label="Duration" value={fmtClock(room.duration)} />
        <Detail label="Capital" value={fmtUSD(room.capital)} />
      </div>

      {/* Bottom: player count on the left, buttons on the right */}
      <div className="flex items-center justify-between gap-3 border-t border-line pt-3">
        <span className="flex items-center gap-2 text-xs text-muted">
          <Icon name="users" className="size-4" />
          <span className="font-mono font-semibold text-ink">
            {room.players}/{room.capacity}
          </span>
        </span>

        {isOwner ? (
          <div className="flex items-center gap-2">
            {/* stopPropagation so the button doesn't also trigger the card's click */}
            <Button
              variant="danger"
              disabled={deleting}
              onClick={(event) => {
                event.stopPropagation();
                onDelete?.(room);
              }}
            >
              <Icon name="trash" className="size-4" />
              {deleting ? "Deleting" : "Delete"}
            </Button>
            <Button
              onClick={(event) => {
                event.stopPropagation();
                onEnter?.(room);
              }}
            >
              Re-enter
            </Button>
          </div>
        ) : (
          <Button disabled={joining} onClick={() => onJoin?.(room)}>
            {joining ? "Joining" : "Join"}
          </Button>
        )}
      </div>
    </article>
  );
}

//  A small label with a value under it, used three times above.
function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase text-dim">{label}</p>
      <p className="font-mono text-sm font-semibold">{value}</p>
    </div>
  );
}
