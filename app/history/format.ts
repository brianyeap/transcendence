// --- Helper Functions ---
export function formatMoney(value: number): string {
	const sign = value > 0 ? "+" : "";
	return `${sign}$${Math.abs(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatDuration(starts_at?: string | null, ends_at?: string | null): string {
	if (!starts_at || !ends_at) return "—";
	const start = new Date(starts_at).getTime();
	const end = new Date(ends_at).getTime();
	if (Number.isNaN(start) || Number.isNaN(end)) return "—";
	const seconds = Math.max(0, Math.round((end - start) / 1000));
	const minutes = Math.floor(seconds / 60);
	const remainingSeconds = seconds % 60;
	return `${minutes}m ${remainingSeconds}s`;
}

export function dateLocaleFromAppLocale(locale: string): string {
	if (locale === "zh-CN") return "zh-CN";
	if (locale === "ms") return "ms-MY";
	return "en-GB";
}

export function formatDateTime(dateString: string | null | undefined, locale: string): string {
	if (!dateString) return "—";
	const date = new Date(dateString);
	if (Number.isNaN(date.getTime())) return "—";
	return date.toLocaleDateString(dateLocaleFromAppLocale(locale), {
		day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
	});
}

export function formatPct(value: number, base: number): string {
	if (!base || !Number.isFinite(base) || !Number.isFinite(value)) return "—";
	const pct = (value / base) * 100;
	if (!Number.isFinite(pct)) return "—";
	return `${pct > 0 ? "+" : ""}${pct.toFixed(2)}%`;
}