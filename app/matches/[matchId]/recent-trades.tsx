"use client";

import { useEffect, useState } from "react";
import { ArrowDownRight, ArrowUpRight, Receipt } from "lucide-react";

import { fmtUSD } from "../../components/duel/format";
import { fmtPrice, pnlTone, signedUSD } from "./format";
import type { TradeFill } from "@/lib/match/types";

const VISIBLE_ROWS = 6;

export function RecentTrades({ trades }: { trades: TradeFill[] }): React.ReactElement {
  const newestFirst = [...trades].reverse();

  return (
    <section
      aria-labelledby="recent-trades-heading"
      className="rounded-xl border border-white/[.07] bg-[#0f131b] p-5"
    >
      <div className="flex items-center justify-between gap-3">
        <p
          id="recent-trades-heading"
          className="text-[10.5px] font-bold uppercase tracking-[.08em] text-[#3a434f]"
        >
          Recent trades
        </p>
        {trades.length > 0 ? (
          <span className="font-mono text-[11.5px] tabular-nums text-[#5d6877]">
            <span aria-hidden="true">{trades.length}</span>
            <span className="sr-only">
              {trades.length} trade{trades.length === 1 ? "" : "s"} so far
            </span>
          </span>
        ) : null}
      </div>

      {newestFirst.length === 0 ? (
        <EmptyState />
      ) : (
        <ul
          className="mt-3.5 flex flex-col gap-1.5 overflow-y-auto pr-1"
          style={{ maxHeight: `${VISIBLE_ROWS * 53}px` }}
        >
          {newestFirst.map((trade) => (
            <TradeRow key={trade.id} trade={trade} />
          ))}
        </ul>
      )}
    </section>
  );
}

function EmptyState() {
  return (
    <div className="mt-3.5 rounded-[7px] border border-dashed border-white/[.07] bg-[#151b25] px-4 py-5 text-center">
      <Receipt className="mx-auto size-4.5 text-[#3a434f]" aria-hidden />
      <p className="mt-2 text-[12.5px] font-semibold text-[#eef2f8]">No trades yet</p>
      <p className="mt-1 text-[11.5px] text-[#9aa6b6]">
        Your fills will appear here and on the chart.
      </p>
    </div>
  );
}

function TradeRow({ trade }: { trade: TradeFill }) {
  const long = trade.side === "long";
  const DirectionIcon = long ? ArrowUpRight : ArrowDownRight;
  const sideTone = long ? "text-[#1fcb83]" : "text-[#f6485d]";
  const sideBg = long
    ? "border-[#1fcb83]/30 bg-[#1fcb83]/10"
    : "border-[#f6485d]/30 bg-[#f6485d]/10";

  return (
    <li className="rounded-[7px] border border-white/[.07] bg-[#151b25] px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        <span
          className={`inline-flex items-center gap-1 rounded-[5px] border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[.08em] ${sideBg} ${sideTone}`}
        >
          <DirectionIcon className="size-3" aria-hidden />
          {long ? "Long" : "Short"}
        </span>
        <Elapsed executedAt={trade.executedAt} />
      </div>

      <div className="mt-1.5 flex items-baseline justify-between gap-2">
        <span className="font-mono text-[12.5px] font-semibold tabular-nums text-[#eef2f8]">
          <span aria-hidden="true">
            {fmtUSD(Math.round(trade.amount))}
            <span className="ml-1.5 font-normal text-[#9aa6b6]">
              @ {trade.fillPrice.toFixed(2)}
            </span>
          </span>
          <span className="sr-only">
            {fmtUSD(Math.round(trade.amount))} filled at {fmtPrice(trade.fillPrice)}.
          </span>
        </span>

        {trade.realisedPnl === null ? null : (
          <span
            className={`shrink-0 font-mono text-[12.5px] font-semibold tabular-nums ${pnlTone(
              trade.realisedPnl
            )}`}
          >
            <span aria-hidden="true">{signedUSD(trade.realisedPnl)}</span>
            <span className="sr-only">{realisedSpeech(trade.realisedPnl)}</span>
          </span>
        )}
      </div>
    </li>
  );
}

function Elapsed({ executedAt }: { executedAt: number }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 10_000);
    return () => clearInterval(id);
  }, []);

  return (
    <time
      dateTime={new Date(executedAt).toISOString()}
      className="shrink-0 font-mono text-[10.5px] tabular-nums text-[#5d6877]"
    >
      <span aria-hidden="true">{elapsedLabel(now - executedAt)}</span>
      <span className="sr-only">{spokenElapsed(now - executedAt)}</span>
    </time>
  );
}

function spokenElapsed(elapsedMs: number) {
  const seconds = Math.max(0, Math.floor(elapsedMs / 1000));
  if (seconds < 10) return "just now";
  if (seconds < 60) return `${seconds} seconds ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours} hour${hours === 1 ? "" : "s"} ago`;
}

function elapsedLabel(elapsedMs: number) {
  const seconds = Math.max(0, Math.floor(elapsedMs / 1000));
  if (seconds < 10) return "now";
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  return `${Math.floor(minutes / 60)}h`;
}

function realisedSpeech(value: number) {
  const rounded = Math.round(value);
  if (rounded === 0) return "This trade offset exposure and realised nothing.";
  return rounded > 0
    ? `This trade offset exposure and realised a profit of ${fmtUSD(rounded)}.`
    : `This trade offset exposure and realised a loss of ${fmtUSD(Math.abs(rounded))}.`;
}
