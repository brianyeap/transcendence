const CANDLES_URL = "https://api.exchange.coinbase.com/products/BTC-USD/candles";

type Candle = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};


export async function GET(request: Request) {
  const limit = 120;

  // 1 min chart
  const res = await fetch(`${CANDLES_URL}?granularity=60`, { 
    headers: { "User-Agent": "transcendence" },
    cache: "no-store",
  });

  if (!res.ok) {
    return Response.json({ error: "Could not fetch BTC/USD chart data." }, { status: 502 });
  }

  const rows = (await res.json()) as [number, number, number, number, number, number][];

  const candles: Candle[] = rows
    .sort((a, b) => a[0] - b[0]) // Coinbase returns newest-first so we need to sort oldest-first
    .slice(-limit)
    .map(([time, low, high, open, close, volume]) => ({ time, open, high, low, close, volume }));

  return Response.json({
    symbol: "BTC/USD",
    interval: "1m",
    count: candles.length,
    candles,
  });
}
