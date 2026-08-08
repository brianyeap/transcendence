"use client";

import { ArrowDownRight, ArrowUpRight, CircleSlash2 } from "lucide-react";
import { fmtUSD } from "../../components/duel/format";
import type { PlayerState } from "@/lib/match/types";

export function PositionPanel({
  player,
  price,
}: {
  player: PlayerState | null;
  price: number | null;
}) {
  return (
    <section
      aria-labelledby="exposure-heading"
      className="rounded-xl border border-white/[.07] bg-[#0f131b] p-5"
    >
      <div className="flex items-center justify-between gap-3">
        <SectionLabel id="exposure-heading">Exposure</SectionLabel>
        <span className="font-mono text-[11.5px] tabular-nums text-[#5d6877]">
          <span aria-hidden="true">{price === null ? "—" : `Mark ${price.toFixed(2)}`}</span>
          <span className="sr-only">
            {price === null
              ? "Mark price is not available yet."
              : `Valued against a mark price of ${spokenPrice(price)}.`}
          </span>
        </span>
      </div>

      {player === null ? (
        <Connecting />
      ) : player.netSide === "flat" ? (
        <FlatState player={player} />
      ) : (
        <ExposureState player={player} />
      )}
    </section>
  );
}

function Connecting() {
  return (
    <p className="mt-5 flex items-center gap-2.5 text-[13px] text-[#5d6877]">
      <span className="size-2 animate-pulse rounded-full bg-[#4d86ff]" />
      Loading your position…
    </p>
  );
}

function FlatState({ player }: { player: PlayerState }) {
  return (
    <div className="mt-4 rounded-[7px] border border-dashed border-white/[.07] bg-[#151b25] px-4 py-6 text-center">
      <CircleSlash2 className="mx-auto size-5 text-[#3a434f]" aria-hidden />
      <p className="mt-2.5 text-[13.5px] font-semibold text-[#eef2f8]">No exposure held</p>
      <p className="mt-1 text-[12.5px] text-[#9aa6b6]">
        Bet on a rise or a fall to take a position.
      </p>
      <p className="mt-3.5 text-[10.5px] font-bold uppercase tracking-[.08em] text-[#3a434f]">
        Available balance
      </p>
      <p className="mt-1 font-mono text-[19px] font-semibold tracking-[-.02em] tabular-nums">
        <span aria-hidden="true">{fmtUSD(Math.round(player.availableBalance))}</span>
        <span className="sr-only">
          Available balance {fmtUSD(Math.round(player.availableBalance))}.
        </span>
      </p>
      <RealisedRow realisedPnl={player.realisedPnl} className="mt-4" />
    </div>
  );
}

function ExposureState({ player }: { player: PlayerState }) {
  const long = player.netSide === "long";
  const DirectionIcon = long ? ArrowUpRight : ArrowDownRight;
  const sideTone = long ? "text-[#1fcb83]" : "text-[#f6485d]";
  const sideBg = long
    ? "border-[#1fcb83]/30 bg-[#1fcb83]/10"
    : "border-[#f6485d]/30 bg-[#f6485d]/10";

  return (
    <div className="mt-4 flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span
          className={`inline-flex items-center gap-1.5 rounded-[7px] border px-2.5 py-1 text-[11.5px] font-bold uppercase tracking-[.08em] ${sideBg} ${sideTone}`}
        >
          <DirectionIcon className="size-3.5" aria-hidden />
          <span aria-hidden="true">{long ? "Long" : "Short"}</span>
          <span className="sr-only">
            {long ? "Holding long — a bet the price rises." : "Holding short — a bet the price falls."}
          </span>
        </span>
        <span className="font-mono text-[19px] font-semibold tracking-[-.02em] tabular-nums">
          <span aria-hidden="true">{fmtUSD(Math.round(player.netAmount))}</span>
          <span className="sr-only">Exposure amount {fmtUSD(Math.round(player.netAmount))}.</span>
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <Figure
          label="Entry price"
          speech={
            player.entryPrice === null
              ? "Entry price: none."
              : `Entry price ${spokenPrice(player.entryPrice)}.`
          }
        >
          {player.entryPrice === null ? "—" : player.entryPrice.toFixed(2)}
        </Figure>
        <Figure
          label="Reserved balance"
          speech={`Reserved balance ${fmtUSD(Math.round(player.reservedBalance))}.`}
        >
          {fmtUSD(Math.round(player.reservedBalance))}
        </Figure>
      </div>

      <UnrealisedBlock unrealisedPnl={player.unrealisedPnl} />

      <div className="grid grid-cols-2 gap-2.5">
        <Figure
          label="Available balance"
          speech={`Available balance ${fmtUSD(Math.round(player.availableBalance))}.`}
        >
          {fmtUSD(Math.round(player.availableBalance))}
        </Figure>
        <Figure
          label="Realised PnL"
          tone={pnlTone(player.realisedPnl)}
          speech={pnlSpeech(player.realisedPnl, "Realised")}
        >
          {signedUSD(player.realisedPnl)}
        </Figure>
      </div>
    </div>
  );
}

