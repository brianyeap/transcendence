import type { Room } from "./types";
import { Avatar } from "./avatar";
import { Icon } from "./duel-icon";
import { fmtClock, fmtUSD, timeAgo } from "./format";

export function RoomCard({ room }: { room: Room }) {
  return (
    <article className="flex flex-col gap-4 overflow-hidden rounded-2xl border border-white/[.07] bg-[#0f131b] p-5 transition hover:-translate-y-0.5 hover:border-white/[.12] hover:shadow-[0_8px_24px_-8px_rgba(0,0,0,.55)]">
      <div className="flex items-center gap-3.5">
        <Avatar name={room.creator} size="lg" />
        <div className="min-w-0">
          <h3 className="truncate text-[15.5px] font-semibold tracking-[-.01em]">{room.name}</h3>
          <p className="flex items-center gap-1.5 text-xs text-[#9aa6b6]">
            <span>by {room.creator}</span>
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
        <button className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-[7px] bg-[#4d86ff] px-3 text-xs font-semibold text-white transition hover:brightness-110">
          Join
          <Icon name="chevR" className="size-4" />
        </button>
      </div>
    </article>
  );
}
