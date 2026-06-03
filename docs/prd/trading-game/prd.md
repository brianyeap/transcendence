# Two-Player Trading Game PRD

## 1. Overview

Build a real-time competitive trading game where two players trade a simulated BTC/USDT market over a fixed match window. Each player starts with the same virtual capital. Players submit long or short market orders during the match. At the end of the match, the server settles any remaining open exposure and the player with the highest final capital wins.

The application will use Supabase for authentication and Postgres database storage, Prisma for server-side database access and migrations, Next.js for the frontend and backend routes, and Socket.IO for countdown, chart, and trade updates.

## 2. Goals

- Let users sign up, log in, and maintain a game profile.
- Let users create and join two-player rooms.
- Automatically join a room creator into their created room.
- Show available rooms to authenticated users with simple polling.
- Start a countdown once the second player joins.
- Fetch and store enough BTC/USDT one-minute chart data to cover the full match before the match starts.
- Stream stored chart data to both players during the match.
- Let players submit long and short market orders using virtual capital.
- Compute balances, positions, PnL, final settlement, and winner server-side.
- Store completed match history, chart data, and trades.
- Show each user's games played and win percentage.
- Use Prisma to model the relational game data, generate a type-safe database client, and keep database migrations versioned with the application code.

## 3. Non-Goals For MVP

- Real-money trading or deposits.
- Leverage, margin calls, funding rates, fees, stop-loss, take-profit, or order books.
- More than two players per room.
- Tournaments, matchmaking ranks, or seasons.
- Native mobile apps.
- Live exchange execution.
- Complex anti-cheat beyond server-authoritative state.

## 4. Target Users

- Users who want a quick competitive trading game.
- Beginner traders who want to practice direction and position sizing.
- Friends who want to compete in short simulated market battles.

## 5. Core User Flow

1. User signs up or logs in with Supabase Auth.
2. User lands on the lobby.
3. User creates a room or joins an existing open room.
4. Room creator is automatically added as player one.
5. Second user joins as player two.
6. Server sets `starts_at` and `ends_at` timestamps.
7. Countdown begins for both players.
8. During countdown, backend fetches recent BTC/USDT one-minute candle data for the configured match duration and stores the match dataset.
9. Match starts when server time reaches `starts_at`.
10. Backend streams candle ticks to both players through Socket.IO.
11. Players view the chart and current price.
12. Players submit long or short market orders with an amount.
13. Server validates orders, nets them against the player's current position, updates balances, and emits state updates.
14. Match ends when server time reaches `ends_at`.
15. Server settles remaining open exposure at final price.
16. Server calculates final capital and winner.
17. Users can view match history, both players' trades, and profile stats.

## 6. Gameplay Rules

### Starting State

- Each player starts with the same virtual capital, for example `10000 USDT`.
- Each match has exactly two players.
- Match duration should be configurable, for example `60`, `180`, or `300` seconds.
- Countdown duration should be configurable, for example `10` seconds.

### Trading

- Player can submit a long or short market order.
- Player enters an amount in USDT.
- Server uses the current streamed price as the entry price.
- Server rejects orders if:
  - Match is not active.
  - User is not part of the match.
  - Amount is invalid.
  - The net new exposure after offsetting the opposite side exceeds available balance.

### Position Model For MVP

MVP recommendation: one net position per user per match, represented by a trade ledger plus the current net exposure on `match_players`.

- Each trade record is an entry execution only. Trades do not store `exit_price` or `closed_at`.
- Entry prices stay on individual `trades`; `match_players` stores only balance totals and current net exposure.
- Users do not send a separate close action. They close or reduce exposure by submitting an opposite-side market order.
- Opposite-side orders first offset existing exposure. Any remaining amount opens exposure in the new direction.
- Example: if a player is short `50 USDT`, submitting a `50 USDT` long order fully offsets the short and leaves no open exposure.
- Market sell/short orders can be submitted for any valid amount. If the player is currently long, the order first reduces the long position, then opens a short for any remaining amount.
- Opening net new exposure reserves the submitted amount from available balance.
- Offsetting exposure releases the offset reserved amount and realizes PnL into available balance.
- `available_balance` is the player's unreserved capital that can be used for new net exposure.
- `reserved_balance` is the player's capital currently backing open net exposure.
- PnL formulas:
  - Long offset/settlement: `offset_amount * ((current_price - entry_price) / entry_price)`
  - Short offset/settlement: `offset_amount * ((entry_price - current_price) / entry_price)`
  - Released capital on offset/settlement: `offset_amount + pnl`

### End Of Match

- `matches.final_price` is the last server-streamed price used to settle remaining open exposure when the match ends.
- Server settles all remaining open exposure at `matches.final_price`.
- Server calculates each player's final capital.
- Winner is the player with the highest final capital.
- Draw is possible if final capital is equal.

## 7. Feature Requirements

### Authentication