function UnrealisedBlock({ unrealisedPnl }: { unrealisedPnl: number }) {
  const rounded = Math.round(unrealisedPnl);
  const tone = pnlTone(unrealisedPnl);

  return (
    <div className="rounded-[7px] border border-white/[.07] bg-[#151b25] px-4 py-3.5">
      <div className="flex items-baseline justify-between gap-3">
        <SectionLabel>Unrealised PnL</SectionLabel>
        <span className={`font-mono text-[22px] font-semibold tracking-[-.02em] tabular-nums ${tone}`}>
          <span aria-hidden="true">{signedUSD(rounded)}</span>
          <span className="sr-only">{pnlSpeech(rounded, "Unrealised")}</span>
        </span>
      </div>
      <p className="mt-1.5 text-[11.5px] text-[#5d6877]">
        {rounded === 0
          ? "Level at the current mark."
          : rounded > 0
            ? "Profit if offset at the current mark."
            : "Loss if offset at the current mark."}
      </p>
    </div>
  );
}

function RealisedRow({ realisedPnl, className = "" }: { realisedPnl: number; className?: string }) {
  return (
    <p className={`text-[11.5px] text-[#5d6877] ${className}`}>
      <span aria-hidden="true">
        Realised PnL{" "}
        <span className={`font-mono font-semibold tabular-nums ${pnlTone(realisedPnl)}`}>
          {signedUSD(realisedPnl)}
        </span>
      </span>
      <span className="sr-only">{pnlSpeech(realisedPnl, "Realised")}</span>
    </p>
  );
}

function Figure({
  label,
  tone = "text-[#eef2f8]",
  speech,
  children,
}: {
  label: string;
  tone?: string;
  speech?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[7px] border border-white/[.07] bg-[#151b25] px-3 py-2.5">
      <p
        aria-hidden={speech === undefined ? undefined : true}
        className="text-[10.5px] font-bold uppercase tracking-[.08em] text-[#3a434f]"
      >
        {label}
      </p>
      <p className={`mt-1 font-mono text-[14.5px] font-semibold tabular-nums ${tone}`}>
        {speech === undefined ? (
          children
        ) : (
          <>
            <span aria-hidden="true">{children}</span>
            <span className="sr-only">{speech}</span>
          </>
        )}
      </p>
    </div>
  );
}

function SectionLabel({ id, children }: { id?: string; children: React.ReactNode }) {
  return (
    <p id={id} className="text-[10.5px] font-bold uppercase tracking-[.08em] text-[#3a434f]">
      {children}
    </p>
  );
}

function pnlTone(value: number) {
  const rounded = Math.round(value);
  if (rounded > 0) return "text-[#1fcb83]";
  if (rounded < 0) return "text-[#f6485d]";
  return "text-[#9aa6b6]";
}

function signedUSD(value: number) {
  const rounded = Math.round(value);
  const sign = rounded > 0 ? "+" : rounded < 0 ? "−" : "";
  return `${sign}${fmtUSD(Math.abs(rounded))}`;
}

function pnlSpeech(value: number, noun: string) {
  const rounded = Math.round(value);
  if (rounded === 0) return `${noun}: level, nothing gained or lost.`;
  return rounded > 0
    ? `${noun}: profit of ${fmtUSD(rounded)}.`
    : `${noun}: loss of ${fmtUSD(Math.abs(rounded))}.`;
}

function spokenPrice(value: number) {
  return value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
