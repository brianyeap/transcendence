"use client";

import { useEffect, useReducer, useState } from "react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { Avatar } from "../../components/duel/avatar";
import { fmtClock, fmtUSD } from "../../components/duel/format";
import type { Match, PlayerState } from "@/lib/match/types";

const URGENT_SECONDS = 30;

const TICK_MS = 250;

export function MatchHeader({
  match,
  price,
  priceDirection,
  player,
  serverNow,
}: {
  match: Match;
  price: number | null;
  priceDirection: "up" | "down" | "flat";
  player: PlayerState | null;
  serverNow: () => number;
}) {
  const remaining = useRemainingSeconds(match.endsAt, serverNow);
  const announcement = useMoneyAnnouncement(player, match.startingCapital, remaining);

  return (
    <>
      <p role="status" aria-live="polite" className="sr-only">
        {announcement}
      </p>

      <header className="flex flex-wrap items-stretch gap-x-8 gap-y-5 rounded-xl border border-white/[.07] bg-[#0f131b] px-5 py-4">
        <MatchupBlock match={match} />
        <PriceBlock symbol={match.symbol} price={price} direction={priceDirection} />
        <ClockBlock remaining={remaining} />
        <div aria-hidden="true" className="grow" />
        <CapitalBlock player={player} />
      </header>
    </>
  );
}

function useMoneyAnnouncement(
  player: PlayerState | null,
  startingCapital: number,
  remaining: number | null
): string {
  const key = announcementKey(player, startingCapital, remaining);
  const text = announcementText(player, startingCapital, remaining);

  const [announced, setAnnounced] = useState({ key, text });
  if (announced.key !== key) {
    setAnnounced({ key, text });
  }

  return announced.text;
}

function announcementKey(
  player: PlayerState | null,
  startingCapital: number,
  remaining: number | null
): string {
  if (player === null) return "connecting";
  return [
    direction(player.capital, player.opponentCapital),
    direction(player.capital, startingCapital),
    clockBucket(remaining),
  ].join(":");
}

function direction(value: number, against: number): "up" | "down" | "level" {
  const gap = Math.round(value) - Math.round(against);
  return gap > 0 ? "up" : gap < 0 ? "down" : "level";
}

function clockBucket(remaining: number | null): string {
  if (remaining === null) return "no-clock";
  if (remaining <= 10) return "final-10";
  if (remaining <= 30) return "final-30";
  if (remaining <= 60) return "final-60";
  return `t${Math.floor(remaining / 30)}`;
}

function announcementText(
  player: PlayerState | null,
  startingCapital: number,
  remaining: number | null
): string {
  if (player === null) return "";

  const gap = Math.round(player.capital) - Math.round(player.opponentCapital);
  const standing =
    gap > 0
      ? `You are ahead by ${fmtUSD(gap)}.`
      : gap < 0
        ? `You are behind by ${fmtUSD(Math.abs(gap))}.`
        : "You are level with your opponent.";

  const net = Math.round(player.capital) - Math.round(startingCapital);
  const versusStart =
    net > 0
      ? `Up ${fmtUSD(net)} on your starting capital.`
      : net < 0
        ? `Down ${fmtUSD(Math.abs(net))} on your starting capital.`
        : "Level with your starting capital.";

  const clock = remaining === null ? "" : ` ${spokenClock(remaining)} left.`;

  return `Your capital ${fmtUSD(Math.round(player.capital))}. Opponent capital ${fmtUSD(
    Math.round(player.opponentCapital)
  )}. ${standing} ${versusStart}${clock}`;
}

function spokenClock(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  const minutePart = minutes === 0 ? "" : `${minutes} minute${minutes === 1 ? "" : "s"}`;
  const secondPart = rest === 0 && minutes > 0 ? "" : `${rest} second${rest === 1 ? "" : "s"}`;
  return [minutePart, secondPart].filter((part) => part !== "").join(" ");
}

