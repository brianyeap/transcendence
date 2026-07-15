import { SideNav } from "@/app/components/duel/side-nav";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { TrendingUp, TrendingDown, Clock, ArrowLeft, Swords } from "lucide-react";
import Link from "next/link";

// --- Helper Functions ---
function formatMoney(value: number): string
{
	const sign = value > 0 ? "+" : "";
	return `${sign}$${Math.abs(value).toLocaleString(undefined, {
	minimumFractionDigits: 2,
	maximumFractionDigits: 2,
	})}`;
}

function formatDuration(starts_at: string, ends_at: string): string
{
	const seconds = Math.round((new Date(ends_at).getTime() - new Date(starts_at).getTime()) / 1000);
	const minutes = Math.floor(seconds / 60);
	const remainingSeconds = seconds % 60;
	return `${minutes}m ${remainingSeconds}$`;
}

function formatDateTime(dateString: string): string
{
	return new Date(dateString).toLocaleDateString("en-GB", {
		day: "numeric",
		month: "short",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
}

function getPnLColor(value: number): string
{
	if (value > 0)
		return "text-emerald-400";
	if (value < 0)
		return "text-rose-400";
	return "text-gray-400";
}

const mockMatch = 
{
	id: "550e8400-e29b-41d4-a716-446655440001",
	symbol: "BTCUSDT",
	starting_capital: 10000,
	starts_at: "2026-07-06T14:00:00Z",
	ends_at: "2026-07-06T14:02:00Z",
	final_price: 107250.50,
	status: "completed",
	winner_username: "Trancendance",
	players: [
		{
			user_id: "current-user-uuid",
			username: "Trancendance",
			final_capital: 11250.00,
			realized_capital: 1250.00,
			is_current_user: true, 
		},
		{
			user_id: "opponent-uuid",
			username: "satoshi_jr",
			final_capital: 8750.00,
			realized_pnl: -1250.00,
			is_current_user: false,
		}
	],
	trades: [
		{
			id: "trade-001",
			user_id: "current-user-uuid",
			username: "Tigger",
			side: "long",
			amount_usdt: 5000,
			execution_price: 106000.00,
			executed_at: "2026-07-06T14:00:30Z",
			candle_sequence: 1,
		},
		{
			id: "trade-002",
			user_id: "opponent-uuid",
			username: "satoshi_jr",
			side: "short",
			amount_usdt: 8000,
			execution_price: 106500.00,
			executed_at: "2026-07-06T14:01:00Z",
			candle_sequence: 2,
		},
		{
			id: "trade-003",
			user_id: "current-user-uuid",
			username: "Tigger",
			side: "short",
			amount_usdt: 5000,
			execution_price: 107250.50,
			executed_at: "2026-07-06T14:01:45Z",
			candle_sequence: 4,
		},
	],
};

