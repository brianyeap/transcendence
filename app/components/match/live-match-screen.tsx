"use client";

// The live Match — playable, on mock data.
//
// Layout is ticket 14; the panels are tickets 08-12. Everything reads through
// the API seam (lib/api/matches), so when the real backend lands, flipping
// NEXT_PUBLIC_USE_MOCKS=false is the only change this file needs.
//
// The one rule that matters: the SERVER owns balances. availableBalance,
// reservedBalance and realizedPnl are only ever what submitTrade/getMyPlayerState
// returned. Unrealized PnL is the sole number computed here, because it is a
// function of the live price and nothing else — it is display, not truth.

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { SeriesMarker, Time, UTCTimestamp } from "lightweight-charts";
import { Avatar } from "@/app/components/duel/avatar";
import { Icon } from "@/app/components/duel/duel-icon";
import { fmtClock, fmtPrice, fmtSigned, fmtUSD } from "@/app/components/duel/format";
import {
  MOCK_ME,
  getCandles,
  getMyPlayerState,
  getScores,
  submitTrade,
} from "@/lib/api/matches";
import type { Candle, PlayerState, RoomState, Scores, Side } from "@/lib/api/types";
import { MatchChart } from "./match-chart";
import { useMatchClock } from "./use-match-clock";

/** How often the opponent's public score refreshes. */
const SCORE_POLL_MS = 1000;

type FilledTrade = { time: UTCTimestamp; side: Side; amount: number; price: number };
type Feedback = { tone: "ok" | "error"; text: string };

