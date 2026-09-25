"use client";

import type React from "react";
import { ArrowLeft, CircleX, Equal, ScrollText, Trophy } from "lucide-react";
import { useTranslations } from "next-intl";
import { ActionLink } from "./message-screen";
import { fmtUSD } from "../../components/duel/format";
import { pnlTone, signedUSD } from "./format";
import type { Match, MatchEnded, PlayerRef } from "@/lib/match/types";

type Outcome = "win" | "loss" | "draw";

export function MatchResultCard({
  result,
  match,
  viewerUserId,
  headingLevel = 2,
}: {
  result: MatchEnded;
  match: Match;
  viewerUserId: string;
  headingLevel?: 1 | 2;
}): React.ReactElement {
  const t = useTranslations("MatchResultCard");

  const outcome: Outcome =
    result.winnerUserId === null ? "draw" : result.winnerUserId === viewerUserId ? "win" : "loss";

  const viewerIsPlayerOne = match.playerOne.userId === viewerUserId;
  const you: PlayerRef = viewerIsPlayerOne
    ? match.playerOne
    : (match.playerTwo ?? { userId: viewerUserId, username: t("you") });
  const opponent: PlayerRef | null = viewerIsPlayerOne ? match.playerTwo : match.playerOne;
  const opponentName = opponent?.username ?? t("opponent");

  return (
    <>
      <OutcomeHeader
        outcome={outcome}
        opponentName={opponentName}
        headingLevel={headingLevel}
      />

      <div className="mt-6 flex flex-col gap-2.5">
        <PlayerResult
          name={you.username}
          isViewer
          isWinner={outcome === "win"}
          isDraw={outcome === "draw"}
          finalCapital={result.yourFinalCapital}
          startingCapital={match.startingCapital}
        />
        <PlayerResult
          name={opponentName}
          isViewer={false}
          isWinner={outcome === "loss"}
          isDraw={outcome === "draw"}
          finalCapital={result.opponentFinalCapital}
          startingCapital={match.startingCapital}
        />
      </div>

      <Settlement
        finalPrice={result.finalPrice}
        symbol={match.symbol}
        startingCapital={match.startingCapital}
      />

      <div className="mt-6 flex flex-col gap-2.5 sm:flex-row">
        <ActionLink href={`/history/${match.id}`} tone="primary">
          <ScrollText className="size-4" />
          {t("viewMatchSummary")}
        </ActionLink>
        <ActionLink href="/" tone="secondary">
          <ArrowLeft className="size-4" />
          {t("backToGames")}
        </ActionLink>
      </div>

      <p className="mt-4 text-center text-[11.5px] text-[#5d6877]">
        {t(`outcome.${outcome}.footnote`)}
      </p>
    </>
  );
}

function OutcomeHeader({
  outcome,
  opponentName,
  headingLevel,
}: {
  outcome: Outcome;
  opponentName: string;
  headingLevel: 1 | 2;
}) {
  const t = useTranslations("MatchResultCard");
  const Icon = outcome === "win" ? Trophy : outcome === "loss" ? CircleX : Equal;
  const Heading = headingLevel === 1 ? "h1" : "h2";

  const tone =
    outcome === "win"
      ? { text: "text-[#1fcb83]", chip: "border-[#1fcb83]/30 bg-[#1fcb83]/10" }
      : outcome === "loss"
        ? { text: "text-[#f6485d]", chip: "border-[#f6485d]/30 bg-[#f6485d]/10" }
        : { text: "text-[#f5a524]", chip: "border-[#f5a524]/30 bg-[#f5a524]/10" };

  return (
    <div className="flex flex-col items-center text-center">
      <span
        className={`inline-flex items-center gap-1.5 rounded-[7px] border px-2.5 py-1 text-[11.5px] font-bold uppercase tracking-[.08em] ${tone.chip} ${tone.text}`}
      >
        <Icon className="size-3.5" />
        {t(`outcome.${outcome}.badge`)}
      </span>
      <Heading className={`mt-3.5 text-[27px] font-bold tracking-[-.02em] ${tone.text}`}>
        {t(`outcome.${outcome}.heading`)}
      </Heading>
      <p className="mt-1.5 text-[13px] text-[#9aa6b6]">
        {t(`outcome.${outcome}.detail`, { opponent: opponentName })}
      </p>
    </div>
  );
}

