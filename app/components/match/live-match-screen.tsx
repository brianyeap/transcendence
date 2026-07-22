"use client";

// TICKET 14 — the live Match as one screen.
//
// This file owns the LAYOUT and nothing else. Every panel it composes is still a
// placeholder; tickets 08-12 replace them one at a time without touching the
// arrangement settled here:
//
//   desktop  — status/players/timer/price across the top, chart dominating the
//              centre, trade panel down the right
//   mobile   — compact status, chart first, order controls stuck to the bottom
//              within thumb reach, position and opponent as compact cards
//
// The rule each panel inherits: nothing critical (balance, timer, price, or the
// action available next) may sit behind a scroll or a collapsed tab.

import Link from "next/link";
import { Avatar } from "@/app/components/duel/avatar";
import { Icon } from "@/app/components/duel/duel-icon";
import { fmtClock, fmtUSD } from "@/app/components/duel/format";
import type { RoomState } from "@/lib/api/types";
import { Placeholder, Pending } from "./placeholder";

export function LiveMatchScreen({ room }: { room: RoomState }) {
  return (
    <div className="flex min-h-screen flex-col bg-[#090b10] text-[#eef2f8]">
      <MatchTopBar room={room} />

      <div className="flex min-w-0 flex-1 flex-col gap-4 p-4 lg:flex-row lg:gap-5 lg:p-5">
        {/* The chart dominates: it takes every pixel the trade panel doesn't. */}
        <ChartPanel />

        <aside className="flex w-full shrink-0 flex-col gap-4 lg:w-[340px]">
          <OpponentPanel room={room} />
          <PositionPanel room={room} />
          {/* On desktop the order controls live in the rail; on mobile they are
              pinned to the bottom of the viewport instead (below). Only one is
              ever visible, but BOTH are in the DOM — hence the distinct ids, and
              hence ticket 09 must hoist the amount into shared state rather than
              keeping it inside OrderPanel. */}
          <OrderPanel className="hidden lg:flex" inputId="order-amount-desktop" />
        </aside>
      </div>

      <div className="sticky bottom-0 z-30 border-t border-white/[.07] bg-[#0f131b]/95 p-4 backdrop-blur lg:hidden">
        <OrderPanel inputId="order-amount-mobile" />
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- top bar -- */

function MatchTopBar({ room }: { room: RoomState }) {
  return (
    <header className="flex flex-wrap items-center gap-x-5 gap-y-3 border-b border-white/[.07] bg-[#0f131b] px-4 py-3 sm:px-5">
      <Link
        href="/"
        className="grid size-9 shrink-0 place-items-center rounded-[7px] border border-white/[.07] bg-[#151b25] text-[#9aa6b6] transition hover:border-white/[.12] hover:text-[#eef2f8]"
        aria-label="Back to Games"
      >
        <Icon name="chevR" className="size-4 rotate-180" />
      </Link>

      <div className="flex min-w-0 flex-1 items-center gap-2.5">
        <Avatar name={room.playerOne.username} size="sm" />
        <span className="truncate text-sm font-semibold">{room.playerOne.username}</span>
        <span className="rounded bg-[#151b25] px-2 py-0.5 font-mono text-[11px] font-bold text-[#3a434f]">
          VS
        </span>
        <span className="truncate text-sm font-semibold">
          {room.playerTwo?.username ?? "—"}
        </span>
        {room.playerTwo ? <Avatar name={room.playerTwo.username} size="sm" /> : null}
      </div>

      <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-[#1fcb83]/15 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[.04em] text-[#1fcb83]">
        <span className="size-2 animate-pulse rounded-full bg-[#1fcb83] shadow-[0_0_10px_#1fcb83]" />
        Live
      </span>

      <div className="flex items-center gap-6">
        <Metric label="Symbol" value={room.symbol} />
        {/* Ticket 08 replaces both of these with server-driven values. */}
        <Metric label="Time left" value={<Pending />} />
        <Metric label="Price" value={<Pending />} />
      </div>
    </header>
  );
}

function Metric({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-16">
      <p className="text-[10.5px] font-bold uppercase tracking-[.04em] text-[#5d6877]">{label}</p>
      <p className="font-mono text-sm font-bold">{value}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ chart -- */

function ChartPanel() {
  return (
    <Placeholder
      ticket="08 + 12"
      title="Candlestick chart, current price line and your trade markers"
      hint="Ticket 08 installs the charting library and renders the Match's candle series as match time elapses. Ticket 12 adds a marker for each accepted order."
      className="min-h-[320px] min-w-0 flex-1 lg:min-h-0"
    />
  );
}

/* --------------------------------------------------------------- opponent -- */

function OpponentPanel({ room }: { room: RoomState }) {
  const opponent = room.playerTwo?.username ?? "Waiting…";

  return (
    <section className="rounded-xl border border-white/[.07] bg-[#0f131b] p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[10.5px] font-bold uppercase tracking-[.04em] text-[#5d6877]">
          Opponent
        </p>
        <span className="font-mono text-[10.5px] font-bold text-[#3a434f]">11</span>
      </div>
      <div className="flex items-center gap-3">
        <Avatar name={opponent} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{opponent}</p>
          <p className="text-xs text-[#5d6877]">Capital</p>
        </div>
        <Pending className="text-sm font-bold" />
      </div>
    </section>
  );
}

/* --------------------------------------------------------------- position -- */

function PositionPanel({ room }: { room: RoomState }) {
  return (
    <section className="rounded-xl border border-white/[.07] bg-[#0f131b] p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[10.5px] font-bold uppercase tracking-[.04em] text-[#5d6877]">
          Your position
        </p>
        <span className="font-mono text-[10.5px] font-bold text-[#3a434f]">10</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Available" value={<Pending className="text-[13.5px]" />} />
        <Field label="Reserved" value={<Pending className="text-[13.5px]" />} />
        <Field label="Entry" value={<Pending className="text-[13.5px]" />} />
        <Field label="Unrealized PnL" value={<Pending className="text-[13.5px]" />} />
      </div>

      <p className="mt-3 border-t border-white/[.07] pt-3 text-xs text-[#5d6877]">
        No active position · started with {fmtUSD(room.startingCapital)} over{" "}
        {fmtClock(room.durationSeconds)}
      </p>
    </section>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1 text-[10.5px] font-bold uppercase tracking-[.04em] text-[#5d6877]">
        {label}
      </p>
      <p className="font-mono font-semibold">{value}</p>
    </div>
  );
}

/* --------------------------------------------------------------- ordering -- */

/**
 * Disabled on purpose. Ticket 09 wires the amount and the two actions to the API
 * seam; until then the controls prove the layout without pretending to trade.
 */
function OrderPanel({
  className = "",
  inputId,
}: {
  className?: string;
  inputId: string;
}) {
  return (
    <section
      className={`flex flex-col gap-3 rounded-xl border border-white/[.07] bg-[#0f131b] p-4 ${className}`}
    >
      <div className="flex items-center justify-between">
        <p className="text-[10.5px] font-bold uppercase tracking-[.04em] text-[#5d6877]">
          Market order
        </p>
        <span className="font-mono text-[10.5px] font-bold text-[#3a434f]">09</span>
      </div>

      <label className="sr-only" htmlFor={inputId}>
        Amount in USDT
      </label>
      <input
        id={inputId}
        type="text"
        inputMode="decimal"
        disabled
        placeholder="Amount (USDT)"
        className="w-full rounded-[7px] border border-white/[.07] bg-[#151b25] px-3 py-2.5 font-mono text-sm text-[#eef2f8] placeholder:text-[#3a434f] disabled:opacity-60"
      />

      <div className="grid grid-cols-2 gap-2.5">
        <button
          disabled
          className="h-11 rounded-[7px] bg-[#1fcb83] text-sm font-bold text-[#062016] transition hover:brightness-110 disabled:opacity-50"
        >
          Buy Long
        </button>
        <button
          disabled
          className="h-11 rounded-[7px] bg-[#f6485d] text-sm font-bold text-white transition hover:brightness-110 disabled:opacity-50"
        >
          Buy Short
        </button>
      </div>
    </section>
  );
}
