# How DUEL works

Three diagrams:

1. **System overview**: every service and what data flows between them.
2. **Match lifecycle**: a full game, from creating a room to the result.
3. **Monitoring pipeline**: how metrics get from the app to Grafana and email alerts.

## 1. System overview

```mermaid
flowchart LR
  subgraph Browser["Player's browser"]
    UI["Next.js pages<br/>lobby, match, profile,<br/>friends, leaderboard, history"]
    ST["Match screen transport<br/>lib/match/socket-transport.ts<br/>socket.io-client"]
  end

  subgraph Docker["Docker network: transcendence_dev"]
    WEB["web :3000<br/>Next.js server<br/>proxy.ts + app/api/rooms"]
    SOCK["socket :4000<br/>Match engine<br/>socket/server.js"]
    OTEL["otel-collector<br/>4318 in, 8889 out"]
    PROM["prometheus :9090"]
    GRAF["grafana :3001 https"]
  end

  subgraph Supabase["Supabase cloud"]
    AUTH["Auth<br/>email, Google, TOTP 2FA"]
    DB[("Postgres<br/>profiles, matches, match_players,<br/>match_candles, trades, friends")]
    STORE["Storage<br/>avatars bucket"]
    MET["Supabase metrics endpoint"]
  end

  CB["Coinbase public API<br/>BTC-USD candles + ticker"]
  MAIL["Gmail SMTP<br/>alert emails"]

  UI -->|"page requests, /api/rooms"| WEB
  WEB -->|"check session cookie"| AUTH
  WEB -->|"server reads + create/join room"| DB
  UI -->|"browser reads: friends, ping_online"| DB
  UI -->|"avatar upload"| STORE
  ST -->|"on page load: match, candles,<br/>trades, players snapshot"| DB
  ST <-->|"WebSocket<br/>match:join, trade:submit<br/>tick, capitals, ended"| SOCK
  SOCK -->|"verify login token"| AUTH
  SOCK -->|"fetch 1-min candles"| CB
  SOCK -->|"service role: candles,<br/>trades, results"| DB
  WEB -->|"OTLP metrics every 5s"| OTEL
  SOCK -->|"OTLP metrics every 5s"| OTEL
  PROM -->|"scrape :8889"| OTEL
  PROM -->|"scrape every 60s"| MET
  GRAF -->|"PromQL queries"| PROM
  GRAF -->|"alert emails"| MAIL
```

**Who is in charge of what:**

- **Supabase** is the permanent memory: accounts, rooms/matches, trades, candles, results.
- **The match engine** is the referee. It keeps live matches in memory (`liveMatches`), decides every fill and the winner, then saves everything to Supabase. The browser only *shows* estimated numbers.
- **The web server** handles login redirects (`proxy.ts`) and room create/join (`app/api/rooms`). Most other pages read Supabase directly.
- When the engine starts, it runs `closeStaleMatches()`, which marks as completed any matches whose time has run out and any rooms that have waited for more than 1 hour.

## 2. Match lifecycle

```mermaid
sequenceDiagram
  autonumber
  actor P1 as Player 1
  actor P2 as Player 2
  participant API as Next.js API<br/>app/api/rooms
  participant DB as Supabase DB
  participant ENG as Match engine<br/>socket :4000
  participant CB as Coinbase

  P1->>API: POST /api/rooms with starting capital
  API->>DB: insert matches row, status waiting
  P1->>ENG: connect with Supabase token, match:join
  ENG->>DB: check match exists and P1 is in it
  ENG-->>P1: match:waiting

  P2->>API: POST /api/rooms/join
  API->>DB: set player two, status countdown,<br/>starts_at = now + 10s, ends_at = starts_at + 60s
  P2->>ENG: connect with Supabase token, match:join
  ENG->>DB: load or create match_players rows
  ENG->>CB: fetch 1-min BTC-USD candles
  Note over ENG: Match loaded into memory,<br/>timer ticks every 500 ms

  loop every 500 ms until starts_at
    ENG-->>P1: match:countdown
    ENG-->>P2: match:countdown
  end

  ENG->>DB: matches.status = active
  ENG-->>P1: match:started
  ENG-->>P2: match:started

  loop every 500 ms until ends_at
    ENG->>DB: insert next candle into match_candles
    ENG-->>P1: match:tick + match:capitals
    ENG-->>P2: match:tick + match:capitals
    opt a player places an order
      P1->>ENG: trade:submit long or short, amount
      ENG->>ENG: validate, fill at candle close price
      ENG->>DB: update match_players, insert trades
      ENG-->>P1: trade:accepted or trade:rejected
    end
  end

  ENG->>ENG: close open positions at last price,<br/>higher capital wins, equal is a draw
  ENG->>DB: match_players final_capital + result,<br/>matches status completed + winner
  ENG-->>P1: match:ended
  ENG-->>P2: match:ended
```

**Notes:**

- The candles are **replayed history**, not a live feed. The engine grabs past 1-minute candles from Coinbase and sends one every 500 ms. It only uses the live ticker price if the candles fail to load.
- If a player refreshes the page, the browser reloads the snapshot (candles, trades, positions) from Supabase and then rejoins the socket room. The engine keeps a finished match in memory for 60 s so a reconnecting player still gets the result. After that, the result comes from the database.
- Opponents never see each other's trades, only each other's capital (`match:capitals`).

## 3. Monitoring pipeline

```mermaid
flowchart LR
  WEB["web<br/>instrumentation.ts"] -->|"OTLP HTTP /v1/metrics"| OTEL
  SOCK["match engine<br/>socket/metrics.js"] -->|"OTLP HTTP /v1/metrics"| OTEL
  OTEL["otel-collector<br/>receives on 4318"] -->|"exposes Prometheus format on 8889"| PROM
  SUPA["Supabase metrics endpoint"] -->|"scraped every 60s"| PROM
  PROM[("prometheus :9090<br/>stores time series")] --> GRAF["grafana :3001<br/>dashboard + alert rules"]
  GRAF -->|"email via Gmail SMTP"| MAIL["Team inbox"]
```

**Game metrics** sent by the engine (`socket/metrics.js`):

| Metric | Meaning |
| --- | --- |
| `transcendence_games_started_total` | matches that reached the trading phase |
| `transcendence_games_completed_total` | matches that finished |
| `transcendence_matches_played_total` | matches played |
| `transcendence_active_games` | matches running right now |

**Grafana alert rules** (`monitoring/grafana/provisioning/alerting/rules.yaml`):

| Alert | Watches |
| --- | --- |
| Database is down | `up{job="supabase"}` |
| OTel collector not reachable | `up{job="otel-collector"}` |
| Active game stuck | `transcendence_active_games` |
