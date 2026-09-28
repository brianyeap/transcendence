"use client";

import { useEffect, useRef, useState } from "react";

type Candle = { sequence: number; open: number; high: number; low: number; close: number };
type ChartTrade = {
	id: string | number;
	user_id: string;
	side: "long" | "short";
	candle_sequence: number;
	execution_price: number;
	tooltip: string; // already translated by the parent, so no functions cross the server/client boundary
};

// Below this width the chart stops shrinking and the container scrolls sideways instead,
// so candles, text and markers stay readable on phones.
const MIN_CHART_WIDTH = 700;

// Measures its scroll container and draws the SVG at exactly max(container width, MIN_CHART_WIDTH)
// pixels wide, and exactly as tall as the container. Nothing is scaled, so text and markers never stretch.
export function CandlestickSvg({
	candles,
	trades,
	currentUserId,
	className = "h-[240px] sm:h-[300px]",
}: {
	candles: Candle[];
	trades: ChartTrade[];
	currentUserId: string;
	// Controls the container's height (fixed, or flex-1 to fill the space around it).
	className?: string;
}) {
	const ref = useRef<HTMLDivElement>(null);
	const didScrollToEnd = useRef(false);
	const [size, setSize] = useState({ width: 0, height: 0 });

	useEffect(() => {
		const el = ref.current;
		if (!el) return;
		const update = () => setSize({ width: Math.floor(el.clientWidth), height: Math.floor(el.clientHeight) });
		update();
		const ro = new ResizeObserver(update);
		ro.observe(el);
		return () => ro.disconnect();
	}, []);

	const { width, height } = size;
	const ready = width > 0 && height > 0;

	// Open scrolled to the latest candles (once per time the chart becomes visible).
	useEffect(() => {
		const el = ref.current;
		if (!ready) {
			didScrollToEnd.current = false;
			return;
		}
		if (el && !didScrollToEnd.current) {
			el.scrollLeft = el.scrollWidth;
			didScrollToEnd.current = true;
		}
	}, [ready]);

	const containerClass = `relative w-full min-w-0 overflow-x-auto overflow-y-hidden overscroll-x-contain ${className}`;

	// Empty container until measured (also when hidden inside an inactive tab).
	if (!ready) {
		return <div ref={ref} className={containerClass} />;
	}

	const svgWidth = Math.max(width, MIN_CHART_WIDTH);
	const svgHeight = height;
	const padLeft = 74, padRight = 20, padTop = 12, padBottom = 12;

	const sequences = candles.map((c) => c.sequence);
	const minSequence = Math.min(...sequences, 0);
	const maxSequence = Math.max(...sequences, 1);

	const allPrices = [
		...candles.map((c) => c.low),
		...candles.map((c) => c.high),
		...trades.map((tr) => tr.execution_price),
	];
	const minPrice = allPrices.length > 0 ? Math.min(...allPrices) : 0;
	const maxPrice = allPrices.length > 0 ? Math.max(...allPrices) : 100;
	const priceRange = maxPrice - minPrice || 1;
	const padPriceMin = minPrice - priceRange * 0.1;
	const padPriceMax = maxPrice + priceRange * 0.1;
	const paddedRange = padPriceMax - padPriceMin;

	const chartWidth = svgWidth - padLeft - padRight;
	const chartHeight = svgHeight - padTop - padBottom;

	const getX = (seq: number) => padLeft + ((seq - minSequence) / (maxSequence - minSequence || 1)) * chartWidth;
	const getY = (price: number) => padTop + (1 - (price - padPriceMin) / paddedRange) * chartHeight;

	const gridCount = 5;
	const gridLines = Array.from({ length: gridCount }).map((_, i) => {
		const price = padPriceMin + (i / (gridCount - 1)) * paddedRange;
		return { price, y: getY(price) };
	});

	const candleWidth = Math.max(1.5, (chartWidth / (candles.length || 1)) * 0.6);

	return (
		<div ref={ref} className={containerClass}>
			{/* Absolutely positioned so the (wide) chart adds to this box's scrollable area but never to its
			    intrinsic width. Otherwise a parent that sizes itself from its content can be stretched to 700px+,
			    which is what pushed the whole page sideways. */}
			<div className="absolute left-0 top-0" style={{ width: svgWidth, height: svgHeight }}>
			<svg width={svgWidth} height={svgHeight} viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="block max-w-none" role="img">
				{gridLines.map((line, i) => (
					<g key={i}>
						<line x1={padLeft} y1={line.y} x2={svgWidth - padRight} y2={line.y} stroke="#ffffff" strokeOpacity="0.08" strokeDasharray="3 3" />
						<text x={padLeft - 6} y={line.y + 3.5} fill="#5d6877" fontSize="10" fontFamily="monospace" textAnchor="end">
							${line.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
						</text>
					</g>
				))}

				{candles.map((c) => {
					const cx = getX(c.sequence);
					const cyOpen = getY(c.open), cyClose = getY(c.close), cyHigh = getY(c.high), cyLow = getY(c.low);
					const color = c.close >= c.open ? "#10b981" : "#ef4444";
					return (
						<g key={c.sequence}>
							<line x1={cx} y1={cyHigh} x2={cx} y2={cyLow} stroke={color} strokeWidth="1.5" />
							<rect x={cx - candleWidth / 2} y={Math.min(cyOpen, cyClose)} width={candleWidth} height={Math.max(1.2, Math.abs(cyOpen - cyClose))} fill={color} />
						</g>
					);
				})}

				{trades.map((trade) => {
					const tx = getX(trade.candle_sequence);
					const ty = getY(trade.execution_price);
					const isCurrentUser = trade.user_id === currentUserId;
					const isLong = trade.side === "long";
					const markerPath = isLong
						? `M ${tx} ${ty - 7} L ${tx - 6} ${ty + 3} L ${tx + 6} ${ty + 3} Z`
						: `M ${tx} ${ty + 7} L ${tx - 6} ${ty - 3} L ${tx + 6} ${ty - 3} Z`;
					const markerFill = isCurrentUser ? (isLong ? "#10b981" : "#ef4444") : "none";
					const markerStroke = isCurrentUser ? "#ffffff" : isLong ? "#34d399" : "#f87171";
					const markerStrokeWidth = isCurrentUser ? "1.5" : "2";

					return (
						<g key={trade.id}>
							<circle cx={tx} cy={ty} r="9" fill={isLong ? "#10b981" : "#ef4444"} fillOpacity="0.1" />
							<path d={markerPath} fill={markerFill} stroke={markerStroke} strokeWidth={markerStrokeWidth}>
								<title>{trade.tooltip}</title>
							</path>
						</g>
					);
				})}
			</svg>
			</div>
		</div>
	);
}