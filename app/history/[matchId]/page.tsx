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

