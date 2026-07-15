// Minimal Socket.IO streaming server.
// POST /start -> stream a "data" event every 0.5s for 10s to the caller's socket.

const http = require("http");
const express = require("express");
const cors = require("cors");
const { Server } = require("socket.io");

const PORT = 4000;
const INTERVAL_MS = 500; // emit every 0.5s
const DURATION_MS = 10000; // stop after 10s
const TICKS = DURATION_MS / INTERVAL_MS; // 20 messages

const app = express();
app.use(cors({ origin: "http://localhost:3000" }));  // Allow only our frontend host.
app.use(express.json());  // making req json

const server = http.createServer(app); // pass every req to app
const io = new Server(server, { cors: { origin: "http://localhost:3000" } });

io.on("connection", (socket) => {
  console.log("client connected:", socket.id);
  socket.on("disconnect", () => console.log("client disconnected:", socket.id));
});

// Start streaming to the socket named in the body (or everyone if none given).
app.post("/start", (req, res) => {
  const { socketId } = req.body || {};
  const target = socketId ? io.to(socketId) : io; // nneeds to change eventually

  let tick = 0;
  const timer = setInterval(() => {
    tick += 1;
    target.emit("data", { tick, value: Math.random(), at: Date.now() });
    if (tick >= TICKS) clearInterval(timer);
  }, INTERVAL_MS);

  res.json({ ok: true, message: `streaming ${TICKS} ticks over 10s` });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`socket server listening on :${PORT}`);
});
