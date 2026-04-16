'use client';

import { useEffect, useState } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

export type StraitStatus = 'ACTIVE' | 'MONITORING' | 'DISRUPTED' | 'CLOSED';

export const STATUS_CONFIG: Record<StraitStatus, { label: string; color: string; pulse: string }> = {
  ACTIVE:     { label: 'Transit Active',      color: '#22c55e', pulse: '#22c55e40' },
  MONITORING: { label: 'Elevated Monitoring', color: '#f59e0b', pulse: '#f59e0b40' },
  DISRUPTED:  { label: 'Transit Disrupted',   color: '#ef4444', pulse: '#ef444440' },
  CLOSED:     { label: 'Strait Closed',       color: '#dc2626', pulse: '#dc262640' },
};

interface OilData {
  price: number;
  change: number;
  changePercent: number;
  currency: string;
  history: { date: string; price: number }[];
  timestamp: string;
}

interface Article {
  title: string;
  description: string | null;
  url: string;
  source: string;
  publishedAt: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function deriveStraitStatus(articles: Article[]): StraitStatus {
  const text = articles.map(a => `${a.title} ${a.description ?? ''}`).join(' ').toLowerCase();
  const closed   = ['closed', 'blockade', 'blockaded', 'halted transit', 'suspended transit', 'shut down'];
  const disrupted = ['seized', 'detained', 'tanker attack', 'ship attack', 'struck tanker', 'crisis'];
  const elevated  = ['tension', 'military exercise', 'warning', 'threat', 'intercept', 'risk'];
  if (closed.some(t => text.includes(t)))    return 'DISRUPTED';
  if (disrupted.some(t => text.includes(t))) return 'DISRUPTED';
  if (elevated.some(t => text.includes(t)))  return 'MONITORING';
  return 'MONITORING'; // default: known tension zone
}

// ─── Sparkline chart ──────────────────────────────────────────────────────────

function PriceChart({ history }: { history: { date: string; price: number }[] }) {
  if (history.length < 2) return null;

  const prices = history.map(h => h.price);
  const minP = Math.min(...prices);
  const maxP = Math.max(...prices);
  const rangeP = maxP - minP || 1;

  const W = 400;
  const H = 72;
  const PAD_X = 2;
  const PAD_Y = 6;

  const cx = (i: number) => PAD_X + (i / (prices.length - 1)) * (W - PAD_X * 2);
  const cy = (p: number) => PAD_Y + (1 - (p - minP) / rangeP) * (H - PAD_Y * 2);

  const d = prices.map((p, i) => `${i === 0 ? 'M' : 'L'}${cx(i).toFixed(1)},${cy(p).toFixed(1)}`).join(' ');
  const area = `${d} L${cx(prices.length - 1).toFixed(1)},${H} L${cx(0).toFixed(1)},${H} Z`;

  const lastX = cx(prices.length - 1);
  const lastY = cy(prices[prices.length - 1]);
  const minY = cy(minP);
  const maxY = cy(maxP);

  const STROKE = '#f0a030';

  return (
    <div className="relative w-full" style={{ height: H }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-full"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="oilGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={STROKE} stopOpacity="0.3" />
            <stop offset="100%" stopColor={STROKE} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {/* Area fill */}
        <path d={area} fill="url(#oilGrad)" />
        {/* Line */}
        <path d={d} fill="none" stroke={STROKE} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
        {/* End dot */}
        <circle cx={lastX} cy={lastY} r="3" fill={STROKE} />
        {/* Min/max guide lines */}
        <line x1={PAD_X} y1={maxY.toFixed(1)} x2={W - PAD_X} y2={maxY.toFixed(1)}
          stroke="white" strokeOpacity="0.06" strokeWidth="1" strokeDasharray="3 4" />
        <line x1={PAD_X} y1={minY.toFixed(1)} x2={W - PAD_X} y2={minY.toFixed(1)}
          stroke="white" strokeOpacity="0.06" strokeWidth="1" strokeDasharray="3 4" />
      </svg>
      {/* Min / max labels */}
      <span className="absolute right-1 font-mono text-[9px] text-white/25"
        style={{ top: maxY - 2 }}>
        ${maxP.toFixed(0)}
      </span>
      <span className="absolute right-1 font-mono text-[9px] text-white/25"
        style={{ top: minY - 12 }}>
        ${minP.toFixed(0)}
      </span>
    </div>
  );
}

// ─── Map legend ───────────────────────────────────────────────────────────────

const MAP_LEGEND = [
  { color: '#c0392b', label: 'Tanker' },
  { color: '#27ae60', label: 'Cargo' },
  { color: '#2980b9', label: 'Passenger' },
  { color: '#e67e22', label: 'Tug / Support' },
  { color: '#7f8c8d', label: 'Other / Unknown' },
];

// ─── Section label ────────────────────────────────────────────────────────────

function Label({ children }: { children: string }) {
  return (
    <div className="font-mono text-[10px] tracking-widest text-white/30 uppercase mb-3">
      {children}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  onStatusChange: (s: StraitStatus) => void;
}

export default function IntelPanel({ onStatusChange }: Props) {
  const [oil, setOil]           = useState<OilData | null>(null);
  const [oilErr, setOilErr]     = useState(false);
  const [oilLoading, setOilL]   = useState(true);

  const [articles, setArticles] = useState<Article[]>([]);
  const [newsErr, setNewsErr]   = useState(false);
  const [newsLoading, setNewsL] = useState(true);

  useEffect(() => {
    const fetchOil = async () => {
      try {
        const res  = await fetch('/api/oil-price');
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        setOil(data);
        setOilErr(false);
      } catch { setOilErr(true); }
      finally  { setOilL(false); }
    };

    const fetchNews = async () => {
      try {
        const res  = await fetch('/api/news');
        const data = await res.json();
        const arts = data.articles ?? [];
        setArticles(arts);
        onStatusChange(deriveStraitStatus(arts));
        setNewsErr(false);
      } catch { setNewsErr(true); }
      finally  { setNewsL(false); }
    };

    fetchOil();
    fetchNews();

    const t1 = setInterval(fetchOil,  5 * 60 * 1000);
    const t2 = setInterval(fetchNews, 15 * 60 * 1000);
    return () => { clearInterval(t1); clearInterval(t2); };
  }, [onStatusChange]);

  const up = oil ? oil.change >= 0 : null;
  const periodChange = oil?.history?.length
    ? ((oil.price - oil.history[0].price) / oil.history[0].price) * 100
    : null;

  return (
    <div className="flex flex-col divide-y divide-white/10 overflow-y-auto h-full">

      {/* ── 1. Situation overview ──────────────────────────────────────── */}
      <div className="p-5 bg-white/[0.03] shrink-0">
        <Label>What you're looking at</Label>
        <p className="font-mono text-xs text-white/70 leading-relaxed">
          The <span className="text-white/90 font-semibold">Strait of Hormuz</span> — a 33 km-wide
          waterway between Iran and Oman — is the world's most critical oil chokepoint.
          Roughly <span className="text-white/90">20–21% of global petroleum</span> transits
          here daily, making it a key indicator of energy market stability.
        </p>
        <p className="font-mono text-xs text-white/45 leading-relaxed mt-2">
          Map: MarineTraffic live AIS data &ensp;·&ensp;
          Price: ICE Brent futures (BZ=F) &ensp;·&ensp;
          News: refreshes every 15 min
        </p>
      </div>

      {/* ── 2. Brent crude ────────────────────────────────────────────── */}
      <div className="p-5 shrink-0">
        <Label>Brent Crude — 30-day trend</Label>
        {oilLoading && <div className="font-mono text-xs text-white/30 animate-pulse">Fetching price…</div>}
        {!oilLoading && oilErr && <div className="font-mono text-xs text-red-400/70">Price unavailable</div>}
        {!oilLoading && oil && (
          <>
            <div className="flex items-end gap-3 mb-1">
              <span className="font-mono text-4xl font-bold text-white/90 tracking-tight">
                ${oil.price.toFixed(2)}
              </span>
              <div className="pb-1">
                <span className={`font-mono text-sm ${up ? 'text-green-400' : 'text-red-400'}`}>
                  {up ? '▲' : '▼'} {up ? '+' : ''}{oil.change.toFixed(2)} ({up ? '+' : ''}{oil.changePercent.toFixed(2)}%)
                </span>
                <div className="font-mono text-[10px] text-white/25">today vs prev close</div>
              </div>
            </div>

            {/* Sparkline */}
            <div className="mt-3 mb-1">
              <PriceChart history={oil.history} />
            </div>

            <div className="flex justify-between font-mono text-[10px] text-white/30 mt-1">
              <span>{oil.history[0]?.date ?? '—'}</span>
              {periodChange !== null && (
                <span className={periodChange >= 0 ? 'text-orange-400/70' : 'text-blue-400/70'}>
                  {periodChange >= 0 ? '+' : ''}{periodChange.toFixed(1)}% over 30 days
                </span>
              )}
              <span>today</span>
            </div>
          </>
        )}
      </div>

      {/* ── 3. Map legend ─────────────────────────────────────────────── */}
      <div className="p-5 shrink-0">
        <Label>Map vessel key</Label>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
          {MAP_LEGEND.map(({ color, label }) => (
            <div key={label} className="flex items-center gap-2">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ background: color, boxShadow: `0 0 4px ${color}80` }}
              />
              <span className="font-mono text-[11px] text-white/55">{label}</span>
            </div>
          ))}
        </div>
        <p className="font-mono text-[10px] text-white/25 mt-3 leading-relaxed">
          Colors reflect vessel type declared in AIS broadcast. Military vessels may not broadcast.
        </p>
      </div>

      {/* ── 4. News feed ──────────────────────────────────────────────── */}
      <div className="p-5 flex-1">
        <Label>Latest intelligence</Label>
        {newsLoading && <div className="font-mono text-xs text-white/30 animate-pulse">Loading feed…</div>}
        {!newsLoading && newsErr && <div className="font-mono text-xs text-red-400/70">News feed unavailable</div>}
        {!newsLoading && !newsErr && articles.length === 0 && (
          <div className="font-mono text-xs text-white/30">No relevant articles found</div>
        )}
        {!newsLoading && articles.length > 0 && (
          <div className="space-y-5">
            {articles.map((a, i) => (
              <a key={i} href={a.url} target="_blank" rel="noopener noreferrer" className="block group">
                <div className="font-mono text-[10px] text-white/25 mb-1">
                  {a.source}&ensp;·&ensp;{timeAgo(a.publishedAt)}
                </div>
                <div className="font-mono text-xs text-white/65 group-hover:text-white/90 leading-relaxed transition-colors duration-150">
                  {a.title}
                </div>
              </a>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