- Use Supabase Auth for sign up, login, logout, and session management.
- Only authenticated users can access lobby, room, game, profile, and history pages.
- Store public profile information in a `profiles` table linked to Supabase Auth user id.

### Lobby

- Show list of rooms with status `waiting`.
- Refresh the room list by polling every `5 seconds`; Socket.IO room-list broadcasting is not required for MVP.
- Let authenticated user create a room.
- On room creation, create the room and set the creator as player one in one server-side operation.
- Let user join an available room.
- Prevent a user from joining the same room twice.
- Prevent more than two players from joining a room.

### Room And Countdown

- When the second player joins, server changes room status to `countdown`.
- Server sets `starts_at` and `ends_at`.
- Clients display countdown based on server timestamps.
- If a player disconnects during countdown, MVP can keep the room active and allow reconnect.

### Market Data

- Use BTC/USDT one-minute candle data.
- During countdown, backend fetches the required candle dataset for the full match duration and stores it.
- Stored data becomes the source of truth for the match.
- Streaming should replay stored market data according to server time.
- MVP data source recommendation: Binance public klines API or another crypto market data provider.

### Chart

- Use TradingView charting UI on the frontend.
- MVP recommendation: use `lightweight-charts` for rendering stored OHLC candle data.
- Show current price clearly.
- Show trade markers for the current user during live match.
- In history view, show both users' trade markers.

### Real-Time Updates

- Use Socket.IO for:
  - room membership updates
  - countdown events
  - match start/end events
  - price/candle ticks
  - order confirmations/rejections
  - balance and position updates
- Server remains authoritative for all game state.
- Client must never calculate final balances as source of truth.

### Trading Actions

- User can choose `long` or `short`.
- User can enter amount.
- Server validates and records each market order as a trade entry.
- Server nets opposite-side orders against the player's current exposure.
- Server broadcasts updated player state to that player's client.
- Opponent may see public trade events depending on game design. MVP recommendation: show opponent trade markers after match, not during live match, to avoid copying behavior.

### Match History

- Store completed matches.
- Store match candles.
- Store all trades.
- History page shows:
  - players
  - winner
  - start/end time
  - final capital for both users
  - chart replay or static chart
  - both users' trade entries

### User Stats

- Show games played.
- Show wins, losses, draws.
- Show win percentage.
- Optional later: average return, best match, current streak.

## 8. Technical Stack

### Current Project

- Next.js `16.2.7`
- React `19.2.4`
- TypeScript
- Tailwind CSS `4`
- ESLint

Before implementing code, read the relevant local Next.js guide in `node_modules/next/dist/docs/` because this project uses a newer Next.js version with breaking API and convention changes.

### Planned Additions

- Supabase Auth
- Supabase Postgres database
- Prisma ORM and Prisma Migrate for server-side Postgres access
- Supabase Row Level Security policies
- Socket.IO server and client
- TradingView Lightweight Charts
- Market data provider client, likely Binance public API for BTC/USDT klines

### Recommended Runtime Shape

Socket.IO needs a long-running Node.js server. If the chosen deployment platform does not support custom WebSocket servers inside Next.js routes, use a separate realtime server process.

Recommended MVP architecture:

- Next.js app: UI, authenticated pages, server actions/API routes.
- Supabase: auth, database, persisted match state.
- Prisma: server-only database client, schema definition, and migration workflow for app tables.
- Socket.IO Node server: realtime room and match engine.
- Market data service module: fetches and normalizes candles.

Prisma should be used only from trusted server contexts such as Next.js server actions/API routes and the Socket.IO Node server. Browser clients should continue to use Supabase Auth/session APIs only and must not receive direct Prisma access.

## 9. Data Model Draft

The tables below should be represented in `prisma/schema.prisma` and mapped to Supabase Postgres tables. Prisma migrations should manage application-owned tables, enums, indexes, and relations. Supabase Auth-owned tables remain managed by Supabase; app tables should reference Supabase auth user ids with compatible `uuid` fields.

Money-like and price fields must use decimal-safe Prisma/Postgres types, for example Prisma `Decimal` mapped to Postgres `numeric`, rather than JavaScript floating-point numbers.

### `profiles`

- `id`: uuid, references auth user id
- `username`: text
- `created_at`: timestamp

### `rooms`

- `id`: uuid
- `created_by`: uuid
- `player_one_user_id`: uuid
- `player_two_user_id`: uuid, nullable
- `player_one_joined_at`: timestamp
- `player_two_joined_at`: timestamp, nullable
- `status`: enum, `waiting`, `countdown`, `active`, `completed`, `cancelled`
- `starts_at`: timestamp, nullable
- `ends_at`: timestamp, nullable
- `created_at`: timestamp

### `matches`

- `id`: uuid
- `room_id`: uuid
- `status`: enum, `scheduled`, `active`, `completed`, `cancelled`
- `symbol`: text, default `BTCUSDT`
- `starting_capital`: numeric
- `starts_at`: timestamp
- `ends_at`: timestamp
- `final_price`: numeric, nullable
- `winner_user_id`: uuid, nullable
- `created_at`: timestamp
- `completed_at`: timestamp, nullable

