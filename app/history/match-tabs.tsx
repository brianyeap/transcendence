"use client";

import { useState, type ReactNode } from "react";

// On mobile the chart and trade log share one area behind two tabs, so the whole
// page fits in the viewport. From `md` up, both are shown stacked and the tabs are hidden.
// Both panels are passed in as server-rendered children, so no functions cross the
// server/client boundary.
export function MatchTabs({
	chartLabel,
	tradesLabel,
	tradesCount,
	chart,
	trades,
}: {
	chartLabel: string;
	tradesLabel: string;
	tradesCount: number;
	chart: ReactNode;
	trades: ReactNode;
}) {
	const [tab, setTab] = useState<"chart" | "trades">("chart");

	const tabClass = (active: boolean) =>
		`flex-1 flex items-center justify-center gap-1.5 whitespace-nowrap px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
			active ? "bg-white/[.08] text-[#eef2f8] shadow-sm" : "text-[#5d6877] hover:text-[#eef2f8]"
		}`;

	return (
		<div className="flex flex-col flex-1 min-h-0 min-w-0 gap-3 md:gap-6">
			<div role="tablist" className="md:hidden shrink-0 flex items-center gap-1 p-1 rounded-lg bg-[#0f131b] border border-white/[.07]">
				<button type="button" role="tab" aria-selected={tab === "chart"} onClick={() => setTab("chart")} className={tabClass(tab === "chart")}>
					{chartLabel}
				</button>
				<button type="button" role="tab" aria-selected={tab === "trades"} onClick={() => setTab("trades")} className={tabClass(tab === "trades")}>
					{tradesLabel}
					<span className={`text-[10px] px-1.5 py-0.5 rounded-full ${tab === "trades" ? "bg-white/[.08]" : "bg-white/[.04]"}`}>{tradesCount}</span>
				</button>
			</div>

			<div className={`${tab === "chart" ? "flex" : "hidden"} md:flex flex-col flex-1 min-h-0 min-w-0 md:flex-none`}>{chart}</div>
			<div className={`${tab === "trades" ? "flex" : "hidden"} md:flex flex-col flex-1 min-h-0 min-w-0 md:flex-none`}>{trades}</div>
		</div>
	);
}