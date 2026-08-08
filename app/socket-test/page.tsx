"use client";

import { useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";

// Browser talks to the host-published socket port, not the docker service name.
const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL;

type Tick = {
  tick: number;
  symbol: string;
  price: number;
  bid: number;
  ask: number;
  volume: number;
  time: string;
  at: number;
};

export default function SocketTestPage() {
  const socketRef = useRef<Socket | null>(null); // no rerender
  const [status, setStatus] = useState("connecting...");
  const [ticks, setTicks] = useState<Tick[]>([]);

  useEffect(() => {
    // run once, no re render
    const socket = io(SOCKET_URL);
    socketRef.current = socket;

    socket.on("connect", () => setStatus(`connected: ${socket.id}`));
    socket.on("disconnect", () => setStatus("disconnected"));
    socket.on("data", (payload: Tick) => {
      console.log("data:", payload);
      setTicks((prev) => [payload, ...prev].slice(0, 20)); // newest first, keep last 20
    });

    return () => {
      // cleanup
      socket.disconnect();
    };
  }, []);

  const start = async () => {
    console.log("starting stream...");
    setTicks([]); // clear previous run
    const res = await fetch(`${SOCKET_URL}/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ socketId: socketRef.current?.id }), // if yes use if nit undefined
    });
    console.log("start response:", await res.json());
  };

  const latest = ticks[0];

  return (
    <div style={{ padding: 24, fontFamily: "sans-serif", maxWidth: 520 }}>
      <p>Status: {status}</p>
      <button onClick={start} style={{ padding: "8px 16px" }}>
        Start streaming BTC/USD (10s)
      </button>

      {latest && (
        <p style={{ fontSize: 28, fontWeight: 600, margin: "20px 0 4px" }}>
          {latest.symbol}: ${latest.price.toLocaleString()}
        </p>
      )}

      <table style={{ width: "100%", marginTop: 16, borderCollapse: "collapse", fontSize: 14 }}>
        <thead>
          <tr style={{ textAlign: "left", color: "#888" }}>
            <th style={{ padding: "4px 8px" }}>#</th>
            <th style={{ padding: "4px 8px" }}>Price</th>
            <th style={{ padding: "4px 8px" }}>Bid</th>
            <th style={{ padding: "4px 8px" }}>Ask</th>
          </tr>
        </thead>
        <tbody>
          {ticks.map((t) => (
            <tr key={t.tick} style={{ borderTop: "1px solid #eee" }}>
              <td style={{ padding: "4px 8px", color: "#888" }}>{t.tick}</td>
              <td style={{ padding: "4px 8px" }}>${t.price.toLocaleString()}</td>
              <td style={{ padding: "4px 8px" }}>${t.bid.toLocaleString()}</td>
              <td style={{ padding: "4px 8px" }}>${t.ask.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
