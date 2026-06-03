# Trading Game User Flow And Pages

## Project Summary

This project is a two-player competitive trading game.

Users sign up, log in, join or create trading rooms, and compete in short simulated BTC/USDT matches. Both players see the same live chart stream. Each player starts with the same virtual capital and places market orders by choosing either a long or short position with an amount. The server calculates balances, active positions, profit and loss, and final results. When the match ends, any open position is automatically closed, and the player with the highest capital wins.

The product should feel like a simple trading terminal mixed with a competitive game lobby. The UI should be clear, fast, and focused on joining games, trading during a match, and reviewing results.

## Primary Navigation

After login, the app should use a persistent sidebar or app shell for authenticated pages.

Recommended sidebar items:

- `Home`
- `Games`
- `History`
- `Profile`
- `Settings`
- `Logout`

For MVP, `Home` and `Games` can be the same route if needed. The important thing is that users can easily move between open games, active games, match history, and their profile.

## High-Level User Flow

1. User opens the app.
2. User logs in or registers on the same authentication page.
3. After login, user lands on the authenticated home page.
4. User sees available game rooms.
5. User toggles between `Open Games` and `Active Games`.
6. User can create a room or join an open room.
7. If user creates a room, they are automatically placed inside that room.
8. If user joins an open room, they enter the game room directly.
9. Once two players are present, a countdown begins.
10. When countdown ends, the trading match starts.
11. User sees a TradingView-style chart, current price, timer, balance, and order controls.
12. User enters an amount and clicks `Buy Long` or `Buy Short`.
13. All orders are market orders using the current server price.
14. At match end, server closes any open positions and shows the result.
15. User can view match details in history, including both users' trades.
16. User can view their profile stats, games played, wins, losses, and win percentage.

## Pages Needed

### 1. Login And Register Page

Route suggestion: `/login`

#### Purpose

Let users either log in or create an account from one page.

#### Required Content

- App name or logo.
- Short product description.
- Email input.
- Password input.
- Primary button that changes based on selected mode:
  - `Login`
  - `Create Account`
- Toggle between login and register modes.
- Error state for invalid credentials or failed sign up.
- Loading state while submitting.

#### Design Notes

- Login and registration should not be separate pages.
- Keep the page simple and direct.
- User should understand this is a competitive trading game before signing in.

### 2. Authenticated App Shell

Used across authenticated pages.

#### Purpose

Provide consistent navigation after login.

#### Required Content

- Sidebar navigation.
- User identity area with username or email.
- Logout action.
- Main content area.
- Responsive mobile navigation, likely bottom nav or drawer.

#### Sidebar Items

- Home
- Games
- History
- Profile
- Settings

#### Design Notes

- The app should feel more like a trading dashboard than a marketing site.
- Prioritize fast scanning and clear game state.
- Avoid large promotional hero sections after login.

### 3. Home / Games Lobby Page

Route suggestion: `/games` or `/lobby`

#### Purpose

Let users discover, create, and join games.

#### Required Content

- Page title: `Games` or `Lobby`.
- Toggle or tabs:
  - `Open Games`
  - `Active Games`
- `Create Room` button.
- List of open rooms.
- List of active games.
- Empty states for no open or active games.
- Refresh or realtime update indicator.

#### Open Games Tab

Shows rooms waiting for a second player.

Each room card or row should show:

- Room name or room id.
- Creator username.
- Number of players, for example `1/2`.
- Created time.
- Match settings if available:
  - symbol, for example `BTC/USDT`
  - match duration
  - starting capital
- `Join` button.

#### Active Games Tab

Shows games already in countdown or live state.

Each active game card or row should show:

- Players.
- Status:
  - `Countdown`
  - `Live`
  - `Ending Soon`
- Time remaining.
- Symbol.
- Spectate action only if spectator mode is added later. MVP can omit this.

#### Create Room Flow

When user clicks `Create Room`:

1. Server creates a waiting room.
2. User is automatically joined as player one.
3. User is redirected to the room page.

#### Design Notes

- This is the main hub of the app.
- It should be easy to spot which games can be joined immediately.
- `Open Games` should be the default tab.

### 4. Waiting Room / Countdown Page

Route suggestion: `/rooms/[roomId]`

#### Purpose

Show room state before the match starts.

#### Required Content

- Room title or id.
- Player one slot.
- Player two slot.
- Current room status:
  - `Waiting for opponent`
  - `Opponent joined`
  - `Match starting soon`
- Countdown timer once both players have joined.
- Match settings:
  - symbol
  - starting capital
  - match duration
- Leave room action before match starts.

#### Waiting State

If only one player is present:

- Show the joined player.
- Show an empty second player slot.
- Show text such as `Waiting for another player`.

#### Countdown State

When the second player joins:

- Show both players.
- Show countdown timer.
- Disable joining by other users.
- Prepare users for automatic transition to match page.

#### Design Notes

- This page should feel like a pre-match lobby.
- Keep the countdown visually clear.
- Once match starts, user should automatically move to the trading screen.

### 5. Live Trading Match Page

Route suggestion: `/matches/[matchId]`

#### Purpose

This is the core game screen where users trade against each other.

#### Required Content

- TradingView-style chart area.
- Current BTC/USDT price.
- Match timer.
- User balance.
- Active position summary.
- Opponent summary.
- Order controls.
- Trade status feedback.
- Match status indicator.

#### Main Layout

Recommended desktop layout:

- Top bar:
  - players
  - match timer
  - current price
  - match status
