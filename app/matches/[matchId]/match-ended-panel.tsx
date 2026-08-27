"use client";

import { ArrowLeft, CircleX, Equal, ScrollText, Trophy } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { fmtUSD } from "../../components/duel/format";
import type { Match, MatchEnded, PlayerRef } from "@/lib/match/types";

type Outcome = "win" | "loss" | "draw";

const FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function MatchEndedPanel({
  ended,
  match,
  viewerUserId,
}: {
  ended: MatchEnded;
  match: Match;
  viewerUserId: string;
}): React.ReactElement {
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const card = cardRef.current;
    if (card === null) return;

    card.focus();

    function trapTab(event: KeyboardEvent) {
      if (event.key !== "Tab" || card === null) return;

      const stops = [...card.querySelectorAll<HTMLElement>(FOCUSABLE)];
      const first = stops[0];
      const last = stops[stops.length - 1];
      const active = document.activeElement;

      if (first === undefined || last === undefined) {
        event.preventDefault();
        card.focus();
        return;
      }

      if (event.shiftKey && (active === first || active === card || !card.contains(active))) {
        event.preventDefault();
        last.focus();
        return;
      }

      if (!event.shiftKey && (active === last || !card.contains(active))) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", trapTab);
    return () => document.removeEventListener("keydown", trapTab);
  }, []);

  const outcome: Outcome =
    ended.winnerUserId === null ? "draw" : ended.winnerUserId === viewerUserId ? "win" : "loss";

  const viewerIsPlayerOne = match.playerOne.userId === viewerUserId;
  const you: PlayerRef = viewerIsPlayerOne
    ? match.playerOne
    : (match.playerTwo ?? { userId: viewerUserId, username: "You" });
  const opponent: PlayerRef | null = viewerIsPlayerOne ? match.playerTwo : match.playerOne;
  const opponentName = opponent?.username ?? "Your opponent";

  const copy = OUTCOME_COPY[outcome];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="match-ended-heading"
        aria-describedby="match-ended-detail"
        tabIndex={-1}
        className="max-h-full w-full max-w-lg overflow-y-auto rounded-xl border border-white/[.07] bg-[#0f131b] p-6 shadow-2xl outline-none sm:p-7"
      >
        <OutcomeHeader outcome={outcome} opponentName={opponentName} />

        <div className="mt-6 flex flex-col gap-2.5">
          <PlayerResult
            name={you.username}
            isViewer
            isWinner={outcome === "win"}
            isDraw={outcome === "draw"}
            finalCapital={ended.yourFinalCapital}
            startingCapital={match.startingCapital}
          />
          <PlayerResult
            name={opponentName}
            isViewer={false}
            isWinner={outcome === "loss"}
            isDraw={outcome === "draw"}
            finalCapital={ended.opponentFinalCapital}
            startingCapital={match.startingCapital}
          />
        </div>

        <Settlement
          finalPrice={ended.finalPrice}
          symbol={match.symbol}
          startingCapital={match.startingCapital}
        />

        <div className="mt-6 flex flex-col gap-2.5 sm:flex-row">
          <Link
            href={`/history/${match.id}`}
            className="flex flex-1 items-center justify-center gap-2 rounded-[7px] bg-[#4d86ff] px-4 py-2.5 text-[13.5px] font-semibold text-white transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4d86ff]"
          >
            <ScrollText className="size-4" aria-hidden />
            View match summary
          </Link>
          <Link
            href="/"
            className="flex flex-1 items-center justify-center gap-2 rounded-[7px] border border-white/[.1] bg-gray-800 px-4 py-2.5 text-[13.5px] font-semibold text-[#eef2f8] transition hover:bg-gray-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4d86ff]"
          >
            <ArrowLeft className="size-4" aria-hidden />
            Back to games
          </Link>
        </div>

        <p className="mt-4 text-center text-[11.5px] text-[#5d6877]">{copy.footnote}</p>
      </div>
    </div>
  );
}

const OUTCOME_COPY: Record<
  Outcome,
  { badge: string; heading: string; detail: (opponent: string) => string; footnote: string }
> = {
  win: {
    badge: "You won",
    heading: "Victory",
    detail: (opponent) => `You finished with more capital than ${opponent}.`,
    footnote: "The match is over. No further trades can be placed.",
  },
  loss: {
    badge: "You lost",
    heading: "Defeat",
    detail: (opponent) => `${opponent} finished with more capital than you.`,
    footnote: "The match is over. No further trades can be placed.",
  },
  draw: {
    badge: "Nobody won",
    heading: "Draw",
    detail: (opponent) => `You and ${opponent} finished on exactly the same capital.`,
    footnote: "The match is over. No further trades can be placed.",
  },
};

