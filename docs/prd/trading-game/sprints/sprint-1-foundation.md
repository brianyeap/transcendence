# Sprint 1 - Foundation

## Objective

Complete Milestone 1: Foundation for the two-player trading game.

By the end of this sprint, the project should have authentication, database foundations, protected routes, and profile creation ready so the room and realtime work can build on stable user identity.

## Sprint Scope

- Configure Supabase project integration.
- Add Supabase client setup for browser and server usage.
- Implement sign up, login, logout, and session handling.
- Create the initial database schema for users and game foundation tables.
- Add Row Level Security policies for safe user access.
- Add protected routes for authenticated app areas.
- Create or upsert a user profile after sign up.

## Tasks

- [ ] Create Supabase project and collect environment variables.
- [ ] Add `.env.local` keys for Supabase URL and anon key.
- [ ] Install Supabase packages.
- [ ] Create Supabase browser client helper.
- [ ] Create Supabase server client helper.
- [ ] Build login and sign up UI.
- [ ] Add logout flow.
- [ ] Add route protection for lobby, rooms, matches, history, and profile.
- [ ] Create `profiles` table.
- [ ] Create initial `rooms`, `room_players`, `matches`, `match_players`, `match_candles`, and `trades` tables.
- [ ] Enable RLS on all app tables.
- [ ] Add RLS policies for profile read/update access.
- [ ] Add RLS policies preventing direct client edits to server-owned match state.
- [ ] Add profile creation after successful sign up.
- [ ] Verify a new user can sign up, log in, access protected pages, and get a profile row.

## Member Status Board

Notion board: [Sprint 1 - Member Status](https://www.notion.so/3741b7df09424b1d8ced06d7ce4f2876)

Members should update:

- `Member`: person or role responsible.
- `Status`: `Not Started`, `Working`, `Blocked`, `Review`, or `Done`.
- `Current Work`: short description of the active task.
- `Blockers`: what is preventing progress, if anything.
- `Last Updated`: date of the latest update.
- `Notes`: extra context, handoff details, or links.

## Acceptance Criteria

- New users can sign up with Supabase Auth.
- Existing users can log in and log out.
- Unauthenticated users cannot access protected app routes.
- Authenticated users can access the future lobby route.
- A profile row exists for every signed-up user.
- Core database tables exist with appropriate relationships.
- RLS is enabled and users cannot directly modify balances, trades, or match results.
- Environment setup is documented for local development.

## Out Of Scope

- Room creation and joining.
- Socket.IO setup.
- Market data fetching.
- Live match engine.
- Trading UI and PnL computation.
- Match history screens.

## Notes

- Before implementing Next.js code, read the relevant local docs in `node_modules/next/dist/docs/` because this project uses Next.js 16.2.7.
- Keep gameplay state server-authoritative from the start.
- Prefer database numeric types for money-like values to avoid floating-point drift.
