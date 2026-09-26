"use client";

import { ArrowDown, ArrowUp } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import type { PlayerState, Side, TradeFill, TradeRejection } from "@/lib/match/types";
import { fmtUSD } from "../../components/duel/format";
import { fmtPrice } from "../../components/duel/format";

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
  const t = useTranslations("OrderPanel");

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

  // What the player can actually spend on each side. These are different numbers
  // whenever a position is open, because an order in the opposite direction closes
  // that position on its way through.
  const maxLong = maxForSide(player, "long");
  const maxShort = maxForSide(player, "short");

  // Presets scale off the larger of the two, so 100% always offers a usable order.
  // If it is too big for the other side, that button explains why.
  const maxOrder = Math.max(maxLong, maxShort);

  const amount = parseAmount(raw);
  const error = validate(raw, amount, player, {
    enterAmount: t("enterAmount"),
    amountGreaterThanZero: t("amountGreaterThanZero"),
    amountExceedsLimit: (amount) => t("amountExceedsLimit", { amount }),
  });
  const canSubmit = !locked && amount !== null && error === null;
  const canSubmitSide = (side: Side) =>
    canSubmit && amount !== null && amount <= (side === "long" ? maxLong : maxShort);

  const totalCapital =
    player === null ? 0 : player.availableBalance + player.reservedBalance;

  function applyPreset(fraction: number) {
    if (player === null) return;
    setRaw(String(Math.floor(totalCapital * fraction * 100) / 100));
  }

  function submit(side: Side) {
    if (!canSubmitSide(side) || amount === null) return;
    setPendingSide(side);
    onSubmit({ side, amount });
  }

  return (
    <section
      className="rounded-xl border border-white/[.07] bg-[#0f131b] p-4"
    >
      <div className="flex items-baseline justify-between gap-3">
        <h2
          id="order-panel-heading"
          className="text-[13px] font-semibold tracking-[-.01em] text-[#eef2f8]"
        >
          {t("placeTrade")}
        </h2>
        <p className="text-[11px] text-[#5d6877]">
          {t("available")}{" "}
          <span className="font-mono font-semibold text-[#9aa6b6]">
            {player === null ? "—" : fmtUSD(Math.floor(available))}
          </span>
        </p>
      </div>

      <ExposureHint player={player} />

      <label
        htmlFor="order-amount"
        className="mt-3 mb-1.5 block text-[10.5px] font-bold uppercase tracking-[.04em] text-[#5d6877]"
      >
        {t("amount")}
      </label>
      <div className="relative">
        <span
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

      <div className="mt-3 flex items-stretch gap-3">
        <BetButton
          side="long"
          disabled={!canSubmitSide("long")}
          pending={pendingSide === "long"}
          onClick={() => submit("long")}
        />
        <div className="w-px self-stretch bg-white/[.07]" />
        <BetButton
          side="short"
          disabled={!canSubmitSide("short")}
          pending={pendingSide === "short"}
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
    </section>
  );
}

function ExposureHint({ player }: { player: PlayerState | null }) {
  const t = useTranslations("OrderPanel");

  if (player === null || player.netSide === "flat") return null;
  const held = player.netSide === "long" ? t("long") : t("short");
  const opposite = player.netSide === "long" ? t("short") : t("long");
  const tone = player.netSide === "long" ? "text-[#1fcb83]" : "text-[#f6485d]";

  return (
    <div className="mt-3 rounded-[7px] border border-white/[.07] bg-[#151b25] px-3 py-2">
      <p className="text-[11px] text-[#9aa6b6]">
        <span className="text-[#5d6877]">{t("exposure")}</span>{" "}
        <span className={`font-semibold ${tone}`}>{held}</span>{" "}
        <span className="font-mono font-semibold text-[#eef2f8]">
          {fmtUSD(Math.round(player.netAmount))}
        </span>
        {player.entryPrice !== null && (
          <>
            <span className="text-[#3a434f]"> · </span>
            <span className="text-[#5d6877]">{t("entry")} </span>
            <span className="font-mono text-[#9aa6b6]">{fmtPrice(player.entryPrice)}</span>
          </>
        )}
      </p>
      <p className="mt-1 text-[10.5px] text-[#5d6877]">
        {t("exposureDetail", {
          opposite,
          amount: fmtUSD(Math.round(player.netAmount)),
        })}
      </p>
    </div>
  );
}

