export const dynamic = 'force-dynamic';

// ─── Alpha Vantage (primary, if key is configured) ───────────────────────────
// Free tier: 25 req/day. We call twice (Brent + WTI), so cache at module level
// for 12 hours to stay well within limits.

interface AvCacheEntry {
  brentHistory: { date: string; value: number }[];
  wtiHistory:   { date: string; value: number }[];
  timestamp: number;
}
let avCache: AvCacheEntry | null = null;
const AV_TTL_MS = 12 * 60 * 60 * 1000;

async function fetchAlphaVantage(apiKey: string) {
  if (avCache && Date.now() - avCache.timestamp < AV_TTL_MS) return avCache;

  const fetchSeries = async (fn: string) => {
    const url = `https://www.alphavantage.co/query?function=${fn}&interval=daily&apikey=${apiKey}`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`Alpha Vantage ${fn} → ${res.status}`);
    const data = await res.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows: { date: string; value: string }[] = (data as any).data ?? [];
    if (!rows.length) throw new Error(`Alpha Vantage ${fn}: empty response`);
    return rows
      .filter(r => r.value !== '.')
      .map(r => ({ date: r.date, value: parseFloat(r.value) }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-75); // up to 75 trading days
  };

  const [brentHistory, wtiHistory] = await Promise.all([
    fetchSeries('BRENT'),
    fetchSeries('WTI'),
  ]);

  avCache = { brentHistory, wtiHistory, timestamp: Date.now() };
  return avCache;
}

// ─── Yahoo Finance (fallback) ─────────────────────────────────────────────────

async function fetchYahoo(symbol: string) {
  const res = await fetch(
    `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=3mo&includePrePost=false`,
    {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'application/json',
      },
      cache: 'no-store',
    },
  );
  if (!res.ok) throw new Error(`Yahoo Finance ${symbol} → ${res.status}`);
  return res.json();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractYahoo(data: any) {
  const result = data?.chart?.result?.[0];
  const meta   = result?.meta;
  if (!meta?.regularMarketPrice) throw new Error('No price data');

  const price       = meta.regularMarketPrice as number;
  const prevClose   = (meta.chartPreviousClose ?? meta.previousClose ?? price) as number;
  const change      = price - prevClose;
  const changePercent = prevClose !== 0 ? (change / prevClose) * 100 : 0;

  const timestamps: number[]      = result?.timestamp ?? [];
  const closes: (number | null)[] = result?.indicators?.quote?.[0]?.close ?? [];
  const history = timestamps
    .map((ts, i) => ({ date: new Date(ts * 1000).toISOString().slice(0, 10), value: closes[i] }))
    .filter((p): p is { date: string; value: number } => p.value !== null && p.value > 0);

  return { price, prevClose, change, changePercent, currency: (meta.currency ?? 'USD') as string, history };
}

export async function GET() {
  try {
    const avKey = process.env.ALPHA_VANTAGE_API_KEY;

    // ── Try Alpha Vantage first ──
    if (avKey) {
      try {
        const av = await fetchAlphaVantage(avKey);
        const brentHistory = av.brentHistory;
        const wtiHistory   = av.wtiHistory;

        const latestBrent = brentHistory[brentHistory.length - 1];
        const prevBrent   = brentHistory[brentHistory.length - 2];
        const brentPrice  = latestBrent.value;
        const brentPrev   = prevBrent?.value ?? brentPrice;
        const brentChange = brentPrice - brentPrev;
        const brentPct    = brentPrev !== 0 ? (brentChange / brentPrev) * 100 : 0;

        const latestWti = wtiHistory[wtiHistory.length - 1];
        const prevWti   = wtiHistory[wtiHistory.length - 2];
        const wtiPrice  = latestWti.value;
        const wtiPrev   = prevWti?.value ?? wtiPrice;
        const wtiChange = wtiPrice - wtiPrev;
        const wtiPct    = wtiPrev !== 0 ? (wtiChange / wtiPrev) * 100 : 0;

        return Response.json({
          brent: { price: brentPrice, change: brentChange, changePercent: brentPct, currency: 'USD', history: brentHistory },
          wti:   { price: wtiPrice,   change: wtiChange,   changePercent: wtiPct,   currency: 'USD' },
          source: 'alpha_vantage',
          timestamp: new Date().toISOString(),
        });
      } catch (avErr) {
        console.warn('Alpha Vantage failed, falling back to Yahoo Finance:', avErr);
      }
    }

    // ── Fallback: Yahoo Finance ──
    const [brentData, wtiData] = await Promise.all([
      fetchYahoo('BZ=F'),
      fetchYahoo('CL=F'),
    ]);

    const brent = extractYahoo(brentData);
    const wti   = extractYahoo(wtiData);

    return Response.json({
      brent: { price: brent.price, change: brent.change, changePercent: brent.changePercent, currency: brent.currency, history: brent.history },
      wti:   { price: wti.price,   change: wti.change,   changePercent: wti.changePercent,   currency: wti.currency },
      source: 'yahoo_finance',
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Oil price error:', err);
    return Response.json({ error: String(err) }, { status: 502 });
  }
}