- Main center area:
  - chart
- Bottom or side trade panel:
  - long order form
  - short order form
  - balance and position summary

Recommended mobile layout:

- Top compact match status.
- Chart first.
- Sticky trade controls below the chart.
- Balance and active position in compact cards.

#### Chart Area

Use a TradingView-style candlestick chart.

The chart should show:

- BTC/USDT candles.
- Current price line.
- User trade markers.
- Final result marker after game ends if useful.

For MVP, the chart does not need full TradingView exchange connectivity. It only needs to display the server-streamed match data.

#### Order Controls

All orders are market orders.

Required controls:

- Amount input for long.
- `Buy Long` button.
- Amount input for short.
- `Buy Short` button.

Alternative compact design:

- One shared amount input.
- Two primary buttons:
  - `Buy Long`
  - `Buy Short`

Server uses the current price at the time of order submission.

#### Active Position Summary

Show if the user has an open position:

- Position side:
  - Long
  - Short
- Entry price.
- Position amount.
- Unrealized PnL.
- Current estimated capital.
- Optional `Close Position` button if MVP allows manual close.

If there is no active position:

- Show available balance.
- Show simple empty state such as `No active position`.

#### Opponent Summary

Show:

- Opponent username.
- Opponent current capital or public score.
- Optional opponent position state.

MVP recommendation:

- Show opponent capital.
- Hide opponent trade details during live match.
- Reveal both users' trades after the match in history.

#### Trade Feedback States

Show clear feedback for:

- Order submitted.
- Order accepted.
- Order rejected.
- Insufficient balance.
- Match not active.
- Position already open, if only one position is allowed.

#### End Of Match State

When match ends:

- Disable order buttons.
- Show final capital.
- Show winner.
- Show `View Match Summary`.
- Show `Back To Games`.

#### Design Notes

- The chart should dominate the screen.
- Trade buttons must be obvious and hard to confuse.
- Long and short actions should be visually distinct.
- Avoid hiding critical balance or timer information.

### 6. Match Result Page

Route suggestion: `/matches/[matchId]/result`

This can also be a modal or end state inside the live match page.

#### Purpose

Show who won immediately after the game finishes.

#### Required Content

- Winner.
- Final capital for both players.
- Starting capital.
- Net PnL for both players.
- Match duration.
- Final BTC/USDT price.
- Actions:
  - `View Details`
  - `Play Again`
  - `Back To Games`

#### Design Notes

- This should feel rewarding and clear.
- Make the winner obvious.
- Do not require users to inspect the chart to understand the result.

### 7. Match History Page

Route suggestion: `/history`

#### Purpose

Let users review their completed games.

#### Required Content

- List of completed matches.
- Filters or tabs:
  - All
  - Wins
  - Losses
  - Draws
- Each match row/card should show:
  - opponent
  - result
  - final capital
  - net PnL
  - match date
  - symbol
  - duration
- Link to match detail page.

#### Design Notes

- History should be easy to scan.
- Result should be visually clear with win/loss/draw indicators.

### 8. Match History Detail Page

Route suggestion: `/history/[matchId]`

#### Purpose

Show the full completed match with chart data and both players' trades.

#### Required Content

- Match summary:
  - players
  - winner
  - final capital
  - start time
  - end time
  - duration
- Historical chart.
- Both players' trade markers.
- Trade table.
- Final position liquidation details.

#### Trade Table Columns

- Player.
- Side.
- Amount.
- Entry price.
- Exit price.
- PnL.
- Opened time.
- Closed time.
- Status:
  - closed
  - liquidated

#### Design Notes

- This page is for learning and replaying decisions.
- Both users' trades should be visible here, even if hidden during live match.

### 9. Profile Page

Route suggestion: `/profile`

#### Purpose

Show user stats and basic account information.

#### Required Content

- Username or email.
- Games played.
- Wins.
- Losses.
- Draws.
- Win percentage.
- Optional:
  - best final capital
  - total PnL
  - current streak
  - recent matches

#### Design Notes

- Stats should be compact and clear.
- This page does not need deep settings for MVP.

### 10. Settings Page

Route suggestion: `/settings`

#### Purpose

Allow basic account settings.

#### Required Content For MVP

- User email.
- Username display/edit if profiles support it.
- Logout button.

#### Later Options

- Avatar.
- Notification preferences.
- Theme preference.
- Delete account.

## Key Game States Designers Should Account For

- Logged out.
- Loading session.
- No open games.
- Open games available.
- Room waiting for opponent.
- Room countdown.
- Match loading.
- Match live.
- Order submitting.
- Order rejected.
- Position open.
- Match ending soon.
- Match completed.
- History empty.
- Profile stats empty for new users.

## MVP Page Checklist

- [ ] Login/Register page.
- [ ] Authenticated app shell with sidebar.
- [ ] Home/Games lobby page.
- [ ] Waiting room/countdown page.
- [ ] Live trading match page.
- [ ] Match result state or page.
- [ ] Match history page.
- [ ] Match history detail page.
- [ ] Profile page.
- [ ] Settings page.

## Designer Notes

- The visual direction should combine a game lobby with a trading terminal.
- The most important screen is the live trading match page.
- The second most important screen is the games lobby.
- Users should always know:
  - whether they are waiting, counting down, live, or finished
  - their current balance
  - the current price
  - how much time remains
  - what action they can take next
- Keep order placement simple: amount plus long or short market action.
- Avoid advanced trading concepts in MVP UI unless they are actually implemented.