### `match_players`

- `id`: uuid
- `match_id`: uuid
- `user_id`: uuid
- `starting_capital`: numeric
- `available_balance`: numeric
- `reserved_balance`: numeric
- `realized_pnl`: numeric
- `net_side`: enum, `long`, `short`, `flat`
- `net_amount`: numeric
- `final_capital`: numeric, nullable
- `result`: enum, `win`, `loss`, `draw`, nullable

### `match_candles`

- `id`: uuid
- `match_id`: uuid
- `sequence`: integer
- `open_time`: timestamp
- `open`: numeric
- `high`: numeric
- `low`: numeric
- `close`: numeric
- `volume`: numeric

### `trades`

- `id`: uuid
- `match_id`: uuid
- `user_id`: uuid
- `side`: enum, `long`, `short`
- `amount`: numeric
- `entry_price`: numeric
- `realized_pnl`: numeric, nullable
- `resulting_net_side`: enum, `long`, `short`, `flat`
- `resulting_net_amount`: numeric
- `executed_at`: timestamp

## 10. Socket Events Draft

### Client To Server

- `room:create`
- `room:join`
- `room:leave`
- `match:subscribe`
- `trade:submit`

### Server To Client

- `room:updated`
- `match:countdown`
- `match:started`
- `match:tick`
- `trade:accepted`
- `trade:rejected`
- `player:state`
- `match:ended`
- `error`

## 11. Pages And UI

- `/login`: sign in and sign up.
- `/lobby`: create room and join waiting rooms.
- `/rooms/[roomId]`: waiting room and countdown.
- `/matches/[matchId]`: live match screen with chart, price, position controls, balance, and timer.
- `/history`: completed matches for current user.
- `/history/[matchId]`: match replay/details with chart and trades.
- `/profile`: user stats and account details.

## 12. MVP Milestones

### Milestone 1: Foundation

- Configure Supabase client and auth flow.
- Add Prisma configuration, schema, generated client, and migration workflow.
- Create database schema and RLS policies.
- Add protected app routes.
- Add profile creation after sign up.

### Milestone 2: Rooms

- Create lobby UI.
- Create room API/server action.
- Auto-join creator.
- Join room flow.
- Poll waiting rooms every `5 seconds`.

### Milestone 3: Match Engine

- Create match when second player joins.
- Set countdown, start, and end timestamps.
- Fetch and store BTC/USDT candles.
- Stream candle ticks to subscribed clients.

### Milestone 4: Trading

- Add long/short order form.
- Validate orders server-side.
- Net opposite-side market orders against current exposure.
- Track net positions and balances.
- Emit player state updates.

### Milestone 5: Results And History

- Settle remaining exposure at final price.
- Determine winner.
- Store final match state.
- Build history and profile stats pages.

## 13. Open Decisions

- Exact match duration.
- Exact countdown duration.
- Whether opponent trades are visible live or only after match.
- Market data provider and rate limit strategy.
- Deployment approach for Socket.IO server.
- Whether Prisma migrations or Supabase SQL migrations will be the primary source of truth for application table changes.

## 14. Recommended MVP Decisions

- Match duration: `180 seconds`.
- Countdown duration: `10 seconds`.
- Starting capital: `10000 USDT`.
- Lobby room list polling interval: `5 seconds`.
- One net position per player, updated from trade entries.
- No manual close action; opposite-side market orders reduce or flip exposure.
- Opponent trades hidden during live match, visible after completion.
- Socket.IO for realtime gameplay updates.
- Supabase database as persistence layer, not primary realtime engine.
- Prisma as the primary server-side data access layer for application tables.
- Prisma Migrate as the primary migration workflow for app-owned tables, with Supabase Auth and platform-managed objects left under Supabase control.
- Separate Node.js Socket.IO server if deployment target does not support WebSockets in Next.js runtime.

## 15. Risks

- Next.js deployment environments may not support Socket.IO cleanly without a custom server.
- Supabase RLS must be designed carefully so users cannot edit balances, trades, or match results directly.
- Prisma bypasses Supabase client-side RLS expectations when used with privileged database credentials, so all Prisma usage must stay server-side and enforce authorization in application logic.
- Prisma and Supabase migration ownership can drift if both are used to alter the same app tables; choose one migration source of truth for MVP.
- Market data provider limits may affect countdown data fetching.
- Server clocks and client countdown displays must be synchronized from server timestamps.
- Floating-point precision can create money calculation errors; use decimal-safe database numeric types and careful server calculations.

## 16. Success Metrics

- User can create an account and log in.
- User can create a room and another user can join.
- Match starts automatically after countdown.
- Both players receive the same streamed chart data.
- Trades are validated and computed by the server.
- Match ends automatically and declares the correct winner.
- Completed match history shows chart data and trades.
- Profile shows accurate games played and win percentage.
