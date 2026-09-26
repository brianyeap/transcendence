// --- Candlestick Chart Component ---
export function CandlestickChart({ candles, trades, currentUserId, t }: any) {
	if (!candles || candles.length === 0) return null;

	const sequences = candles.map((c: any) => c.sequence);
	const minSequence = Math.min(...sequences, 0);
	const maxSequence = Math.max(...sequences, 1);

	const tradePrices = trades.map((tr: any) => tr.execution_price);
	const allPrices = [...candles.map((c: any) => c.low), ...candles.map((c: any) => c.high), ...tradePrices];
	const minPrice = allPrices.length > 0 ? Math.min(...allPrices) : 0;
	const maxPrice = allPrices.length > 0 ? Math.max(...allPrices) : 100;

	const priceRange = maxPrice - minPrice || 1;
	const padPriceMin = minPrice - priceRange * 0.1;
	const padPriceMax = maxPrice + priceRange * 0.1;
	const paddedRange = padPriceMax - padPriceMin;

	const svgWidth = 1000;
	const svgHeight = 320;
	const padLeft = 70, padRight = 30, padTop = 30, padBottom = 30;
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
		<div className="relative w-full overflow-x-auto">
			<svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full min-w-[700px] h-80" preserveAspectRatio="none">
				<g transform="translate(80, 15)">
					<path d="M 0 -4 L -4 2 L 4 2 Z" fill="#10b981" stroke="#ffffff" strokeWidth="1" />
					<text x="8" y="1" fill="#9aa6b6" fontSize="10" fontFamily="sans-serif">{t("youLong")}</text>
					<path transform="translate(75, 0)" d="M 0 4 L -4 -2 L 4 -2 Z" fill="#ef4444" stroke="#ffffff" strokeWidth="1" />
					<text x="83" y="1" fill="#9aa6b6" fontSize="10" fontFamily="sans-serif">{t("youShort")}</text>
					<path transform="translate(155, 0)" d="M 0 -4 L -4 2 L 4 2 Z" fill="none" stroke="#34d399" strokeWidth="1.5" />
					<text x="163" y="1" fill="#9aa6b6" fontSize="10" fontFamily="sans-serif">{t("opponentLong")}</text>
					<path transform="translate(255, 0)" d="M 0 4 L -4 -2 L 4 -2 Z" fill="none" stroke="#f87171" strokeWidth="1.5" />
					<text x="263" y="1" fill="#9aa6b6" fontSize="10" fontFamily="sans-serif">{t("opponentShort")}</text>
				</g>

				{gridLines.map((line, i) => (
					<g key={i}>
						<line x1={padLeft} y1={line.y} x2={svgWidth - padRight} y2={line.y} stroke="#ffffff" strokeOpacity="0.08" strokeDasharray="3 3" />
						<text x={padLeft - 8} y={line.y + 4} fill="#5d6877" fontSize="10" fontFamily="monospace" textAnchor="end">
							${line.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
						</text>
					</g>
				))}

				{candles.map((c: any) => {
					const cx = getX(c.sequence);
					const cyOpen = getY(c.open), cyClose = getY(c.close), cyHigh = getY(c.high), cyLow = getY(c.low);
					const isGreen = c.close >= c.open;
					const color = isGreen ? "#10b981" : "#ef4444";
					return (
						<g key={c.sequence}>
							<line x1={cx} y1={cyHigh} x2={cx} y2={cyLow} stroke={color} strokeWidth="1.5" />
							<rect x={cx - candleWidth / 2} y={Math.min(cyOpen, cyClose)} width={candleWidth} height={Math.max(1.2, Math.abs(cyOpen - cyClose))} fill={color} />
						</g>
					);
				})}

				{trades.map((trade: any) => {
					const tx = getX(trade.candle_sequence);
					const ty = getY(trade.execution_price);
					const isCurrentUser = trade.user_id === currentUserId;
					const isLong = trade.side === "long";
					let markerFill = "", markerStroke = "", markerStrokeWidth = "1.5";
					let markerPath = isLong
						? `M ${tx} ${ty - 7} L ${tx - 6} ${ty + 3} L ${tx + 6} ${ty + 3} Z`
						: `M ${tx} ${ty + 7} L ${tx - 6} ${ty - 3} L ${tx + 6} ${ty - 3} Z`;

					if (isCurrentUser) {
						markerFill = isLong ? "#10b981" : "#ef4444";
						markerStroke = "#ffffff";
					} else {
						markerFill = "none";
						markerStroke = isLong ? "#34d399" : "#f87171";
						markerStrokeWidth = "2";
					}

					return (
						<g key={trade.id}>
							<circle cx={tx} cy={ty} r="9" fill={isLong ? "#10b981" : "#ef4444"} fillOpacity="0.1" />
							<path d={markerPath} fill={markerFill} stroke={markerStroke} strokeWidth={markerStrokeWidth}>
								<title>{t("tradeTooltip", { username: trade.username, side: isLong ? t("long") : t("short"), amount: trade.amount_usdt, price: trade.execution_price })}</title>
							</path>
						</g>
					);
				})}
			</svg>
		</div>
	);
}