function BetButton({
  side,
  disabled,
  pending,
  onClick,
}: {
  side: Side;
  disabled: boolean;
  pending: boolean;
  onClick: () => void;
}) {
  const t = useTranslations("OrderPanel");

  const isLong = side === "long";
  const Arrow = isLong ? ArrowUp : ArrowDown;
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`flex flex-1 flex-col items-center justify-center gap-0.5 rounded-[7px] px-3 py-2.5 transition hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#eef2f8] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:brightness-100 ${
        isLong ? "bg-[#1fcb83] text-[#06180f]" : "bg-[#f6485d] text-white"
      }`}
    >
      <span className="flex items-center gap-1.5 text-[14px] font-bold tracking-[-.01em]">
        <Arrow className="size-4" strokeWidth={2.75} />
        {pending ? t("placing") : isLong ? t("long") : t("short")}
      </span>
      <span className="text-[10.5px] font-semibold opacity-75">
        {isLong ? t("priceRises") : t("priceFalls")}
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
  const t = useTranslations("OrderPanel");

  if (hidden) {
    return (
      <p
        className="mt-3 flex items-center gap-2 text-[11.5px] text-[#5d6877]"
      >
        <span className="size-1.5 animate-pulse rounded-full bg-[#4d86ff]" />
        {t("waitingForServer")}
      </p>
    );
  }
  if (rejection !== null) {
    return (
      <p
        className="mt-3 rounded-[7px] border border-[#f6485d]/30 bg-[#f6485d]/10 px-3 py-2 text-sm text-[#ff8c99]"
      >
        {t("tradeRejected", { reason: rejection.reason })}
      </p>
    );
  }
  if (fill !== null) {
    const isLong = fill.side === "long";
    return (
      <div
        className="mt-3 rounded-[7px] border border-white/[.07] bg-[#151b25] px-3 py-2"
      >
        <p className="text-[12.5px] text-[#eef2f8]">
          <span className={`font-semibold ${isLong ? "text-[#1fcb83]" : "text-[#f6485d]"}`}>
            {isLong ? t("long") : t("short")}
          </span>{" "}
          <span className="font-mono font-semibold">{fmtUSD(Math.round(fill.amount))}</span>{" "}
          {t("filledAt")}{" "}
          <span className="font-mono font-semibold">{fmtPrice(fill.fillPrice)}</span>
        </p>
        <p className="mt-1 text-[10.5px] text-[#5d6877]">
          {t("filledAtServerPrice")}
        </p>
        <p className="mt-1 text-[11px] text-[#9aa6b6]">
          {fill.resultingNetSide === "flat" ? (
            t("exposureFlat")
          ) : (
            <>
              {t("exposureNow", {
                side: fill.resultingNetSide === "long" ? t("long") : t("short"),
              })}{" "}
              <span className="font-mono">{fmtUSD(Math.round(fill.resultingNetAmount))}</span>.
            </>
          )}
          {fill.realisedPnl !== null && (
            <>
              {" "}
              {t("offsetRealised")}{" "}
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
      <p className="mt-3 text-[11.5px] text-[#5d6877]">
        {t("connecting")}
      </p>
    );
  }
  if (disabled) {
    return (
      <p className="mt-3 text-[11.5px] text-[#5d6877]">
        {t("tradingUnavailable")}
      </p>
    );
  }
  return (
    <p className="mt-3 text-[11.5px] text-[#3a434f]">
      {t("nothingMoves")}
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

// The largest order the player can place on `side` right now.
//
// Same direction as their position (or no position at all): only the free money
// can pay for it.
//
// Opposite direction: the order CLOSES the position before it opens anything, and
// closing hands back the money reserved in that position plus its profit/loss. So
// such an order can spend three things:
//   the free money  +  the position it closes  +  what closing releases
// which is the exact point where one order closes the old side and flips fully to
// the new one. This is why "free money 0" never means "you cannot trade".
function maxForSide(player: PlayerState | null, side: Side): number {
  if (player === null) return 0;

  if (player.netSide === "flat" || player.netSide === side) {
    return player.availableBalance;
  }

  // The profit/loss here is rounded to the nearest cent for display. When that
  // rounds UP, this total lands a fraction above what the server will really
  // accept, and a 100% order gets rejected. Keep a cent back so it never does.
  const released = player.netAmount + player.unrealisedPnl;
  return Math.max(0, player.availableBalance + player.netAmount + released - 0.01);
}

function validate(
  raw: string,
  amount: number | null,
  player: PlayerState | null,
  messages: {
    enterAmount: string;
    amountGreaterThanZero: string;
    amountExceedsLimit: (amount: string) => string;
  }
): string | null {
  if (raw.trim() === "") return null;
  if (amount === null) return messages.enterAmount;
  if (amount <= 0) return messages.amountGreaterThanZero;
  if (player !== null) {
    const ceiling = Math.max(maxForSide(player, "long"), maxForSide(player, "short"));
    if (amount > ceiling) {
      return messages.amountExceedsLimit(fmtUSD(Math.floor(ceiling)));
    }
  }
  return null;
}
