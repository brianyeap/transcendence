"use client";

import { useEffect, useRef, type ReactNode } from "react";

// Horizontal scroll container that starts scrolled to the right edge,
// so the most recent candles are visible first on narrow screens.
// Kept as its own client component so CandlestickChart can stay a plain
// component that server pages can pass a `t` function into.
export function ScrollToEnd({ children, className }: { children: ReactNode; className?: string }) {
	const ref = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const el = ref.current;
		if (el) el.scrollLeft = el.scrollWidth;
	}, []);

	return (
		<div ref={ref} className={className}>
			{children}
		</div>
	);
}