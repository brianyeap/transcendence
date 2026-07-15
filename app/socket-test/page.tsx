"use client";

import { useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";

// Browser talks to the host-published socket port, not the docker service name.
const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL;

export default function SocketTestPage() {
  const socketRef = useRef<Socket | null>(null);  // no rerender
  const [status, setStatus] = useState("connecting...");

  useEffect(() => { // run once, no re render
    const socket = io(SOCKET_URL);
    socketRef.current = socket;

    socket.on("connect", () => setStatus(`connected: ${socket.id}`));
    socket.on("disconnect", () => setStatus("disconnected"));
    socket.on("data", (payload) => console.log("data:", payload));

    return () => { // cleanup
      socket.disconnect();
    };
  }, []);

  const start = async () => {
    console.log("starting stream...");
    const res = await fetch(`${SOCKET_URL}/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ socketId: socketRef.current?.id }),  // if yes use if nit undefined
    });
    console.log("start response:", await res.json());
  };

  return (
    <div style={{ padding: 24, fontFamily: "sans-serif" }}>
      <p>Status: {status}</p>
      <button onClick={start} style={{ padding: "8px 16px" }}>
        Start streaming (10s)
      </button>
      <p style={{ color: "#888" }}>Open the browser console to see the data.</p>
    </div>
  );
}
