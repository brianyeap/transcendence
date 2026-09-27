# How friends work

Two pieces make up the friends feature:

- **`friends` table**: stores the friend requests and friendships (one row per pair of players).
- **`friends_with_status` view**: a saved query over `friends` + `profiles`. It stores no data of its own; the friends page reads from it so it gets everything in one call.

SQL: [`supabase/migrations/0002_friend_requests.sql`](../supabase/migrations/0002_friend_requests.sql)

## 1. Friend requests

The boxes are what the row looks like; the arrows are the buttons that change it.

```mermaid
flowchart LR
    A[No row] -->|Alice: Add friend<br/>INSERT| B[Row: pending]
    B -->|Bob: Accept<br/>accept_friend_request| C[Row: accepted<br/>= friends]
    B -->|Bob: Decline<br/>or Alice: Cancel<br/>remove_friend| A
    C -->|Later, either: Remove friend<br/>remove_friend| A
```

- `user_id` is the person who sent the request, and `friend_id` is the person who was asked.
- **Sending:** the insert policy only lets you send as yourself, never to yourself, and only as `pending`. There are two ways to send: the "Add friend" button on the match result screen, or typing an exact (case-sensitive) username at the top of the friends page.
- **Accepting:** there is no update policy, so the only way to accept is the `accept_friend_request` function, and it only accepts requests sent *to* you.
- **Removing:** decline, cancel and unfriend all mean "delete the row between us", so they share `remove_friend`.
- **Only one row per pair:** the `friends_one_row_per_pair` unique index stops Alice→Bob and Bob→Alice from both existing.

## 2. Online status

There is no "online" column. Each open tab keeps updating a timestamp, and the friends page checks how old that timestamp is.

```mermaid
sequenceDiagram
    participant BobTab as Bob's browser<br/>(useOnlinePing)
    participant DB as Supabase DB
    participant AliceTab as Alice's browser<br/>(friends page)

    Note over BobTab: Runs on SideNav & match screen
    loop every 5s (skipped if tab hidden)
        BobTab->>DB: rpc ping_online()
        DB->>DB: UPDATE profiles<br/>SET last_seen_at = now()<br/>WHERE id = Bob
    end

    loop every 5s (skipped if tab hidden)
        AliceTab->>DB: SELECT * FROM friends_with_status
        Note over DB: View runs its saved query:<br/>1. friends rows Alice is in (RLS)<br/>2. pick "other person" = Bob<br/>3. join profiles → username, avatar<br/>4. seconds_since_seen = now() - last_seen_at<br/>5. sent_by_me
        DB-->>AliceTab: {Bob, avatar, seconds_since_seen: 3,<br/>status: accepted, sent_by_me: true}
    end

    Note over AliceTab: seconds_since_seen < 10 → "Online now"<br/>null → "Never seen online"<br/>otherwise → "Last online 5m ago"
```

- The ping code is in [`app/components/duel/use-online-ping.ts`](../app/components/duel/use-online-ping.ts), and the 10-second online window is `ONLINE_WINDOW_SECONDS` in [`app/friends/page.tsx`](../app/friends/page.tsx).
- **Going offline needs no signal.** When the tab closes or is hidden, the pings stop, and after about 10 seconds the player shows as offline.
- The view uses `security_invoker = true`, so the `friends` read policy still applies: you only ever see rows you are part of.
