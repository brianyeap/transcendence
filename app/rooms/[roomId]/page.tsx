"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { io, type Socket } from "socket.io-client";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL;

// The match goes through these phases. We use it to decide what to show.
type Phase = "connecting" | "waiting" | "countdown" | "live" | "ended";

// The player's own money + open position, as sent by the server.
type PlayerState = {
  availableBalance: number;
  realizedPnl: number;
  side: "long" | "short" | "flat";
  notional: number;
  avgEntry: number | null;
};

export default function MatchRoomPage() {
  // The [roomId] from the URL is also the match id.
  const params = useParams();
  const matchId = String(params.roomId);
  const router = useRouter();

  // We keep the socket in a ref so re-renders don't reconnect it.
  const socketRef = useRef<Socket | null>(null);

  // --- everything the screen shows ---
  const [userId, setUserId] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("connecting");
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [price, setPrice] = useState<number | null>(null);
  const [player, setPlayer] = useState<PlayerState | null>(null);
  const [amount, setAmount] = useState("100"); // text in the amount box
  const [message, setMessage] = useState<string | null>(null); // trade feedback / errors
  const [result, setResult] = useState<{
    finalCapitals: Record<string, number>;
    winnerUserId: string | null;
  } | null>(null);

  // Connect to the match once, when the page loads.
  useEffect(() => {
    let cancelled = false;
    let socket: Socket | null = null;

    async function connect() {
      // 1. Find out who we are (our Supabase user id).
      const supabase = createSupabaseBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      // If we unmounted (or the match changed) while waiting for getUser, stop
      // here so we don't open a leftover, leaked socket connection.
      if (cancelled) return;

      if (!user) {
        // Not logged in — send them to the login page.
        router.push("/login");
        return;
      }
      setUserId(user.id);

      // 2. Open the socket connection to the match engine.
      socket = io(SOCKET_URL);
      socketRef.current = socket;

      // 3. Listen for everything the server tells us.
      socket.on("match:waiting", () => setPhase("waiting"));

      socket.on("match:countdown", ({ secondsLeft }) => {
        setPhase("countdown");
        setSecondsLeft(secondsLeft);
      });

      socket.on("match:started", () => setPhase("live"));

      socket.on("match:tick", ({ price }) => {
        setPrice(price);
        // A price tick means trading is live (unless it already ended).
        setPhase((current) => (current === "ended" ? current : "live"));
      });

      socket.on("player:state", (state: PlayerState) => setPlayer(state));

      socket.on("trade:accepted", ({ side, amount, price }) => {
        setMessage(`Order filled: ${side} ${amount} @ ${price}`);
      });

      socket.on("trade:rejected", ({ reason }) => setMessage(`Rejected: ${reason}`));

      socket.on("match:ended", (data) => {
        setPhase("ended");
        setResult(data);
      });

      socket.on("error", ({ message }) => setMessage(message));

      // 4. Once connected, tell the server we are joining this match.
      socket.on("connect", () => {
        socket?.emit("match:join", { matchId, userId: user.id });
      });
    }

    connect();

    // When we leave the page, close the socket and mark cancelled so a still-
    // pending connect() doesn't open one after we've gone.
    return () => {
      cancelled = true;
      socket?.disconnect();
      socketRef.current = null;
    };
  }, [matchId, router]);

  // Send a buy/sell order to the server.
  function submitTrade(side: "long" | "short") {
    setMessage(null);
    socketRef.current?.emit("trade:submit", {
      matchId,
      userId,
      side,
      amount: Number(amount),
    });
  }

  // Text for the end screen (did we win, lose, or draw?).
  let endText = "";
  if (result) {
    if (result.winnerUserId === null) endText = "It's a draw!";
    else if (result.winnerUserId === userId) endText = "You won! 🎉";
    else endText = "You lost.";
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-4 p-6 font-sans text-[#eef2f8]">
      <h1 className="text-xl font-bold">Match Room</h1>

      {/* --- Connecting / waiting for the other player --- */}
      {phase === "connecting" && <p className="text-[#9aa6b6]">Connecting…</p>}
      {phase === "waiting" && (
        <p className="text-[#9aa6b6]">Waiting for another player to join…</p>
      )}

      {/* --- Countdown before trading starts --- */}
      {phase === "countdown" && (
        <div className="rounded-lg border border-white/10 bg-[#0f131b] p-6 text-center">
          <p className="text-sm text-[#9aa6b6]">Match starts in</p>
          <p className="font-mono text-4xl font-bold">{secondsLeft}s</p>
        </div>
      )}

      {/* --- Live trading --- */}
      {phase === "live" && (
        <>
          {/* Current price */}
          <div className="rounded-lg border border-white/10 bg-[#0f131b] p-4">
            <p className="text-xs uppercase text-[#5d6877]">BTC/USD price</p>
            <p className="font-mono text-2xl font-bold">
              {price === null ? "…" : `$${price.toLocaleString()}`}
            </p>
          </div>

          {/* Your money and position */}
          {player && (
            <div className="rounded-lg border border-white/10 bg-[#0f131b] p-4 text-sm">
              <p>
                Balance:{" "}
                <span className="font-mono font-semibold">
                  ${player.availableBalance.toLocaleString()}
                </span>
              </p>
              <p>
                Realized PnL:{" "}
                <span className="font-mono font-semibold">
                  ${player.realizedPnl.toLocaleString()}
                </span>
              </p>
              <p>
                Position:{" "}
                {player.side === "flat" ? (
                  "none"
                ) : (
                  <span className="font-mono font-semibold">
                    {player.side} ${player.notional.toLocaleString()} @ {player.avgEntry}
                  </span>
                )}
              </p>
            </div>
          )}

          {/* Order controls */}
          <div className="flex flex-col gap-2">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="rounded-lg border border-white/20 bg-[#0f131b] px-3 py-2 font-mono"
              placeholder="Amount in USDT"
            />
            <div className="flex gap-2">
              <button
                onClick={() => submitTrade("long")}
                className="flex-1 rounded-lg bg-[#1fcb83] py-2 font-semibold text-black hover:brightness-110"
              >
                Buy Long
              </button>
              <button
                onClick={() => submitTrade("short")}
                className="flex-1 rounded-lg bg-[#f6485d] py-2 font-semibold text-white hover:brightness-110"
              >
                Buy Short
              </button>
            </div>
          </div>
        </>
      )}

      {/* --- Match finished --- */}
      {phase === "ended" && result && (
        <div className="rounded-lg border border-white/10 bg-[#0f131b] p-6 text-center">
          <p className="text-2xl font-bold">{endText}</p>
          <div className="mt-4 text-sm text-[#9aa6b6]">
            {Object.entries(result.finalCapitals).map(([id, capital]) => (
              <p key={id}>
                {id === userId ? "You" : "Opponent"}:{" "}
                <span className="font-mono font-semibold text-[#eef2f8]">
                  ${capital.toLocaleString()}
                </span>
              </p>
            ))}
          </div>
          <button
            onClick={() => router.push("/")}
            className="mt-4 rounded-lg bg-[#4d86ff] px-4 py-2 font-semibold text-white hover:brightness-110"
          >
            Back to Games
          </button>
        </div>
      )}

      {/* Small feedback line for trade results / errors */}
      {message && <p className="text-sm text-[#9aa6b6]">{message}</p>}
    </div>
  );
}
