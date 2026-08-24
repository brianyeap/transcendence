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

Enum studio_status {
  active
  restricted
}

Enum account_status {
  active
  restricted
}

Enum payment_status {
  pending
  approved
  rejected
}

Table studios {
  id uuid [pk]
  name text [not null, unique]
  status studio_status [not null, default: 'active']
  restriction_reason text
  created_at timestamptz [not null]

  Note: "An organisation (Ariden Group customer). Restricting a studio blocks all of its staff."
}

Table profiles {
  id uuid [pk, ref: > auth.users.id]
  username text [not null, unique]
  email text [not null, unique]
  created_at timestamptz [not null]
  last_seen_at timestamptz

  studio_id uuid [ref: > studios.id]
  account_status account_status [not null, default: 'active']
  restriction_reason text
  access_expires_at timestamptz [note: 'paywall: app usable until this moment; defaults to now() + 7 days (free trial)']
}

Table payment_submissions {
  id uuid [pk]
  user_id uuid [not null, ref: > auth.users.id]

  amount numeric [not null]
  currency text [not null, default: 'MYR']
  bank_name text [not null]
  reference_code text [not null]
  transferred_on date [not null]
  note text

  proof_path text [not null, note: 'file path inside the private payment-proofs storage bucket']

  status payment_status [not null, default: 'pending']
  reviewed_by_email text
  reviewed_at timestamptz
  review_note text
  days_granted integer

  created_at timestamptz [not null]

  indexes {
    user_id
    status
  }

  Note: "Manual bank-transfer paywall: user uploads a receipt, an admin approves it, which extends profiles.access_expires_at."
}

Table admin_actions {
  id uuid [pk]
  admin_email text [not null]
  action text [not null]
  target_type text [not null, note: "'user' | 'studio' | 'payment'"]
  target_id text [not null]
  target_label text
  detail text
  created_at timestamptz [not null]

  Note: "Audit log of admin-panel actions. RLS enabled with no policies: service-role only."
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
- The admin/paywall schema (`studios`, `payment_submissions`, `admin_actions`, the new
  `profiles` columns, and the private `payment-proofs` storage bucket with per-user-folder
  upload/read policies) was applied directly to the live Supabase DB on 2026-08-24 — the
  repo intentionally keeps no migration files. Admins are any `@aridengroup.com` login
  (see `lib/admin.ts`); the paywall is enforced in `proxy.ts`.
- Money-like, price, balance, and PnL fields use `numeric` to avoid JavaScript floating-point drift.
- `match_players` stores the current net exposure for each player in a match.
- `trades` is an execution ledger. It does not store `exit_price` or `closed_at`; opposite-side trades reduce or flip net exposure.
