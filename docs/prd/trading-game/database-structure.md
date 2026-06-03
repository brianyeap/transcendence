# Trading Game Database Structure

Use this DBML with dbdiagram.io or another DBML-compatible database diagram tool.

```dbml
// Use DBML to define your database structure
// Docs: https://dbml.dbdiagram.io/docs

Table auth.users {
  id uuid [pk]

  Note: "Supabase Auth-owned table. Included only to show app table references."
}

Enum room_status {
  waiting
  countdown
  active
  completed
  cancelled
}

Enum match_status {
  scheduled
  active
  completed
  cancelled
}

Enum position_side {
  long
  short
  flat
}

Enum trade_side {
  long
  short
}

Enum match_result {
  win
  loss
  draw
}

Table profiles {
  id uuid [pk, ref: > auth.users.id]
  username text [not null]
  created_at timestamp [not null]
}

Table rooms {
  id uuid [pk]
  created_by uuid [not null, ref: > auth.users.id]
  player_one_user_id uuid [not null, ref: > auth.users.id]
  player_two_user_id uuid [ref: > auth.users.id]
  player_one_joined_at timestamp [not null]
  player_two_joined_at timestamp
  status room_status [not null]
  starts_at timestamp
  ends_at timestamp
  created_at timestamp [not null]

  indexes {
    status
    created_by
    player_one_user_id
    player_two_user_id
  }
}

Table matches {
  id uuid [pk]
  room_id uuid [not null, ref: > rooms.id]
  status match_status [not null]
  symbol text [not null, default: 'BTCUSDT']
  starting_capital numeric [not null]
  starts_at timestamp [not null]
  ends_at timestamp [not null]
  final_price numeric
  winner_user_id uuid [ref: > auth.users.id]
  created_at timestamp [not null]
  completed_at timestamp

  indexes {
    room_id
    status
    winner_user_id
    (starts_at, ends_at)
  }
}

Table match_players {
  id uuid [pk]
  match_id uuid [not null, ref: > matches.id]
  user_id uuid [not null, ref: > auth.users.id]
  starting_capital numeric [not null]
  available_balance numeric [not null]
  reserved_balance numeric [not null]
  realized_pnl numeric [not null]
  net_side position_side [not null]
  net_amount numeric [not null]
  final_capital numeric
  result match_result

  indexes {
    (match_id, user_id) [unique]
    match_id
    user_id
    result
  }
}

Table match_candles {
  id uuid [pk]
  match_id uuid [not null, ref: > matches.id]
  sequence integer [not null]
  open_time timestamp [not null]
  open numeric [not null]
  high numeric [not null]
  low numeric [not null]
  close numeric [not null]
  volume numeric [not null]

  indexes {
    (match_id, sequence) [unique]
    (match_id, open_time)
  }
}

Table trades {
  id uuid [pk]
  match_id uuid [not null, ref: > matches.id]
  user_id uuid [not null, ref: > auth.users.id]
  side trade_side [not null]
  amount numeric [not null]
  entry_price numeric [not null]
  realized_pnl numeric
  resulting_net_side position_side [not null]
  resulting_net_amount numeric [not null]
  executed_at timestamp [not null]

  indexes {
    match_id
    user_id
    (match_id, user_id)
    executed_at
  }
}

```

## Notes

- Supabase Auth owns `auth.users`; application tables store compatible `uuid` user ids.
- Money-like, price, balance, and PnL fields use `numeric` to avoid JavaScript floating-point drift.
- `match_players` stores the current net exposure for each player in a match.
- `trades` is an execution ledger. It does not store `exit_price` or `closed_at`; opposite-side trades reduce or flip net exposure.