function spokenPrice(value: number): string {
  return value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function useRemainingSeconds(endsAt: string | null, serverNow: () => number): number | null {
  const [, forceRerender] = useReducer((count: number) => count + 1, 0);

  useEffect(() => {
    if (endsAt === null) return;
    const id = window.setInterval(forceRerender, TICK_MS);
    return () => window.clearInterval(id);
  }, [endsAt]);

  if (endsAt === null) return null;
  const endsAtMs = new Date(endsAt).getTime();
  if (Number.isNaN(endsAtMs)) return null;
  return Math.max(0, Math.ceil((endsAtMs - serverNow()) / 1000));
}

function MatchupBlock({ match }: { match: Match }) {
  return (
    <div className="min-w-[170px]">
      <div aria-hidden="true">
        <SectionLabel>Match</SectionLabel>
        <div className="mt-1.5 flex items-center gap-2">
          <Avatar name={match.playerOne.username} size="sm" />
          <span className="text-[11px] font-bold uppercase tracking-[.08em] text-[#3a434f]">
            vs
          </span>
          {match.playerTwo ? (
            <Avatar name={match.playerTwo.username} size="sm" />
          ) : (
            <span className="grid size-8 shrink-0 place-items-center rounded-[30%] border border-dashed border-white/[.12] text-xs text-[#3a434f]">
              ?
            </span>
          )}
        </div>
        <p className="mt-2 truncate text-[12.5px] text-[#9aa6b6]">
          {match.playerOne.username}
          <span className="px-1.5 text-[#3a434f]">·</span>
          {match.playerTwo?.username ?? "waiting"}
        </p>
      </div>

      <p className="sr-only">
        {match.playerTwo === null
          ? `Match: ${match.playerOne.username}, waiting for an opponent.`
          : `Match: ${match.playerOne.username} versus ${match.playerTwo.username}.`}
      </p>
    </div>
  );
}

function PriceBlock({
  symbol,
  price,
  direction,
}: {
  symbol: string;
  price: number | null;
  direction: "up" | "down" | "flat";
}) {
  const tone =
    direction === "up" ? "text-[#1fcb83]" : direction === "down" ? "text-[#f6485d]" : "text-[#9aa6b6]";
  const DirectionIcon =
    direction === "up" ? ArrowUpRight : direction === "down" ? ArrowDownRight : Minus;
  const directionLabel =
    direction === "up" ? "rising" : direction === "down" ? "falling" : "unchanged";

  return (
    <div className="min-w-[190px]">
      <div aria-hidden="true">
        <SectionLabel>{symbol}</SectionLabel>
        <div className="mt-1.5 flex items-center gap-2">
          <span className="font-mono text-[28px] font-semibold leading-none tracking-[-.02em] tabular-nums">
            {price === null ? "—" : price.toFixed(2)}
          </span>
          {price !== null && (
            <span className={`flex items-center gap-1 ${tone}`} title={`Price ${directionLabel}`}>
              <DirectionIcon className="size-4" aria-hidden />
            </span>
          )}
        </div>
      </div>

      <p className="sr-only">
        {price === null
          ? `${symbol} price is not available yet.`
          : `${symbol} price ${spokenPrice(price)}, ${directionLabel}.`}
      </p>
    </div>
  );
}

function ClockBlock({ remaining }: { remaining: number | null }) {
  const urgent = remaining !== null && remaining <= URGENT_SECONDS;

  return (
    <div className="min-w-[120px]">
      <div aria-hidden="true">
        <SectionLabel>Time left</SectionLabel>
        <p
          className={`mt-1.5 font-mono text-[28px] font-semibold leading-none tracking-[-.02em] tabular-nums ${
            urgent ? "text-[#f6485d]" : "text-[#eef2f8]"
          }`}
        >
          {remaining === null ? "—:——" : fmtClock(remaining)}
        </p>
        {urgent && (
          <p className="mt-1.5 text-[10.5px] font-bold uppercase tracking-[.08em] text-[#f6485d]">
            Closing
          </p>
        )}
      </div>

      <p className="sr-only">
        {remaining === null
          ? "Time left is not known yet."
          : `Time left: ${spokenClock(remaining)}.${urgent ? " The match is closing." : ""}`}
      </p>
    </div>
  );
}

function CapitalBlock({ player }: { player: PlayerState | null }) {
  return (
    <div className="flex flex-wrap items-start gap-x-7 gap-y-4">
      <div>
        <div aria-hidden="true">
          <SectionLabel>Your capital</SectionLabel>
          <p className="mt-1.5 font-mono text-[22px] font-semibold leading-none tracking-[-.02em] tabular-nums">
            {player === null ? "—" : fmtUSD(Math.round(player.capital))}
          </p>
        </div>
        <p className="sr-only">
          {player === null
            ? "Your capital is not known yet."
            : `Your capital ${fmtUSD(Math.round(player.capital))}.`}
        </p>

        <div className="mt-2.5 flex items-center gap-2 text-[11.5px]">
          <BalanceChip
            label="Available"
            value={player === null ? null : player.availableBalance}
            accent="text-[#eef2f8]"
          />
          <BalanceChip
            label="Reserved"
            value={player === null ? null : player.reservedBalance}
            accent="text-[#4d86ff]"
          />
        </div>
      </div>

      <div>
        <div aria-hidden="true">
          <SectionLabel>Opponent</SectionLabel>
          <p className="mt-1.5 font-mono text-[22px] font-semibold leading-none tracking-[-.02em] tabular-nums text-[#9aa6b6]">
            {player === null ? "—" : fmtUSD(Math.round(player.opponentCapital))}
          </p>
        </div>
        <p className="sr-only">
          {player === null
            ? "Opponent capital is not known yet."
            : `Opponent capital ${fmtUSD(Math.round(player.opponentCapital))}.`}
        </p>

        <div className="mt-2.5">
          <StandingLine player={player} />
        </div>
      </div>
    </div>
  );
}

function StandingLine({ player }: { player: PlayerState | null }) {
  if (player === null) {
    return <p className="text-[11.5px] text-[#5d6877]">Connecting…</p>;
  }

  const gap = player.capital - player.opponentCapital;
  const rounded = Math.round(gap);

  if (rounded === 0) {
    return <p className="text-[11.5px] text-[#9aa6b6]">Level</p>;
  }

  return (
    <p className={`text-[11.5px] font-semibold ${rounded > 0 ? "text-[#1fcb83]" : "text-[#f6485d]"}`}>
      {rounded > 0 ? "Ahead by " : "Behind by "}
      <span className="font-mono tabular-nums">{fmtUSD(Math.abs(rounded))}</span>
    </p>
  );
}

function BalanceChip({
  label,
  value,
  accent,
}: {
  label: string;
  value: number | null;
  accent: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-[7px] border border-white/[.07] bg-[#151b25] px-2 py-1">
      <span aria-hidden="true" className="text-[#5d6877]">
        {label}
      </span>
      <span aria-hidden="true" className={`font-mono font-semibold tabular-nums ${accent}`}>
        {value === null ? "—" : fmtUSD(Math.round(value))}
      </span>
      <span className="sr-only">
        {value === null
          ? `${label} balance is not known yet.`
          : `${label} balance ${fmtUSD(Math.round(value))}.`}
      </span>
    </span>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10.5px] font-bold uppercase tracking-[.08em] text-[#3a434f]">{children}</p>
  );
}
