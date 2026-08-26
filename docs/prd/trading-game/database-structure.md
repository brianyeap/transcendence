# Trading Game Database Structure

Use this DBML with dbdiagram.io or another DBML-compatible database diagram tool.

```dbml
// Use DBML to define your database structure
// Docs: https://dbml.dbdiagram.io/docs

Table auth.users {
  id uuid [pk]

  Note: "Supabase Auth-owned table. Included only to show app table references."
}

Enum match_status {
  waiting
  countdown
  active
  completed
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

Table profiles {
  id uuid [pk, ref: > auth.users.id]
  username text [not null, unique]
  email text [not null, unique]
  created_at timestamptz [not null]
}

Table matches {
  id uuid [pk]

  player_one_user_id uuid [not null, ref: > auth.users.id]
  player_two_user_id uuid [ref: > auth.users.id]

  status match_status [not null]

  symbol text [not null, default: 'BTCUSDT']
  starting_capital numeric [not null]

  countdown_starts_at timestamptz
  starts_at timestamptz
  ends_at timestamptz

  final_price numeric
  winner_user_id uuid [ref: > auth.users.id]

  created_at timestamptz [not null]

  indexes {
    status
    player_one_user_id
    player_two_user_id
    winner_user_id
    (starts_at, ends_at)
  }
}

Table match_players {
  id uuid [pk]

  match_id uuid [not null, ref: > matches.id]
  user_id uuid [not null, ref: > auth.users.id]

  available_balance numeric [not null]
  realized_pnl numeric [not null]

  current_side position_side [not null]
  position_notional_usdt numeric [not null]
  average_entry_price numeric

  final_capital numeric

  created_at timestamptz [not null]

  indexes {
    (match_id, user_id) [unique]
    match_id
    user_id
  }
}

Table match_candles {
  id uuid [pk]

  match_id uuid [not null, ref: > matches.id]

  sequence integer [not null]
  open_time timestamptz [not null]

  open numeric [not null]
  high numeric [not null]
  low numeric [not null]
  close numeric [not null]

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
  amount_usdt numeric [not null]
  execution_price numeric [not null]

  candle_sequence integer
  executed_at timestamptz [not null]

  indexes {
    match_id
    user_id
    (match_id, user_id)
    (match_id, candle_sequence)
    executed_at
  }
}
```

## Notes

- Supabase Auth owns `auth.users`; application tables store compatible `uuid` user ids.
- Money-like, price, balance, and PnL fields use `numeric` to avoid JavaScript floating-point drift.
- `match_players` stores the current net exposure for each player in a match.
- `trades` is an execution ledger. It does not store `exit_price` or `closed_at`; opposite-side trades reduce or flip net exposure.
