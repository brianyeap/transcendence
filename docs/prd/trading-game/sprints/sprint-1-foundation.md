# Sprint 1 - Foundation

## Delivery Status

**Delivered:** Frontend foundation delivered on June 3, 2026.

This sprint delivered the initial trading game frontend experience and authentication screens. The current implementation establishes the product direction, app shell, lobby UI, reusable duel components, and a client-side login/register flow that can be connected to Supabase in the next backend pass.

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

- [x] Build login and sign up UI.
- [x] Add client-side login/register form validation and loading state.
- [x] Add post-submit navigation into the app lobby.
- [x] Build the main trading lobby screen.
- [x] Build reusable duel UI components for active games, rooms, avatars, logo, icons, formatting, and shared types.
- [x] Add the app shell and side navigation for the trading experience.
- [x] Add mock lobby/game data so the frontend can be reviewed before realtime backend integration.
- [x] Update global styling and app layout for the trading game theme.
- [x] Add `lucide-react` for UI icons.
- [ ] Create Supabase project and collect environment variables.
- [ ] Add `.env.local` keys for Supabase URL and anon key.
- [ ] Install Supabase packages.
- [ ] Create Supabase browser client helper.
- [ ] Create Supabase server client helper.
- [ ] Add logout flow backed by auth state.
- [ ] Add route protection for lobby, rooms, matches, history, and profile.
- [ ] Create `profiles` table.
- [ ] Create initial `rooms`, `room_players`, `matches`, `match_players`, `match_candles`, and `trades` tables.
- [ ] Enable RLS on all app tables.
- [ ] Add RLS policies for profile read/update access.
- [ ] Add RLS policies preventing direct client edits to server-owned match state.
- [ ] Add profile creation after successful sign up.
- [ ] Verify a new user can sign up, log in, access protected pages, and get a profile row.

## Delivered Work

- Implemented the first version of the trading game lobby at `app/page.tsx`.
- Added a responsive login/register page at `app/login/page.tsx`.
- Created reusable duel components under `app/components/duel/`:
  - `side-nav.tsx`
  - `lobby-screen.tsx`
  - `room-card.tsx`
  - `active-game-row.tsx`
  - `avatar.tsx`
  - `duel-icon.tsx`
  - `logo.tsx`
  - `format.ts`
  - `types.ts`
  - `data.ts`
- Added placeholder data for open rooms and active matches to support frontend review.
- Updated the global visual system in `app/globals.css`.
- Updated the root app layout in `app/layout.tsx`.
- Installed `lucide-react` for consistent icon usage.

## Delivery Notes

- Commit delivered: `786a9eb` - `feat: add initial implementation of trading game components and user authentication`.
- The current authentication screen is frontend-only and uses client-side validation plus mock navigation.
- Supabase Auth, database schema, RLS policies, protected routes, profile creation, and real logout are still pending backend integration.
- Sprint 1 frontend work is ready for review and can be connected to the backend foundation in the next implementation pass.

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
