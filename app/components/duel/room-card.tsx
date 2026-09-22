import type { Room } from "./types";
import { Avatar } from "./avatar";
import { Button } from "./button";
import { Icon } from "./duel-icon";
import { fmtClock, fmtUSD, timeAgo } from "./format";
import { useTranslations } from "next-intl";

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
  const t = useTranslations("RoomCard");

  return (
    <div
      onClick={isOwner ? () => onEnter?.(room) : undefined}
      className={`flex flex-col gap-4 rounded-lg border border-line bg-panel p-5 ${isOwner ? "cursor-pointer" : ""}`}
    >
      {/* Top: who made the room and how long ago */}
      <div className="flex items-center gap-3">
        <Avatar name={room.creator} size="lg" />
        <div className="min-w-0">
          <h3 className="truncate font-semibold">{room.name}</h3>
          <p className="text-xs text-muted">
            {t("by")} {isOwner ? t("you") : room.creator} · {timeAgo(room.ageMin)}
          </p>
        </div>
      </div>

      {/* Middle: the three settings the creator chose */}
      <div className="grid grid-cols-3 gap-2">
        <Detail label={t("symbol")} value={room.symbol} />
        <Detail label={t("duration")} value={fmtClock(room.duration)} />
        <Detail label={t("capital")} value={fmtUSD(room.capital)} />
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
                event.stopPropagation(); // becasue we have a click card to enter so this prevents
                onDelete?.(room);
              }}
            >
              <Icon name="trash" className="size-3.5" />
              {deleting ? t("deleting") : t("delete")}
            </Button>
            <Button
              onClick={(event) => {
                event.stopPropagation();
                onEnter?.(room);
              }}
            >
              {t("reEnter")}
            </Button>
          </div>
        ) : (
          <Button disabled={joining} onClick={() => onJoin?.(room)}>
            {joining ? t("joining") : t("join")}
          </Button>
        )}
      </div>
    </div>
  );
}

// A small label with a value under it, used three times above.
function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase text-dim">{label}</p>
      <p className="font-mono text-sm font-semibold">{value}</p>
    </div>
  );
}
