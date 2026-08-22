"use client";

import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { LoaderCircle, RefreshCw, WifiOff } from "lucide-react";

const BACKOFF_MS = [1000, 2000, 4000, 8000];

function delayForAttempt(attempt: number): number {
  return BACKOFF_MS[Math.min(attempt, BACKOFF_MS.length - 1)];
}

const TICK_MS = 250;

function statusSpeech(connection: "connecting" | "connected" | "disconnected"): string {
  switch (connection) {
    case "connected":
      return "Connected to the match. Order controls are available.";
    case "connecting":
      return "Reconnecting. Your chart, balances and exposure will be restored.";
    case "disconnected":
      return "Connection lost. Order controls are paused and reconnection is automatic.";
  }
}

export function ConnectionBanner({
  connection,
  onReconnect,
}: {
  connection: "connecting" | "connected" | "disconnected";
  onReconnect: () => void;
}): React.ReactElement {
  const attemptRef = useRef(0);
  const retryAtRef = useRef<number | null>(null);

  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

  const onReconnectRef = useRef(onReconnect);
  useEffect(() => {
    onReconnectRef.current = onReconnect;
  }, [onReconnect]);

  useEffect(() => {
    if (connection !== "disconnected") {
      retryAtRef.current = null;
      if (connection === "connected") {
        attemptRef.current = 0;
      }
      return;
    }

    const tick = () => {
      if (retryAtRef.current === null) {
        retryAtRef.current = Date.now() + delayForAttempt(attemptRef.current);
      }

      const remaining = retryAtRef.current - Date.now();

      if (remaining <= 0) {
        retryAtRef.current = null;
        attemptRef.current += 1;
        setSecondsLeft(0);
        onReconnectRef.current();
        return;
      }

      setSecondsLeft(Math.ceil(remaining / 1000));
    };

    const firstTick = window.setTimeout(tick, 0);
    const interval = window.setInterval(tick, TICK_MS);

    return () => {
      window.clearTimeout(firstTick);
      window.clearInterval(interval);
      retryAtRef.current = null;
    };
  }, [connection]);

  const retryNow = useCallback(() => {
    retryAtRef.current = null;
    attemptRef.current += 1;
    setSecondsLeft(0);
    onReconnectRef.current();
  }, []);

  const connecting = connection === "connecting";

  return (
    <>
      <p role="status" aria-live="polite" className="sr-only">
        {statusSpeech(connection)}
      </p>
      {connection === "connected" ? null : (
        <div
          className={`flex w-full shrink-0 flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border px-4 py-2.5 ${
            connecting
              ? "border-[#4d86ff]/25 bg-[#4d86ff]/[.07]"
              : "border-[#f5a524]/30 bg-[#f5a524]/[.08]"
          }`}
        >
          {connecting ? (
            <LoaderCircle
              aria-hidden="true"
              className="size-4 shrink-0 animate-spin text-[#4d86ff]"
            />
          ) : (
            <WifiOff aria-hidden="true" className="size-4 shrink-0 text-[#f5a524]" />
          )}
          <p aria-hidden="true" className="min-w-0 flex-1 text-[13px] text-[#eef2f8]">
            <span className="font-semibold">
              {connecting ? "Reconnecting…" : "Connection lost"}
            </span>{" "}
            <span className="text-[#9aa6b6]">
              {connecting
                ? "Restoring your chart, balances and exposure."
                : "Order controls are paused until the stream resumes."}
            </span>
          </p>
          {!connecting && (
            <>
              <span
                aria-hidden="true"
                className="font-mono text-[12px] tabular-nums text-[#5d6877]"
              >
                {secondsLeft === null || secondsLeft <= 0
                  ? "retrying…"
                  : `retry in ${secondsLeft}s`}
              </span>
              <button
                type="button"
                onClick={retryNow}
                aria-label="Retry connecting to the match now"
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-[7px] border border-white/[.07] bg-[#151b25] px-2.5 py-1.5 text-[12.5px] font-semibold text-[#eef2f8] transition hover:border-white/[.12] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4d86ff]"
              >
                <RefreshCw aria-hidden="true" className="size-3.5 text-[#9aa6b6]" />
                Retry now
              </button>
            </>
          )}
        </div>
      )}
    </>
  );
}
