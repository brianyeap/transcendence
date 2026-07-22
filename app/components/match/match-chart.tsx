"use client";

// The candle chart, wrapping lightweight-charts v5.
//
// v5 moved two things that older examples still get wrong:
//   - series are created with addSeries(CandlestickSeries, opts), not
//     addCandlestickSeries(opts)
//   - markers are a separate primitive, createSeriesMarkers(series, []), not
//     series.setMarkers([])
//
// The chart instance is created ONCE and then fed. Recreating it on every data
// change would reset the user's pan/zoom and leak canvases.

import { useEffect, useRef } from "react";
import {
  CandlestickSeries,
  ColorType,
  CrosshairMode,
  LineStyle,
  createChart,
  createSeriesMarkers,
  type IChartApi,
  type ISeriesApi,
  type ISeriesMarkersPluginApi,
  type SeriesMarker,
  type Time,
  type UTCTimestamp,
} from "lightweight-charts";
import type { Candle } from "@/lib/api/types";

export function MatchChart({
  candles,
  visibleCount,
  markers,
}: {
  candles: Candle[];
  /** Index of the current candle — everything after it is still in the future. */
  visibleCount: number;
  markers: SeriesMarker<Time>[];
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const markersRef = useRef<ISeriesMarkersPluginApi<Time> | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const chart: IChartApi = createChart(container, {
      autoSize: true, // v5 handles resize itself; no ResizeObserver needed
      layout: {
        background: { type: ColorType.Solid, color: "#0f131b" },
        textColor: "#5d6877",
        fontFamily: "var(--font-jetbrains-mono), monospace",
        attributionLogo: false,
      },
      grid: {
        vertLines: { color: "rgba(255,255,255,.04)" },
        horzLines: { color: "rgba(255,255,255,.04)" },
      },
      rightPriceScale: { borderColor: "rgba(255,255,255,.07)" },
      timeScale: {
        borderColor: "rgba(255,255,255,.07)",
        timeVisible: true,
        secondsVisible: true,
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: "#4d86ff", style: LineStyle.Dashed, labelBackgroundColor: "#4d86ff" },
        horzLine: { color: "#4d86ff", style: LineStyle.Dashed, labelBackgroundColor: "#4d86ff" },
      },
    });

    seriesRef.current = chart.addSeries(CandlestickSeries, {
      upColor: "#1fcb83",
      downColor: "#f6485d",
      borderVisible: false,
      wickUpColor: "#1fcb83",
      wickDownColor: "#f6485d",
      priceLineColor: "#4d86ff",
      priceLineStyle: LineStyle.Dotted,
    });

    return () => {
      chart.remove();
      seriesRef.current = null;
      markersRef.current = null;
    };
  }, []);

  // Feed only the candles that have "happened" — the rest are the future.
  useEffect(() => {
    const series = seriesRef.current;
    if (!series || candles.length === 0) return;

    series.setData(
      candles.slice(0, visibleCount + 1).map((candle) => ({
        time: candle.openTime as UTCTimestamp,
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
      }))
    );
  }, [candles, visibleCount]);

  useEffect(() => {
    const series = seriesRef.current;
    if (!series) return;

    markersRef.current ??= createSeriesMarkers(series, []);
    markersRef.current.setMarkers(markers);
  }, [markers]);

  return <div ref={containerRef} className="size-full" />;
}
