"use client";

import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { useTranslations } from "next-intl";
import { Avatar } from "../../components/duel/avatar";
import { fmtClock, fmtUSD } from "../../components/duel/format";
import { SectionLabel } from "../../components/duel/section-label";
import { LeaveMatch } from "./leave-match";
import { useRemainingSeconds } from "@/lib/match/use-remaining-seconds";
import type { Match, PlayerState } from "@/lib/match/types";

const URGENT_SECONDS = 30;

export function MatchHeader({
  match,
  price,
  priceDirection,
  player,
  serverNow,
  matchOver,
}: {
  match: Match;
  price: number | null;
  priceDirection: "up" | "down" | "flat";
  player: PlayerState | null;
  serverNow: () => number;
  matchOver: boolean;
}) {
  const remaining = useRemainingSeconds(match.endsAt, serverNow);

  return (
    <header className="flex flex-wrap items-stretch gap-x-8 gap-y-5 rounded-xl border border-white/[.07] bg-[#0f131b] px-5 py-4">
      <MatchupBlock match={match} />
      <PriceBlock symbol={match.symbol} price={price} direction={priceDirection} />
      <ClockBlock remaining={remaining} />
      <div className="grow" />
      <CapitalBlock player={player} />
      {matchOver ? null : <LeaveMatch needsConfirm className="self-start" />}
    </header>
  );
}

function MatchupBlock({ match }: { match: Match }) {
  const t = useTranslations("MatchHeader");

  return (
    <div className="min-w-[170px]">
      <SectionLabel>{t("match")}</SectionLabel>
      <div className="mt-1.5 flex items-center gap-2">
          <Avatar name={match.playerOne.username} imageUrl={match.playerOne.avatar_url} size="sm" />
        <span className="text-[11px] font-bold uppercase tracking-[.08em] text-[#3a434f]">
          {t("vs")}
        </span>
        {match.playerTwo ? (
          <Avatar name={match.playerTwo.username} imageUrl={match.playerTwo.avatar_url} size="sm" />
        ) : (
          <span className="grid size-8 shrink-0 place-items-center rounded-[30%] border border-dashed border-white/[.12] text-xs text-[#3a434f]">
            ?
          </span>
        )}
      </div>
      <p className="mt-2 truncate text-[12.5px] text-[#9aa6b6]">
        {match.playerOne.username}
        <span className="px-1.5 text-[#3a434f]">·</span>
        {match.playerTwo?.username ?? t("waiting")}
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
  const t = useTranslations("MatchHeader");

  const tone =
    direction === "up" ? "text-[#1fcb83]" : direction === "down" ? "text-[#f6485d]" : "text-[#9aa6b6]";
  const DirectionIcon =
    direction === "up" ? ArrowUpRight : direction === "down" ? ArrowDownRight : Minus;
  const directionLabel =
    direction === "up" ? t("rising") : direction === "down" ? t("falling") : t("unchanged");
  return (
    <div className="min-w-[190px]">
      <SectionLabel>{symbol}</SectionLabel>
      <div className="mt-1.5 flex items-center gap-2">
        <span className="font-mono text-[28px] font-semibold leading-none tracking-[-.02em] tabular-nums">
          {price === null ? "—" : price.toFixed(2)}
        </span>
        {price !== null && (
          <span className={`flex items-center gap-1 ${tone}`} title={t("priceDirection", { direction: directionLabel })}>
            <DirectionIcon className="size-4" />
          </span>
        )}
      </div>
    </div>
  );
}
function ClockBlock({ remaining }: { remaining: number | null }) {
  const t = useTranslations("MatchHeader");

  const urgent = remaining !== null && remaining <= URGENT_SECONDS;
  return (
    <div className="min-w-[120px]">
      <SectionLabel>{t("timeLeft")}</SectionLabel>
      <p
        className={`mt-1.5 font-mono text-[28px] font-semibold leading-none tracking-[-.02em] tabular-nums ${
          urgent ? "text-[#f6485d]" : "text-[#eef2f8]"
        }`}
      >
        {remaining === null ? "—:——" : fmtClock(remaining)}
      </p>

      {urgent && (
        <p className="mt-1.5 text-[10.5px] font-bold uppercase tracking-[.08em] text-[#f6485d]">
          {t("closing")}
        </p>
      )}
    </div>
  );
}
function CapitalBlock({ player }: { player: PlayerState | null }) {
  const t = useTranslations("MatchHeader");

  return (
    <div className="flex flex-wrap items-start gap-x-7 gap-y-4">
      <div>
        <SectionLabel>{t("yourCapital")}</SectionLabel>
        <p className="mt-1.5 font-mono text-[22px] font-semibold leading-none tracking-[-.02em] tabular-nums">
          {player === null ? "—" : fmtUSD(Math.round(player.capital))}
        </p>
      </div>
      <div>
        <SectionLabel>{t("opponent")}</SectionLabel>
        <p className="mt-1.5 font-mono text-[22px] font-semibold leading-none tracking-[-.02em] tabular-nums text-[#9aa6b6]">
          {player === null ? "—" : fmtUSD(Math.round(player.opponentCapital))}
        </p>
        <div className="mt-2.5">
          <StandingLine player={player} />
        </div>
      </div>
    </div>
  );
}
function StandingLine({ player }: { player: PlayerState | null }) {
  const t = useTranslations("MatchHeader");

  if (player === null) {
    return <p className="text-[11.5px] text-[#5d6877]">{t("connecting")}</p>;
  }
  const gap = player.capital - player.opponentCapital;
  const rounded = Math.round(gap);

  if (rounded === 0) {
    return <p className="text-[11.5px] text-[#9aa6b6]">{t("level")}</p>;
  }

  return (
    <p className={`text-[11.5px] font-semibold ${rounded > 0 ? "text-[#1fcb83]" : "text-[#f6485d]"}`}>
      {rounded > 0 ? `${t("aheadBy")} ` : `${t("behindBy")} `}
      <span className="font-mono tabular-nums">{fmtUSD(Math.abs(rounded))}</span>
    </p>
  );
}