function OutcomeHeader({ outcome, opponentName }: { outcome: Outcome; opponentName: string }) {
  const copy = OUTCOME_COPY[outcome];
  const Icon = outcome === "win" ? Trophy : outcome === "loss" ? CircleX : Equal;

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
        <Icon className="size-3.5" aria-hidden />
        {copy.badge}
      </span>
      <h2
        id="match-ended-heading"
        className={`mt-3.5 text-[27px] font-bold tracking-[-.02em] ${tone.text}`}
      >
        {copy.heading}
      </h2>
      <p id="match-ended-detail" className="mt-1.5 text-[13px] text-[#9aa6b6]">
        {copy.detail(opponentName)}
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
              You
            </span>
          ) : null}
          {isWinner ? (
            <span className="inline-flex items-center gap-1 rounded border border-[#1fcb83]/30 px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-[.08em] text-[#1fcb83]">
              <Trophy className="size-2.5" aria-hidden />
              Winner
            </span>
          ) : null}
          {isDraw ? (
            <span className="rounded border border-[#f5a524]/30 px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-[.08em] text-[#f5a524]">
              Drew
            </span>
          ) : null}
        </p>
        <p className="font-mono text-[21px] font-semibold tracking-[-.02em] tabular-nums text-[#eef2f8]">
          {fmtUSD(Math.round(finalCapital))}
        </p>
      </div>

      <div className="mt-1.5 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <p className="text-[11px] font-bold uppercase tracking-[.08em] text-[#3a434f]">
          Final capital
        </p>
        <p className="text-[12px] text-[#9aa6b6]">
          <span aria-hidden="true">
            Net{" "}
            <span className={`font-mono font-semibold tabular-nums ${pnlTone(net)}`}>
              {signedUSD(net)}
            </span>
            {percent === null ? null : (
              <span className={`font-mono tabular-nums ${pnlTone(net)}`}>
                {" "}
                ({signedPercent(percent)})
              </span>
            )}
          </span>
          <span className="sr-only">{netSpeech(net, percent)}</span>
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
  finalPrice: number;
  symbol: string;
  startingCapital: number;
}) {
  return (
    <div className="mt-5 rounded-[7px] border border-white/[.07] bg-[#151b25] px-4 py-3.5">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-[10.5px] font-bold uppercase tracking-[.08em] text-[#3a434f]">
            Settlement price
          </p>
          <p className="mt-1 font-mono text-[15px] font-semibold tabular-nums text-[#eef2f8]">
            <span aria-hidden="true">{finalPrice.toFixed(2)}</span>
            <span className="sr-only">{spokenPrice(finalPrice)}</span>
          </p>
          <p className="mt-0.5 text-[10.5px] text-[#5d6877]">{symbol}</p>
        </div>
        <div>
          <p className="text-[10.5px] font-bold uppercase tracking-[.08em] text-[#3a434f]">
            Starting capital
          </p>
          <p className="mt-1 font-mono text-[15px] font-semibold tabular-nums text-[#eef2f8]">
            {fmtUSD(Math.round(startingCapital))}
          </p>
          <p className="mt-0.5 text-[10.5px] text-[#5d6877]">Each player</p>
        </div>
      </div>
      <p className="mt-3 text-[12px] leading-relaxed text-[#9aa6b6]">
        Any exposure still held when time ran out was offset automatically at{" "}
        <span className="font-mono tabular-nums text-[#eef2f8]">
          <span aria-hidden="true">{finalPrice.toFixed(2)}</span>
          <span className="sr-only">{spokenPrice(finalPrice)}</span>
        </span>
        , so every figure above is banked — nothing is still riding on the market.
      </p>
    </div>
  );
}

function spokenPrice(value: number) {
  return value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function pnlTone(value: number) {
  if (value > 0) return "text-[#1fcb83]";
  if (value < 0) return "text-[#f6485d]";
  return "text-[#9aa6b6]";
}

function signedUSD(value: number) {
  const rounded = Math.round(value);
  const sign = rounded > 0 ? "+" : rounded < 0 ? "−" : "";
  return `${sign}${fmtUSD(Math.abs(rounded))}`;
}

function signedPercent(value: number) {
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  return `${sign}${Math.abs(value).toFixed(2)}%`;
}

function netSpeech(net: number, percent: number | null) {
  const share =
    percent === null ? "" : `, ${Math.abs(percent).toFixed(2)} percent of the starting capital`;
  if (net === 0) return "Net: level with the starting capital.";
  return net > 0
    ? `Net: up ${fmtUSD(net)}${share}.`
    : `Net: down ${fmtUSD(Math.abs(net))}${share}.`;
}
