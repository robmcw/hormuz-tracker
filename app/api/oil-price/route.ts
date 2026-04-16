import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest) {
  try {
    const res = await fetch(
      'https://query1.finance.yahoo.com/v8/finance/chart/BZ=F?interval=1d&range=1mo&includePrePost=false',
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          'Accept': 'application/json',
        },
        cache: 'no-store',
      }
    );

    if (!res.ok) throw new Error(`Yahoo Finance responded ${res.status}`);

    const data = await res.json();
    const result = data?.chart?.result?.[0];
    const meta = result?.meta;

    if (!meta?.regularMarketPrice) throw new Error('No price in response');

    const price: number = meta.regularMarketPrice;
    const prevClose: number = meta.chartPreviousClose ?? meta.previousClose ?? price;
    const change = price - prevClose;
    const changePercent = prevClose !== 0 ? (change / prevClose) * 100 : 0;

    const timestamps: number[] = result?.timestamp ?? [];
    const closes: (number | null)[] = result?.indicators?.quote?.[0]?.close ?? [];
    const history = timestamps
      .map((ts, i) => ({ date: new Date(ts * 1000).toISOString().slice(0, 10), price: closes[i] }))
      .filter((p): p is { date: string; price: number } => p.price !== null && p.price > 0);

    return Response.json({
      price,
      previousClose: prevClose,
      change,
      changePercent,
      currency: meta.currency ?? 'USD',
      history,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Oil price fetch error:', err);
    return Response.json({ error: String(err) }, { status: 502 });
  }
}
