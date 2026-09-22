"use client";

import { useEffect, useMemo, useRef } from "react";
import {
  CandlestickSeries,
  ColorType,
  CrosshairMode,
  LineStyle,
  createChart,
  createSeriesMarkers,
  type CandlestickData,
  type IChartApi,
  type IPriceLine,
  type ISeriesApi,
  type ISeriesMarkersPluginApi,
  type SeriesMarker,
  type Time,
  type UTCTimestamp,
} from "lightweight-charts";

import { fmtUSD } from "../../components/duel/format";
import type { Candle, NetSide, Side, TradeFill } from "@/lib/match/types";

const UP = "#1fcb83";
const DOWN = "#f6485d";
const ACCENT = "#4d86ff";
const PANEL = "#0f131b";
const RAISED = "#151b25";
const TEXT_DIM = "#5d6877";
const TEXT_DIMMEST = "#3a434f";
const HAIRLINE = "rgba(255,255,255,.05)";
const BORDER = "rgba(255,255,255,.07)";

function toPoint(candle: Candle): CandlestickData<Time> {
  const rising = candle.close >= candle.open;
  const shell = {
    time: candle.time as UTCTimestamp,
    open: candle.open,
    high: candle.high,
    low: candle.low,
    close: candle.close,
  };

  if (candle.preMatch) {
    return {
      ...shell,
      color: rising ? TEXT_DIMMEST : RAISED,
      borderColor: TEXT_DIM,
      wickColor: TEXT_DIMMEST,
    };
  }

  const live = rising ? UP : DOWN;
  return { ...shell, color: live, borderColor: live, wickColor: live };
}

function dividerMarker(time: number): SeriesMarker<Time> {
  return {
    time: time as UTCTimestamp,
    position: "aboveBar",
    shape: "arrowDown",
    color: ACCENT,
    text: "Match start",
  };
}

const CANDLE_SECONDS = 60;

function candleTimeOf(executedAt: number, phase: number): number {
  const seconds = Math.floor(executedAt / 1000);
  const past = (((seconds - phase) % CANDLE_SECONDS) + CANDLE_SECONDS) % CANDLE_SECONDS;
  return seconds - past;
}

function buildTradeMarkers(trades: TradeFill[], phase: number): SeriesMarker<Time>[] {
  const buckets = new Map<
    string,
    { time: number; side: Side; amount: number; count: number }
  >();

  for (const trade of trades) {
    const time = candleTimeOf(trade.executedAt, phase);
    const key = `${time}:${trade.side}`;
    const bucket = buckets.get(key);
    if (bucket === undefined) {
      buckets.set(key, { time, side: trade.side, amount: trade.amount, count: 1 });
    } else {
      bucket.amount += trade.amount;
      bucket.count += 1;
    }
  }

  return [...buckets.values()]
    .sort((a, b) => a.time - b.time)
    .map((bucket) => {
      const long = bucket.side === "long";
      const label = `${long ? "Long" : "Short"} ${fmtUSD(Math.round(bucket.amount))}`;
      return {
        time: bucket.time as UTCTimestamp,
        position: long ? "belowBar" : "aboveBar",
        shape: long ? "arrowUp" : "arrowDown",
        color: long ? UP : DOWN,
        text: bucket.count > 1 ? `${label} ×${bucket.count}` : label,
      } satisfies SeriesMarker<Time>;
    });
}

function mergeMarkers(
  dividerTime: number | null,
  tradeMarkers: SeriesMarker<Time>[]
): SeriesMarker<Time>[] {
  const merged =
    dividerTime === null
      ? [...tradeMarkers]
      : [dividerMarker(dividerTime), ...tradeMarkers];

  return merged.sort((a, b) => (a.time as number) - (b.time as number));
}

