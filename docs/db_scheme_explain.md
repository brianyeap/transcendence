I’ll inspect the project’s schemas and tables, and load Supabase’s PostgreSQL guidance so the explanation reflects the actual design and tradeoffs.
# Database Schema Review

This document summarizes the schema visible in the Supabase project and the likely reasons behind its structure. **“Optimal” depends on the product’s requirements**, so the design choices below are explained as reasonable tradeoffs rather than proven optimal decisions.

## Application data at a glance

The application tables are in `public` and appear to support a two-player trading-match experience:

```text
auth.users
   ├── public.profiles
   ├── public.friends ── public.profiles
   └── public.matches
          ├── public.match_players
          ├── public.match_candles
          └── public.trades
```

## Why the main tables are separated

- **`profiles` separates app-facing details from authentication.** Its `id` shares the UUID of an `auth.users` row, while username, avatar, and last-seen information live in the application schema. This keeps product profile data distinct from credentials and login state.
- **`matches` stores the match itself.** Status, timing, market symbol, starting capital, and outcome belong to the match rather than being repeated on every trade or candle.
- **`match_players` stores each participant’s match-specific state.** Balances, position, P&L, and result can differ for each player, so they fit naturally on a row representing a user’s participation in a match.
- **`trades` records individual actions.** Keeping executions as separate rows preserves a history of sides, amounts, prices, and resulting position data instead of overwriting the player’s latest state.
- **`match_candles` stores price-series data separately.** A match can have many candles, each with its own timestamp, sequence, and OHLC values. This avoids repeating market data in match or trade rows.
- **`friends` represents a user-to-user relationship.** Its composite primary key on `(user_id, friend_id)` makes the direction of a friendship request explicit and prevents duplicate rows for the same directed pair.

This is a fairly normalized design: match-level, player-level, trade-level, and candle-level facts are stored separately. That reduces repeated data and makes it easier to query each kind of record independently.

## Data types and constraints

Several choices support data integrity:

- **UUID identifiers** connect application records to Supabase Auth user IDs and are used for many application entities.
- **`numeric` values** are used for prices, capital, balances, and amounts. This is generally preferable to floating-point types for financial-style values where decimal precision matters.
- **Enums and checks** constrain fields such as match status, trade side, position side, and friendship status to known values.
- **Foreign keys** link application records to users, matches, and profiles, helping prevent orphaned references.
- **Timestamps** record creation and event times, which supports ordering and auditing.

These are sensible foundations for consistency. The schema listing does not establish whether every operational constraint or performance index needed by the application is present.

## Supabase-managed schemas

Schemas such as `auth`, `storage`, `realtime`, `vault`, and `extensions` are part of the Supabase/Postgres environment, not the application’s main domain model. Keeping product tables in `public` while Supabase services maintain their own schemas is a conventional separation of responsibilities. In general, application code should use the relevant Supabase APIs rather than treating internal service tables as ordinary application tables.

## Security and access choices to review

Row Level Security is enabled on the application tables, and policies provide access rules for profiles, matches, friends, trades, players, and candles. A few details are worth confirming against the intended privacy model:

- **Profiles & Presence:** an authenticated `read all profiles` policy allows authenticated users to read public profile details (`username`, `avatar_url`). Sensitive columns (`email`, `created_at`, `last_seen_at`) were removed from `public.profiles`:
  - `email` and account `created_at` are stored exclusively in `auth.users`, where only the user themselves can access them via `auth.getUser()`.
  - `last_seen_at` was moved to a separate `public.user_presence` table protected by RLS, allowing only accepted friends and the user themselves to see online activity. Non-friends cannot view presence timestamps.
- **Candles:** candles are restricted exclusively to participants of that match via the `read candles for my matches` policy. The previous broad `authenticated_users_can_read_match_candles` policy has been removed so non-participants cannot read or dump candle data for other players' matches.
- **Duplicate profile and player-read policies** appear to overlap. They may be harmless, but consolidating redundant policies can make access behavior easier to understand and maintain.
- **Participant representation:** `matches` has `player_one_user_id` and `player_two_user_id`, while `match_players` also records users participating in a match. This can be a practical choice for a fixed two-player design, but it creates two places whose participant data must stay consistent.
- **Trade ownership:** trades refer to both a match and a user. The schema listing does not show a constraint that verifies the user is actually a participant in that match; if that is a required invariant, enforce it through database constraints or trusted transactional logic.

## Overall assessment

The schema is **well-shaped for a match-based application**: it separates core entities, uses relational links, and models event history independently from current player state. Sensitive data such as emails, account creation dates, presence, and match candles are properly secured with scoped Row Level Security policies and isolated table designs.