# DUEL — 1v1 Crypto Trading

DUEL is a head-to-head **simulated** BTC trading game. Two players join a match, watch the same BTC candle feed, and open long/short positions with virtual capital. After a 10-second countdown and a 60-second trading window, the player with the most capital wins. No real funds are involved.

## Architecture

| Part | Where | What it does |
| --- | --- | --- |
| Web app | `app/`, `lib/` | Next.js (App Router) UI: login, lobby, match screen, profile, friends, leaderboard, history, settings |
| Match engine | `socket/` | Node + Socket.IO server on port `4000`. Runs live matches, fetches Coinbase BTC-USD candles, validates trades, saves results |
| Database / auth | `supabase/` | Supabase Postgres, Auth (email/password, Google OAuth, TOTP 2FA) and Storage (avatars) |
| Monitoring | `monitoring/` | OpenTelemetry collector → Prometheus → Grafana |
| Translations | `messages/` | `en`, `ms`, `zh-CN` via `next-intl` |

## Getting started (Docker)

The whole stack runs with Docker Compose. There's no need to run `npm run dev` yourself: the `web` container runs it for you.

### 1. Set up environment files

```bash
cp .env.example .env.local
```

```bash
cp monitoring/.env.example monitoring/.env
```

Fill in the Supabase values in `.env.local` (Supabase dashboard → Project Settings → API). The socket container reads `.env.local` directly, so the stack won't start without it. `monitoring/.env` holds the Grafana admin login, SMTP settings for alerts, and the Supabase metrics key.

### 2. Set up the database

Run the SQL files in `supabase/migrations/` **in order** in the Supabase SQL editor. `supabase/mfa-rls-policy.sql` is an example policy, not a migration.

### 3. Start the stack

```bash
COMPOSE_DISABLE_ENV_FILE=1 docker compose up --build
```

| Service | URL |
| --- | --- |
| Web app | http://localhost:3000 |
| Match engine (Socket.IO) | http://localhost:4000 |
| Grafana | https://localhost:3001 (self-signed certificate, so accept the browser warning) |
| Prometheus | http://localhost:9090 |
| OTel collector | `4317` (gRPC), `4318` (HTTP), `8889` (Prometheus metrics) |

The `web` container reinstalls npm dependencies when `node_modules` is missing or older than `package.json` / `package-lock.json`. All services share the `transcendence_dev` network, so they reach each other by service name (e.g. `otel-collector:4318`).

The match engine **does not hot reload**. After editing `socket/server.js`, restart it:

```bash
COMPOSE_DISABLE_ENV_FILE=1 docker compose restart socket
```

### Using a different web port

If port `3000` is taken, set `WEB_PORT`. Don't use `3001`, because Grafana already uses it. The new port must also be listed in `SOCKET_ALLOWED_ORIGINS` in `.env.local`, or the match engine will refuse the connection (`3003` is already listed in the example):

```bash
COMPOSE_DISABLE_ENV_FILE=1 WEB_PORT=3003 docker compose up --build
```

### Stop the stack

```bash
COMPOSE_DISABLE_ENV_FILE=1 docker compose down
```

## Tests

Engine math tests (run inside `socket/`):

```bash
cd socket && npm test
```

## Deployment

The Next.js web app is deployed on **Vercel**. Vercel can't host the match engine, because it's a long-running process that keeps live matches in memory. To make matches playable fully online, deploy `socket/` to a VPS and point `NEXT_PUBLIC_SOCKET_URL` at it. That server's `SOCKET_ALLOWED_ORIGINS` must include the Vercel domain.

## Docs

- [How DUEL works: architecture diagrams](docs/architecture.md)
- [Product requirements & planning](docs/prd/trading-game/README.md)
- [2FA walkthrough](docs/2fa_walkthrough.md)