export function MatchChart({
  candles,
  lastCandle,
  trades,
  entryPrice,
  netSide,
}: {
  candles: Candle[];
  lastCandle: Candle | null;
  trades: TradeFill[];
  entryPrice: number | null;
  netSide: NetSide;
}): React.ReactElement {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick", Time> | null>(null);
  const markersRef = useRef<ISeriesMarkersPluginApi<Time> | null>(null);
  const entryLineRef = useRef<IPriceLine | null>(null);

  const drawnCountRef = useRef(0);
  const firstTimeRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);

  const dividerTime = useMemo(() => {
    const boundary = candles.findIndex((candle) => !candle.preMatch);
    return boundary <= 0 ? null : candles[boundary].time;
  }, [candles]);

  const hasPreMatch = useMemo(() => candles.some((candle) => candle.preMatch), [candles]);

  const candlePhase = useMemo(() => {
    const first = candles[0];
    if (first === undefined) {
      return 0;
    }
    return ((first.time % CANDLE_SECONDS) + CANDLE_SECONDS) % CANDLE_SECONDS;
  }, [candles]);

  const markers = useMemo(
    () => mergeMarkers(dividerTime, buildTradeMarkers(trades, candlePhase)),
    [dividerTime, trades, candlePhase]
  );

  useEffect(() => {
    const host = hostRef.current;
    if (host === null) {
      return;
    }

    const fontFamily = getComputedStyle(host).fontFamily;

    const size = { width: host.clientWidth, height: host.clientHeight };

    const chart = createChart(host, {
      width: size.width,
      height: size.height,
      autoSize: false,
      layout: {
        background: { type: ColorType.Solid, color: PANEL },
        textColor: TEXT_DIM,
        fontSize: 11,
        fontFamily,
        attributionLogo: false,
      },
      grid: {
        vertLines: { color: HAIRLINE },
        horzLines: { color: HAIRLINE },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: TEXT_DIMMEST,
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: RAISED,
        },
        horzLine: {
          color: TEXT_DIMMEST,
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: RAISED,
        },
      },
      rightPriceScale: {
        borderColor: BORDER,
        scaleMargins: { top: 0.14, bottom: 0.12 },
      },
      timeScale: {
        borderColor: BORDER,
        timeVisible: true,
        secondsVisible: false,
        barSpacing: 8,
        minBarSpacing: 2,
        rightOffset: 4,
        shiftVisibleRangeOnNewBar: true,
      },
    });

    const series = chart.addSeries(CandlestickSeries, {
      upColor: UP,
      downColor: DOWN,
      borderUpColor: UP,
      borderDownColor: DOWN,
      wickUpColor: UP,
      wickDownColor: DOWN,
      borderVisible: true,
      wickVisible: true,
      priceLineVisible: true,
      priceLineColor: TEXT_DIM,
      priceLineStyle: LineStyle.Dotted,
      priceLineWidth: 1,
      priceFormat: { type: "price", precision: 2, minMove: 0.01 },
    });

    const markers = createSeriesMarkers(series, []);

    chartRef.current = chart;
    seriesRef.current = series;
    markersRef.current = markers;

    drawnCountRef.current = 0;
    firstTimeRef.current = null;
    lastTimeRef.current = null;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry === undefined) {
        return;
      }
      const width = Math.round(entry.contentRect.width);
      const height = Math.round(entry.contentRect.height);
      if (width <= 0 || height <= 0) {
        return;
      }
      const wasCollapsed = size.width <= 0 || size.height <= 0;
      size.width = width;
      size.height = height;
      chart.applyOptions({ width, height });
      if (wasCollapsed) {
        chart.timeScale().fitContent();
      }
    });
    observer.observe(host);

    return () => {
      observer.disconnect();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
      markersRef.current = null;
    };
  }, []);

  useEffect(() => {
    const chart = chartRef.current;
    const series = seriesRef.current;
    if (chart === null || series === null) {
      return;
    }

    const first = candles.length > 0 ? candles[0].time : null;
    const drawn = drawnCountRef.current;
    const continuation =
      drawn > 0 &&
      first === firstTimeRef.current &&
      candles.length >= drawn &&
      candles.length <= drawn + 1;

    if (!continuation && !(drawn === 0 && candles.length === 0)) {
      series.setData(candles.map(toPoint));
      lastTimeRef.current = candles.length > 0 ? candles[candles.length - 1].time : null;

      if (candles.length > 0) {
        chart.timeScale().fitContent();
      }
    }

    drawnCountRef.current = candles.length;
    firstTimeRef.current = first;
  }, [candles]);

  useEffect(() => {
    const series = seriesRef.current;
    if (series === null || lastCandle === null) {
      return;
    }

    const lastTime = lastTimeRef.current;
    if (lastTime !== null && lastCandle.time < lastTime) {
      return;
    }

    series.update(toPoint(lastCandle));
    lastTimeRef.current = lastCandle.time;
  }, [lastCandle]);

  useEffect(() => {
    markersRef.current?.setMarkers(markers);
  }, [markers]);

  useEffect(() => {
    const series = seriesRef.current;
    if (series === null) return;

    if (entryLineRef.current !== null) {
      series.removePriceLine(entryLineRef.current);
      entryLineRef.current = null;
    }

    if (entryPrice === null || netSide === "flat") return;

    entryLineRef.current = series.createPriceLine({
      price: entryPrice,
      color: netSide === "long" ? UP : DOWN,
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      axisLabelVisible: true,
      title: netSide === "long" ? "Long entry" : "Short entry",
    });

    return () => {
      if (entryLineRef.current !== null && seriesRef.current !== null) {
        seriesRef.current.removePriceLine(entryLineRef.current);
        entryLineRef.current = null;
      }
    };
  }, [entryPrice, netSide]);

  const isEmpty = candles.length === 0;

  return (
    <div
      className="relative h-full min-h-[260px] w-full overflow-hidden rounded-xl border border-white/[.07] bg-[#0f131b]"
    >
      <div ref={hostRef} className="absolute inset-0 font-mono" />

      {isEmpty ? (
        <div className="absolute inset-0 grid place-items-center">
          <p className="flex items-center gap-2.5 text-sm text-[#5d6877]">
            <span className="size-2 animate-pulse rounded-full bg-[#4d86ff]" />
            Waiting for market data…
          </p>
        </div>
      ) : hasPreMatch ? (
        <div className="pointer-events-none absolute left-3.5 top-3 flex items-center gap-3.5 text-[10.5px] font-bold uppercase tracking-[.08em]">
          <span className="flex items-center gap-1.5 text-[#5d6877]">
            <span className="h-2.5 w-[3px] rounded-[1px] bg-[#3a434f] ring-1 ring-[#5d6877]" />
            Pre-match
          </span>
          <span className="flex items-center gap-1.5 text-[#9aa6b6]">
            <span className="h-2.5 w-[3px] rounded-[1px] bg-[#1fcb83]" />
            Match
          </span>
        </div>
      ) : null}
    </div>
  );
}