export function LiveMatchScreen({ room }: { room: RoomState }) {
  const [candles, setCandles] = useState<Candle[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [player, setPlayer] = useState<PlayerState | null>(null);
  const [scores, setScores] = useState<Scores | null>(null);
  const [trades, setTrades] = useState<FilledTrade[]>([]);
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const { index, price, remaining, endingSoon } = useMatchClock(
    candles,
    room.startsAt,
    room.endsAt
  );

  const [me, opponent] =
    room.playerOne.userId === MOCK_ME.userId
      ? [room.playerOne, room.playerTwo]
      : [room.playerTwo, room.playerOne];

  useEffect(() => {
    let cancelled = false;

    getCandles(room.id)
      .then((loaded) => {
        if (!cancelled) setCandles(loaded);
      })
      .catch(() => {
        if (!cancelled) setLoadError("Could not load this Match's market data.");
      });

    getMyPlayerState(room.id)
      .then((state) => {
        if (!cancelled) setPlayer(state);
      })
      .catch(() => {
        /* the panel shows its pending state until a trade returns one */
      });

    return () => {
      cancelled = true;
    };
  }, [room.id]);

  useEffect(() => {
    let cancelled = false;

    const poll = () => {
      getScores(room.id)
        .then((next) => {
          if (!cancelled) setScores(next);
        })
        .catch(() => {
          /* a dropped poll is not worth surfacing; the next one recovers */
        });
    };

    poll();
    const id = setInterval(poll, SCORE_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [room.id]);

  const submit = useCallback(
    async (side: Side) => {
      const value = Number(amount);

      if (!Number.isFinite(value) || value <= 0) {
        setFeedback({ tone: "error", text: "Enter an amount greater than zero." });
        return;
      }
      if (player && value > player.availableBalance) {
        setFeedback({
          tone: "error",
          text: `Not enough available balance — you have ${fmtUSD(player.availableBalance)}.`,
        });
        return;
      }

      setSubmitting(true);
      setFeedback(null);

      try {
        const next = await submitTrade(room.id, side, value);
        const filledAt = candles[index]?.openTime as UTCTimestamp | undefined;

        setPlayer(next);
        if (filledAt !== undefined) {
          setTrades((existing) => [...existing, { time: filledAt, side, amount: value, price }]);
        }
        setFeedback({
          tone: "ok",
          text: `${side === "long" ? "Long" : "Short"} ${fmtUSD(value)} filled at ${fmtPrice(price)}.`,
        });
        setAmount("");
      } catch (error) {
        setFeedback({
          tone: "error",
          text: error instanceof Error ? error.message : "Order rejected.",
        });
      } finally {
        setSubmitting(false);
      }
    },
    [amount, candles, index, player, price, room.id]
  );

  const markers = useMemo<SeriesMarker<Time>[]>(
    () =>
      [...trades]
        .sort((a, b) => Number(a.time) - Number(b.time))
        .map((trade) => ({
          time: trade.time,
          position: trade.side === "long" ? "belowBar" : "aboveBar",
          color: trade.side === "long" ? "#1fcb83" : "#f6485d",
          shape: trade.side === "long" ? "arrowUp" : "arrowDown",
          text: `${trade.side === "long" ? "L" : "S"} ${Math.round(trade.amount)}`,
        })),
    [trades]
  );

  const unrealized = unrealizedPnl(player, price);
  const equity = player
    ? player.availableBalance + player.reservedBalance + unrealized
    : null;

  const orderPanel = (inputId: string, className = "") => (
    <OrderPanel
      inputId={inputId}
      className={className}
      amount={amount}
      onAmountChange={setAmount}
      onSubmit={submit}
      submitting={submitting}
      feedback={feedback}
      available={player?.availableBalance ?? null}
    />
  );

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#090b10] text-[#eef2f8]">
      <header className="flex shrink-0 flex-wrap items-center gap-x-5 gap-y-3 border-b border-white/[.07] bg-[#0f131b] px-4 py-3 sm:px-5">
        <Link
          href="/"
          aria-label="Back to Games"
          className="grid size-9 shrink-0 place-items-center rounded-[7px] border border-white/[.07] bg-[#151b25] text-[#9aa6b6] transition hover:border-white/[.12] hover:text-[#eef2f8]"
        >
          <Icon name="chevR" className="size-4 rotate-180" />
        </Link>

        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <Avatar name={me?.username ?? "you"} size="sm" />
          <span className="truncate text-sm font-semibold">{me?.username ?? "you"}</span>
          <span className="rounded bg-[#151b25] px-2 py-0.5 font-mono text-[11px] font-bold text-[#3a434f]">
            VS
          </span>
          <span className="truncate text-sm font-semibold text-[#9aa6b6]">
            {opponent?.username ?? "—"}
          </span>
        </div>

        <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-[#1fcb83]/15 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[.04em] text-[#1fcb83]">
          <span className="size-2 animate-pulse rounded-full bg-[#1fcb83] shadow-[0_0_10px_#1fcb83]" />
          Live
        </span>

        <div className="flex items-center gap-6">
          <Metric label="Symbol" value={room.symbol} />
          <Metric
            label="Price"
            value={price > 0 ? fmtPrice(price) : "—"}
            className="text-[#eef2f8]"
          />
          <Metric
            label={endingSoon ? "Ending soon" : "Time left"}
            value={fmtClock(remaining)}
            className={endingSoon ? "text-[#f6485d]" : undefined}
          />
        </div>
      </header>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-y-auto p-4 lg:flex-row lg:gap-5 lg:overflow-hidden lg:p-5">
        <div className="min-h-[300px] min-w-0 flex-1 overflow-hidden rounded-xl border border-white/[.07] bg-[#0f131b] lg:min-h-0">
          {loadError ? (
            <p className="grid size-full place-items-center px-6 text-center text-sm text-[#ff8c99]">
              {loadError}
            </p>
          ) : candles.length === 0 ? (
            <p className="grid size-full place-items-center text-sm text-[#5d6877]">
              Loading market data…
            </p>
          ) : (
            <MatchChart candles={candles} visibleCount={index} markers={markers} />
          )}
        </div>

        <aside className="flex w-full shrink-0 flex-col gap-4 lg:w-[340px] lg:overflow-y-auto">
          <OpponentPanel
            username={opponent?.username ?? "—"}
            capital={scores?.opponent ?? null}
            mine={scores?.me ?? null}
          />
          <PositionPanel
            player={player}
            unrealized={unrealized}
            equity={equity}
            startingCapital={room.startingCapital}
          />
          {orderPanel("order-amount-desktop", "hidden lg:flex")}
        </aside>
      </div>

      <div className="shrink-0 border-t border-white/[.07] bg-[#0f131b]/95 p-4 backdrop-blur lg:hidden">
        {orderPanel("order-amount-mobile")}
      </div>
    </div>
  );
}

/**
 * Unrealized PnL, per the PRD's formulas. The only number this screen computes:
 * it is a pure function of the live price, so asking the server for it on every
 * tick would be pointless. Realized PnL and balances always come from the server.
 */
function unrealizedPnl(player: PlayerState | null, price: number): number {
  if (!player || player.netSide === "flat" || !player.averageEntryPrice || price <= 0) {
    return 0;
  }
  const entry = player.averageEntryPrice;
  return player.netSide === "long"
    ? player.netAmount * ((price - entry) / entry)
    : player.netAmount * ((entry - price) / entry);
}

function Metric({
  label,
  value,
  className = "",
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className="min-w-16">
      <p className="text-[10.5px] font-bold uppercase tracking-[.04em] text-[#5d6877]">{label}</p>
      <p className={`font-mono text-sm font-bold ${className}`}>{value}</p>
    </div>
  );
}

function OpponentPanel({
  username,
  capital,
  mine,
}: {
  username: string;
  capital: number | null;
  mine: number | null;
}) {
  const lead = capital !== null && mine !== null ? mine - capital : null;

  return (
    <section className="rounded-xl border border-white/[.07] bg-[#0f131b] p-4">
      <p className="mb-3 text-[10.5px] font-bold uppercase tracking-[.04em] text-[#5d6877]">
        Opponent
      </p>
      <div className="flex items-center gap-3">
        <Avatar name={username} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{username}</p>
          <p className="font-mono text-xs text-[#9aa6b6]">
            {capital !== null ? fmtPrice(capital) : "—"}
          </p>
        </div>
        {lead !== null ? (
          <span
            className={`rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[.04em] ${
              lead > 0
                ? "bg-[#1fcb83]/15 text-[#1fcb83]"
                : lead < 0
                  ? "bg-[#f6485d]/15 text-[#ff8c99]"
                  : "bg-[#151b25] text-[#5d6877]"
            }`}
          >
            {lead > 0 ? "Ahead" : lead < 0 ? "Behind" : "Level"}
          </span>
        ) : null}
      </div>
    </section>
  );
}

function PositionPanel({
  player,
  unrealized,
  equity,
  startingCapital,
}: {
  player: PlayerState | null;
  unrealized: number;
  equity: number | null;
  startingCapital: number;
}) {
  const flat = !player || player.netSide === "flat";

  return (
    <section className="rounded-xl border border-white/[.07] bg-[#0f131b] p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[10.5px] font-bold uppercase tracking-[.04em] text-[#5d6877]">
          Your position
        </p>
        {!flat ? (
          <span
            className={`rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[.04em] ${
              player.netSide === "long"
                ? "bg-[#1fcb83]/15 text-[#1fcb83]"
                : "bg-[#f6485d]/15 text-[#ff8c99]"
            }`}
          >
            {player.netSide} {fmtUSD(Math.round(player.netAmount))}
          </span>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Available" value={player ? fmtPrice(player.availableBalance) : "—"} />
        <Field label="Reserved" value={player ? fmtPrice(player.reservedBalance) : "—"} />
        <Field
          label="Entry"
          value={!flat && player.averageEntryPrice ? fmtPrice(player.averageEntryPrice) : "—"}
        />
        <Field
          label="Unrealized"
          value={flat ? "—" : fmtSigned(unrealized)}
          tone={flat ? undefined : unrealized >= 0 ? "up" : "down"}
        />
      </div>

      <div className="mt-3 flex items-baseline justify-between border-t border-white/[.07] pt-3">
        {flat ? (
          <span className="text-xs text-[#5d6877]">No active position</span>
        ) : (
          <span className="text-xs text-[#5d6877]">
            Realized {fmtSigned(player.realizedPnl)}
          </span>
        )}
        <span className="text-right">
          <span className="block text-[10.5px] font-bold uppercase tracking-[.04em] text-[#5d6877]">
            Capital
          </span>
          <span
            className={`font-mono text-sm font-bold ${
              equity === null
                ? ""
                : equity > startingCapital
                  ? "text-[#1fcb83]"
                  : equity < startingCapital
                    ? "text-[#ff8c99]"
                    : ""
            }`}
          >
            {equity !== null ? fmtPrice(equity) : "—"}
          </span>
        </span>
      </div>
    </section>
  );
}

function Field({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "up" | "down";
}) {
  const toneClass = tone === "up" ? "text-[#1fcb83]" : tone === "down" ? "text-[#ff8c99]" : "";
  return (
    <div>
      <p className="mb-1 text-[10.5px] font-bold uppercase tracking-[.04em] text-[#5d6877]">
        {label}
      </p>
      <p className={`font-mono font-semibold ${toneClass}`}>{value}</p>
    </div>
  );
}

function OrderPanel({
  inputId,
  className = "",
  amount,
  onAmountChange,
  onSubmit,
  submitting,
  feedback,
  available,
}: {
  inputId: string;
  className?: string;
  amount: string;
  onAmountChange: (next: string) => void;
  onSubmit: (side: Side) => void;
  submitting: boolean;
  feedback: Feedback | null;
  available: number | null;
}) {
  return (
    <section
      className={`flex flex-col gap-3 rounded-xl border border-white/[.07] bg-[#0f131b] p-4 ${className}`}
    >
      <div className="flex items-center justify-between">
        <label
          htmlFor={inputId}
          className="text-[10.5px] font-bold uppercase tracking-[.04em] text-[#5d6877]"
        >
          Amount (USDT)
        </label>
        {available !== null ? (
          <button
            type="button"
            onClick={() => onAmountChange(String(Math.floor(available)))}
            className="text-[11px] font-semibold text-[#4d86ff] transition hover:brightness-125"
          >
            Max {fmtUSD(Math.floor(available))}
          </button>
        ) : null}
      </div>

      <input
        id={inputId}
        type="text"
        inputMode="decimal"
        value={amount}
        onChange={(event) => onAmountChange(event.target.value)}
        disabled={submitting}
        placeholder="0"
        className="w-full rounded-[7px] border border-white/[.07] bg-[#151b25] px-3 py-2.5 font-mono text-sm text-[#eef2f8] outline-none transition placeholder:text-[#3a434f] focus:border-[#4d86ff]/50 disabled:opacity-60"
      />

      <div className="grid grid-cols-2 gap-2.5">
        <button
          type="button"
          onClick={() => onSubmit("long")}
          disabled={submitting}
          className="h-11 rounded-[7px] bg-[#1fcb83] text-sm font-bold text-[#062016] transition hover:brightness-110 disabled:opacity-50"
        >
          {submitting ? "…" : "Buy Long"}
        </button>
        <button
          type="button"
          onClick={() => onSubmit("short")}
          disabled={submitting}
          className="h-11 rounded-[7px] bg-[#f6485d] text-sm font-bold text-white transition hover:brightness-110 disabled:opacity-50"
        >
          {submitting ? "…" : "Buy Short"}
        </button>
      </div>

      {feedback ? (
        <p
          role="status"
          className={`rounded-[7px] px-3 py-2 text-xs ${
            feedback.tone === "ok"
              ? "border border-[#1fcb83]/25 bg-[#1fcb83]/10 text-[#1fcb83]"
              : "border border-[#f6485d]/30 bg-[#f6485d]/10 text-[#ff8c99]"
          }`}
        >
          {feedback.text}
        </p>
      ) : null}
    </section>
  );
}