function PlayerResult({
  name,
  isViewer,
  isWinner,
  isDraw,
  finalCapital,
  startingCapital,
}: {
  name: string;
  isViewer: boolean;
  isWinner: boolean;
  isDraw: boolean;
  finalCapital: number;
  startingCapital: number;
}) {
  const t = useTranslations("MatchResultCard");

  const net = Math.round(finalCapital) - Math.round(startingCapital);
  const percent = startingCapital > 0 ? (net / startingCapital) * 100 : null;

  return (
    <div
      className={`rounded-[7px] border px-4 py-3.5 ${
        isWinner ? "border-[#1fcb83]/30 bg-[#1fcb83]/[.07]" : "border-white/[.07] bg-[#151b25]"
      }`}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <p className="flex items-baseline gap-2 text-[14px] font-semibold text-[#eef2f8]">
          <span className="truncate">{name}</span>
          {isViewer ? (
            <span className="rounded border border-[#4d86ff]/30 px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-[.08em] text-[#4d86ff]">
              {t("you")}
            </span>
          ) : null}
          {isWinner ? (
            <span className="inline-flex items-center gap-1 rounded border border-[#1fcb83]/30 px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-[.08em] text-[#1fcb83]">
              <Trophy className="size-2.5" />
              {t("winner")}
            </span>
          ) : null}
          {isDraw ? (
            <span className="rounded border border-[#f5a524]/30 px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-[.08em] text-[#f5a524]">
              {t("drew")}
            </span>
          ) : null}
        </p>
        <p className="font-mono text-[21px] font-semibold tracking-[-.02em] tabular-nums text-[#eef2f8]">
          {fmtUSD(Math.round(finalCapital))}
        </p>
      </div>

      <div className="mt-1.5 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <p className="text-[11px] font-bold uppercase tracking-[.08em] text-[#3a434f]">
          {t("finalCapital")}
        </p>
        <p className="text-[12px] text-[#9aa6b6]">
          {t("net")}{" "}
          <span className={`font-mono font-semibold tabular-nums ${pnlTone(net)}`}>
            {signedUSD(net)}
          </span>
          {percent === null ? null : (
            <span className={`font-mono tabular-nums ${pnlTone(net)}`}>
              {" "}
              ({signedPercent(percent)})
            </span>
          )}
        </p>
      </div>
    </div>
  );
}

function Settlement({
  finalPrice,
  symbol,
  startingCapital,
}: {
  finalPrice: number | null;
  symbol: string;
  startingCapital: number;
}) {
  const t = useTranslations("MatchResultCard");

  return (
    <div className="mt-5 rounded-[7px] border border-white/[.07] bg-[#151b25] px-4 py-3.5">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-[10.5px] font-bold uppercase tracking-[.08em] text-[#3a434f]">
            {t("settlementPrice")}
          </p>
          <p className="mt-1 font-mono text-[15px] font-semibold tabular-nums text-[#eef2f8]">
            {finalPrice === null ? "—" : finalPrice.toFixed(2)}
          </p>
          <p className="mt-0.5 text-[10.5px] text-[#5d6877]">{symbol}</p>
        </div>
        <div>
          <p className="text-[10.5px] font-bold uppercase tracking-[.08em] text-[#3a434f]">
            {t("startingCapital")}
          </p>
          <p className="mt-1 font-mono text-[15px] font-semibold tabular-nums text-[#eef2f8]">
            {fmtUSD(Math.round(startingCapital))}
          </p>
          <p className="mt-0.5 text-[10.5px] text-[#5d6877]">{t("eachPlayer")}</p>
        </div>
      </div>
      <p className="mt-3 text-[12px] leading-relaxed text-[#9aa6b6]">
        {t("settlementDetail")}
      </p>
    </div>
  );
}

function signedPercent(value: number) {
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  return `${sign}${Math.abs(value).toFixed(2)}%`;
}
