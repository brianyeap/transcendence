"use client";

import { SideNav } from "../components/duel/side-nav";

const matchHistory = [
  { id: "550e8400-e29b-41d4-a716-446655440001", opponent: "satoshi_jr", result: "WIN", symbol: "BTCUSDT", starting_capital: 10000, final_capital: 11250.00, realized_pnl: 1250.00, starts_at: "2025-06-28T14:00:00Z", ends_at: "2025-06-28T14:02:00Z" },
  { id: "550e8400-e29b-41d4-a716-446655440002", opponent: "delta_neutral", result: "LOSS", symbol: "BTCUSDT", starting_capital: 10000, final_capital: 8450.00, realized_pnl: -1550.00, starts_at: "2025-06-27T10:00:00Z", ends_at: "2025-06-27T10:01:00Z" },
  { id: "550e8400-e29b-41d4-a716-446655440003", opponent: "apex_07", result: "WIN", symbol: "BTCUSDT", starting_capital: 10000, final_capital: 12100.25, realized_pnl: 2100.25, starts_at: "2025-06-26T16:00:00Z", ends_at: "2025-06-26T16:03:00Z" },
  { id: "550e8400-e29b-41d4-a716-446655440004", opponent: "nightowl", result: "DRAW", symbol: "BTCUSDT", starting_capital: 10000, final_capital: 10000.00, realized_pnl: 0.00, starts_at: "2025-06-25T20:00:00Z", ends_at: "2025-06-25T20:01:30Z" },
  { id: "550e8400-e29b-41d4-a716-446655440005", opponent: "shortking", result: "LOSS", symbol: "BTCUSDT", starting_capital: 10000, final_capital: 7800.00, realized_pnl: -2200.00, starts_at: "2025-06-24T09:00:00Z", ends_at: "2025-06-24T09:02:00Z" },
];

export default function HistoryPage() {
  return (
    <SideNav>
      <div className="p-8 text-[#eef2f8]">
        <h1 className="text-2xl font-bold mb-2">Match History</h1>
        <p className="text-sm text-[#5d6877]">{matchHistory.length} matches total</p>
      </div>
    </SideNav>
  );
}
