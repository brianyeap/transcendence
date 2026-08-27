"use client";

import { ArrowDown, ArrowUp } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { PlayerState, Side, TradeFill, TradeRejection } from "@/lib/match/types";
import { fmtUSD } from "../../components/duel/format";

const PRESETS = [0.25, 0.5, 0.75, 1] as const;

const FEEDBACK_MS = 5000;

export function OrderPanel({
  player,
  pendingTrade,
  lastFill,
  lastRejection,
  disabled,
  onSubmit,
  onDismissFeedback,
}: {
  player: PlayerState | null;
  pendingTrade: boolean;
  lastFill: TradeFill | null;
  lastRejection: TradeRejection | null;
  disabled: boolean;
  onSubmit: (input: { side: Side; amount: number }) => void;
  onDismissFeedback: () => void;
}): React.ReactElement {
  const [raw, setRaw] = useState("");

  const [pendingSide, setPendingSide] = useState<Side | null>(null);

  const [seen, setSeen] = useState({ pendingTrade, fill: lastFill, rejection: lastRejection });
  if (
    seen.pendingTrade !== pendingTrade ||
    seen.fill !== lastFill ||
    seen.rejection !== lastRejection
  ) {
    const answered =
      (seen.pendingTrade && !pendingTrade) ||
      (lastFill !== null && lastFill !== seen.fill) ||
      (lastRejection !== null && lastRejection !== seen.rejection);
    setSeen({ pendingTrade, fill: lastFill, rejection: lastRejection });
    if (answered) setPendingSide(null);
  }

  const dismissRef = useRef(onDismissFeedback);
  useEffect(() => {
    dismissRef.current = onDismissFeedback;
  }, [onDismissFeedback]);
  useEffect(() => {
    if (lastFill === null && lastRejection === null) return;
    const timer = setTimeout(() => dismissRef.current(), FEEDBACK_MS);
    return () => clearTimeout(timer);
  }, [lastFill, lastRejection]);

  const available = player?.availableBalance ?? 0;
  const busy = pendingTrade || pendingSide !== null;
  const locked = disabled || busy || player === null;

  const amount = parseAmount(raw);
  const error = validate(raw, amount, player);
  const canSubmit = !locked && amount !== null && error === null;

  const canSubmitSide = (side: Side) =>
    canSubmit && amount !== null && amount <= maxForSide(player, side);

  const lockedReason = disabled
    ? "Trading is unavailable — the match is not live, or the connection has dropped."
    : busy
      ? "A trade is already in flight. The controls unlock when the server answers."
      : player === null
        ? "Connecting to the match. The controls unlock when your balances arrive."
        : null;

  const unspokenReason =
    lockedReason ?? (error === null && amount === null ? "Enter an amount to bet." : null);

  const betReasonId = canSubmit
    ? undefined
    : unspokenReason !== null
      ? "order-controls-reason"
      : error !== null
        ? "order-amount-error"
        : undefined;

  const inputDescribedBy =
    [
      error === null ? null : "order-amount-error",
      lockedReason === null ? null : "order-controls-reason",
    ]
      .filter((id) => id !== null)
      .join(" ") || undefined;

  function applyPreset(fraction: number) {
    if (player === null) return;

    setRaw(String(Math.floor(available * fraction * 100) / 100));
  }

  function submit(side: Side) {
    if (!canSubmitSide(side) || amount === null) return;
    setPendingSide(side);
    onSubmit({ side, amount });
  }

  return (
    <section
      aria-labelledby="order-panel-heading"
      className="rounded-xl border border-white/[.07] bg-[#0f131b] p-4"
    >
      <div className="flex items-baseline justify-between gap-3">
        <h2
          id="order-panel-heading"
          className="text-[13px] font-semibold tracking-[-.01em] text-[#eef2f8]"
        >
          Place a Trade
        </h2>
        <p className="text-[11px] text-[#5d6877]">
          <span aria-hidden="true">
            Available{" "}
            <span className="font-mono font-semibold text-[#9aa6b6]">
              {player === null ? "—" : fmtUSD(Math.floor(available))}
            </span>
          </span>
          <span className="sr-only">
            {player === null
              ? "Available balance not known yet."
              : `Available balance ${fmtUSD(Math.floor(available))}.`}
          </span>
        </p>
      </div>

      <ExposureHint player={player} />

      <label
        htmlFor="order-amount"
        className="mt-3 mb-1.5 block text-[10.5px] font-bold uppercase tracking-[.04em] text-[#5d6877]"
      >
        Amount<span className="sr-only"> to bet, in US dollars</span>
      </label>
      <div className="relative">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-3 flex items-center font-mono text-[13px] text-[#5d6877]"
        >
          $
        </span>
        <input
          id="order-amount"
          name="order-amount"
          type="text"
          inputMode="decimal"
          autoComplete="off"
          placeholder="0"
          value={raw}
          disabled={locked}
          onChange={(e) => setRaw(sanitise(e.target.value))}
          aria-invalid={error !== null}
          aria-describedby={inputDescribedBy}
          className="h-10 w-full rounded-[7px] border border-white/[.07] bg-[#151b25] pr-3 pl-7 font-mono text-[14px] text-[#eef2f8] transition placeholder:text-[#3a434f] hover:border-white/[.12] focus:border-[#4d86ff]/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4d86ff] disabled:opacity-50"
        />
      </div>

      <div className="mt-2 grid grid-cols-4 gap-2">
        {PRESETS.map((fraction) => (
          <button
            key={fraction}
            type="button"
            disabled={locked}
            onClick={() => applyPreset(fraction)}

            aria-label={presetLabel(fraction)}
            aria-describedby={lockedReason === null ? undefined : "order-controls-reason"}
            className="h-8 rounded-[7px] border border-white/[.07] bg-[#151b25] font-mono text-[11.5px] font-semibold text-[#9aa6b6] transition hover:border-white/[.12] hover:text-[#eef2f8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4d86ff] disabled:opacity-50"
          >
            {fraction * 100}%
          </button>
        ))}
      </div>

      {error !== null && (
        <p id="order-amount-error" className="mt-2 text-[11.5px] text-[#ff8c99]">
          {error}
        </p>
      )}

      {unspokenReason !== null && (
        <p id="order-controls-reason" className="sr-only">
          {unspokenReason}
        </p>
      )}

      <div className="mt-3 flex items-stretch gap-3">
        <BetButton
          side="long"
          disabled={!canSubmitSide("long")}
          pending={pendingSide === "long"}
          describedBy={betReasonId}
          onClick={() => submit("long")}
        />
        <div aria-hidden="true" className="w-px self-stretch bg-white/[.07]" />
        <BetButton
          side="short"
          disabled={!canSubmitSide("short")}
          pending={pendingSide === "short"}
          describedBy={betReasonId}
          onClick={() => submit("short")}
        />
      </div>

      <Feedback
        fill={lastFill}
        rejection={lastRejection}
        hidden={busy}
        disabled={disabled}
        connecting={player === null}
      />

      <OrderAnnouncements fill={lastFill} rejection={lastRejection} busy={busy} />
    </section>
  );
}

function OrderAnnouncements({
  fill,
  rejection,
  busy,
}: {
  fill: TradeFill | null;
  rejection: TradeRejection | null;
  busy: boolean;
}) {
  const polite = busy ? "Placing your trade. Waiting for the server to fill it." : fillSpeech(fill);

  return (
    <>
      <p role="status" aria-live="polite" className="sr-only">
        {polite}
      </p>
      <p role="alert" className="sr-only">
        {rejection === null
          ? ""
          : `Trade rejected. ${rejection.reason} Your exposure is unchanged.`}
      </p>
    </>
  );
}

function fillSpeech(fill: TradeFill | null): string {
  if (fill === null) return "";

  const side = fill.side === "long" ? "Long" : "Short";
  const exposure =
    fill.resultingNetSide === "flat"
      ? "Your exposure is now flat."
      : `Your exposure is now ${fill.resultingNetSide} ${fmtUSD(
          Math.round(fill.resultingNetAmount)
        )}.`;

  const realised =
    fill.realisedPnl === null
      ? ""
      : Math.round(fill.realisedPnl) === 0
        ? " The offset realised nothing."
        : Math.round(fill.realisedPnl) > 0
          ? ` The offset realised a profit of ${fmtUSD(Math.round(fill.realisedPnl))}.`
          : ` The offset realised a loss of ${fmtUSD(Math.abs(Math.round(fill.realisedPnl)))}.`;

  return `Trade accepted. ${side} ${fmtUSD(Math.round(fill.amount))} filled at ${fmtPrice(
    fill.fillPrice
  )}. ${exposure}${realised}`;
}

function presetLabel(fraction: number): string {
  return fraction === 1
    ? "Set the amount to your full available balance"
    : `Set the amount to ${fraction * 100}% of your available balance`;
}

function ExposureHint({ player }: { player: PlayerState | null }) {
  if (player === null || player.netSide === "flat") return null;

  const held = player.netSide === "long" ? "Long" : "Short";
  const opposite = player.netSide === "long" ? "Short" : "Long";
  const tone = player.netSide === "long" ? "text-[#1fcb83]" : "text-[#f6485d]";

  return (
    <div className="mt-3 rounded-[7px] border border-white/[.07] bg-[#151b25] px-3 py-2">
      <p className="text-[11px] text-[#9aa6b6]">
        <span className="text-[#5d6877]">Exposure</span>{" "}
        <span className={`font-semibold ${tone}`}>{held}</span>{" "}
        <span className="font-mono font-semibold text-[#eef2f8]">
          {fmtUSD(Math.round(player.netAmount))}
        </span>
        {player.entryPrice !== null && (
          <>
            <span className="text-[#3a434f]"> · </span>
            <span className="text-[#5d6877]">entry </span>
            <span className="font-mono text-[#9aa6b6]">{fmtPrice(player.entryPrice)}</span>
          </>
        )}
      </p>
      <p className="mt-1 text-[10.5px] text-[#5d6877]">
        A {opposite} of {fmtUSD(Math.round(player.netAmount))} offsets it entirely. A smaller one
        reduces it; a larger one flips the side.
      </p>
    </div>
  );
}

function BetButton({
  side,
  disabled,
  pending,
  describedBy,
  onClick,
}: {
  side: Side;
  disabled: boolean;
  pending: boolean;
  describedBy: string | undefined;
  onClick: () => void;
}) {
  const isLong = side === "long";
  const Arrow = isLong ? ArrowUp : ArrowDown;

  return (
    <button
      type="button"
      aria-disabled={disabled}
      aria-describedby={describedBy}
      onClick={onClick}
      aria-label={
        isLong
          ? "Long — bet that the price rises"
          : "Short — bet that the price falls"
      }
      className={`flex flex-1 flex-col items-center justify-center gap-0.5 rounded-[7px] px-3 py-2.5 transition hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#eef2f8] aria-disabled:opacity-50 aria-disabled:hover:brightness-100 ${
        isLong ? "bg-[#1fcb83] text-[#06180f]" : "bg-[#f6485d] text-white"
      }`}
    >
      <span className="flex items-center gap-1.5 text-[14px] font-bold tracking-[-.01em]">
        <Arrow aria-hidden="true" className="size-4" strokeWidth={2.75} />
        {pending ? "Placing…" : isLong ? "Long" : "Short"}
      </span>
      <span className="text-[10.5px] font-semibold opacity-75">
        {isLong ? "Price rises" : "Price falls"}
      </span>
    </button>
  );
}

function Feedback({
  fill,
  rejection,
  hidden,
  disabled,
  connecting,
}: {
  fill: TradeFill | null;
  rejection: TradeRejection | null;
  hidden: boolean;
  disabled: boolean;
  connecting: boolean;
}) {
  if (hidden) {
    return (
      <p
        aria-hidden="true"
        className="mt-3 flex items-center gap-2 text-[11.5px] text-[#5d6877]"
      >
        <span className="size-1.5 animate-pulse rounded-full bg-[#4d86ff]" />
        Waiting for the server to fill this Trade…
      </p>
    );
  }

  if (rejection !== null) {
    return (
      <p
        aria-hidden="true"
        className="mt-3 rounded-[7px] border border-[#f6485d]/30 bg-[#f6485d]/10 px-3 py-2 text-sm text-[#ff8c99]"
      >
        Trade rejected — {rejection.reason}
      </p>
    );
  }

  if (fill !== null) {
    const isLong = fill.side === "long";
    return (
      <div
        aria-hidden="true"
        className="mt-3 rounded-[7px] border border-white/[.07] bg-[#151b25] px-3 py-2"
      >
        <p className="text-[12.5px] text-[#eef2f8]">
          <span className={`font-semibold ${isLong ? "text-[#1fcb83]" : "text-[#f6485d]"}`}>
            {isLong ? "Long" : "Short"}
          </span>{" "}
          <span className="font-mono font-semibold">{fmtUSD(Math.round(fill.amount))}</span> filled @{" "}
          <span className="font-mono font-semibold">{fmtPrice(fill.fillPrice)}</span>
        </p>
        <p className="mt-1 text-[10.5px] text-[#5d6877]">
          Filled at the server&apos;s price, which is often not the price shown when you clicked.
        </p>
        <p className="mt-1 text-[11px] text-[#9aa6b6]">
          {fill.resultingNetSide === "flat" ? (
            "Exposure is now flat."
          ) : (
            <>
              Exposure is now {fill.resultingNetSide === "long" ? "Long" : "Short"}{" "}
              <span className="font-mono">{fmtUSD(Math.round(fill.resultingNetAmount))}</span>.
            </>
          )}
          {fill.realisedPnl !== null && (
            <>
              {" "}
              Offset realised{" "}
              <span
                className={`font-mono font-semibold ${
                  fill.realisedPnl < 0 ? "text-[#f6485d]" : "text-[#1fcb83]"
                }`}
              >
                {fill.realisedPnl < 0 ? "−" : "+"}
                {fmtUSD(Math.abs(Math.round(fill.realisedPnl)))}
              </span>
              .
            </>
          )}
        </p>
      </div>
    );
  }

  if (connecting) {
    return (
      <p aria-hidden="true" className="mt-3 text-[11.5px] text-[#5d6877]">
        Connecting to the match…
      </p>
    );
  }

  if (disabled) {
    return (
      <p aria-hidden="true" className="mt-3 text-[11.5px] text-[#5d6877]">
        Trading is unavailable right now.
      </p>
    );
  }

  return (
    <p aria-hidden="true" className="mt-3 text-[11.5px] text-[#3a434f]">
      Nothing moves until the server confirms your Trade.
    </p>
  );
}

function sanitise(value: string) {
  const cleaned = value.replace(/[^0-9.]/g, "");
  const [whole, ...rest] = cleaned.split(".");
  return rest.length === 0 ? whole : `${whole}.${rest.join("")}`;
}

function parseAmount(raw: string): number | null {
  const trimmed = raw.trim();
  if (trimmed === "" || trimmed === ".") return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function maxForSide(player: PlayerState | null, side: Side): number {
  if (player === null) return 0;
  const offsettable =
    player.netSide !== "flat" && player.netSide !== side ? player.netAmount : 0;
  return player.availableBalance + offsettable;
}

function validate(raw: string, amount: number | null, player: PlayerState | null): string | null {
  if (raw.trim() === "") return null;
  if (amount === null) return "Enter an amount.";
  if (amount <= 0) return "Amount must be greater than zero.";
  if (player !== null) {
    const ceiling = Math.max(maxForSide(player, "long"), maxForSide(player, "short"));
    if (amount > ceiling) {
      return `More than you can bet or offset — at most ${fmtUSD(Math.floor(ceiling))}.`;
    }
  }
  return null;
}

function fmtPrice(value: number) {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
