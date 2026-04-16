'use client';

import { useEffect, useState, useCallback } from 'react';
import HeadlineMetrics from '@/components/HeadlineMetrics';
import AIAssessment from '@/components/AIAssessment';
import SignalBreakdown from '@/components/SignalBreakdown';
import TransitChart from '@/components/TransitChart';
import IncidentCarrierPanel from '@/components/IncidentCarrierPanel';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface OilData {
  brent: { price: number; change: number; changePercent: number; currency: string; history: { date: string; value: number }[] };
  wti:   { price: number; change: number; changePercent: number; currency: string };
}

interface Signal {
  id: string; label: string; value: string; baseline: string | null;
  severity: number; direction: 'WORSENING' | 'STABLE' | 'IMPROVING'; summary: string;
}

interface Incident {
  date: string; vessel: string; type: string; flag: string;
  event: string; severity: 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW'; simulated: boolean;
}

interface Pipeline {
  name: string; region: string; capacity_mbd: number;
  utilisation: number; trend: 'RISING' | 'STABLE' | 'FALLING'; note: string;
}

interface Carrier {
  name: string; status: 'SUSPENDED' | 'LIMITED' | 'NORMAL'; since: string; note: string;
}

interface SignalsData {
  riskLevel: string; riskPhrase: string; signals: Signal[];
  incidents: Incident[]; pipelines: Pipeline[]; carriers: Carrier[];
  transitHistory: { date: string; value: number }[];
  freightHistory:  { date: string; value: number }[];
  keyFigures: { transitCount: number; freightRate: number; darkVessels: number };
  timestamp: string;
}

interface StructuredAnalysis {
  direction: string; directionText: string; primaryDriver: string;
  contrarian: string; changeCondition: string;
}

interface AnalysisData {
  structured: StructuredAnalysis | null; inputs?: object;
  generatedAt: string; cached: boolean; error?: string;
}

interface Article {
  title: string; url: string; source: string; publishedAt: string;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

const RISK_COLOR: Record<string, string> = {
  MINIMAL: '#86efac', ELEVATED: '#fcd34d', HIGH: '#f59e0b',
  CRITICAL: '#fca5a5', SEVERE: '#ef4444',
};

const BORDER = '0.5px solid rgba(255,255,255,0.08)';

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return h < 24 ? `${h}h ago` : `${Math.floor(h / 24)}d ago`;
}

// ─── Component ─────────────────────────────────────────────────────────────────

export default function Home() {
  const [oil,      setOil]      = useState<OilData | null>(null);
  const [signals,  setSignals]  = useState<SignalsData | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisData | null>(null);
  const [articles, setArticles] = useState<Article[]>([]);
  const [updatedAt, setUpdatedAt] = useState<string>('—');

  const riskLevel = signals?.riskLevel ?? 'CRITICAL';
  const riskColor = RISK_COLOR[riskLevel] ?? RISK_COLOR.CRITICAL;

  const brentPrice = oil?.brent.price ?? null;

  const load = useCallback(async () => {
    const [oilRes, sigRes, anaRes, newsRes] = await Promise.allSettled([
      fetch('/api/oil-price'),
      fetch('/api/signals'),
      fetch('/api/analysis'),
      fetch('/api/news'),
    ]);

    if (oilRes.status === 'fulfilled' && oilRes.value.ok) {
      const d = await oilRes.value.json();
      if (!d.error) setOil(d);
    }
    if (sigRes.status === 'fulfilled' && sigRes.value.ok) {
      const d: SignalsData = await sigRes.value.json();
      setSignals(d);
      setUpdatedAt(new Date(d.timestamp).toISOString());
    }
    if (anaRes.status === 'fulfilled' && anaRes.value.ok) {
      setAnalysis(await anaRes.value.json());
    }
    if (newsRes.status === 'fulfilled' && newsRes.value.ok) {
      const d = await newsRes.value.json();
      setArticles(d.articles ?? []);
    }
  }, []);

  useEffect(() => {
    load();
    const t1 = setInterval(() => {
      fetch('/api/oil-price').then(r => r.json()).then(d => { if (!d.error) setOil(d); });
      fetch('/api/signals').then(r => r.json()).then((d: SignalsData) => {
        setSignals(d); setUpdatedAt(new Date(d.timestamp).toISOString());
      });
    }, 5 * 60 * 1000);
    const t2 = setInterval(() => {
      fetch('/api/news').then(r => r.json()).then(d => setArticles(d.articles ?? []));
    }, 15 * 60 * 1000);
    return () => { clearInterval(t1); clearInterval(t2); };
  }, [load]);

  const utcTime = updatedAt !== '—'
    ? new Date(updatedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }) + ' UTC'
    : '—';

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)', color: 'var(--text)' }}>

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-50 flex items-center justify-between px-8 h-[52px]"
        style={{ borderBottom: BORDER, background: 'rgba(8,17,30,0.94)', backdropFilter: 'blur(16px)' }}
      >
        <div className="flex items-baseline gap-2.5">
          <span className="text-[15px] font-bold tracking-[0.04em]">Hormuz Intelligence</span>
          <span className="text-[13px]" style={{ color: 'var(--faint)' }}>Strait risk monitor</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 font-mono text-[11px]" style={{ color: 'var(--faint)' }}>
            <span
              className="inline-block w-1.5 h-1.5 rounded-full animate-pulse"
              style={{ background: 'var(--red-text)', boxShadow: '0 0 6px #ef4444' }}
            />
            {updatedAt !== '—' ? `Analysed ${utcTime} · 16 Apr 2026` : 'loading…'}
          </div>
          <div
            className="font-mono text-[10px] tracking-[0.1em] px-2.5 py-1 rounded-[4px]"
            style={{
              background: `${riskColor}18`,
              border: `1px solid ${riskColor}45`,
              color: riskColor,
            }}
          >
            {(signals?.riskPhrase ?? 'Effective Closure').toUpperCase()} · DETERIORATING
          </div>
        </div>
      </header>

      {/* ── Intro statement ─────────────────────────────────────────────── */}
      <div className="px-8 py-8" style={{ borderBottom: BORDER }}>
        <p style={{ fontSize: 19, fontWeight: 500, lineHeight: 1.65, color: 'var(--text)', maxWidth: 780 }}>
          The Strait of Hormuz has been under{' '}
          <span style={{ color: 'var(--red-text)' }}>effective closure since 28 February 2026</span>.
          Transit activity is down 94%, war risk coverage is{' '}
          <span style={{ color: 'var(--red-text)' }}>unquotable</span>,
          and the ceasefire of 8 April{' '}
          <span style={{ color: 'var(--red-text)' }}>has collapsed</span> — leaving{' '}
          <span style={{ color: 'var(--amber-text)' }}>
            Brent at {typeof brentPrice === 'number' ? `$${brentPrice.toFixed(0)}` : '$118'} and VLCC rates at six times pre-crisis levels
          </span>.
        </p>
      </div>

      {/* ── AI Assessment ───────────────────────────────────────────────── */}
      <AIAssessment analysis={analysis} />

      {/* ── Headline metrics ────────────────────────────────────────────── */}
      <HeadlineMetrics
        transitCount={signals?.keyFigures.transitCount ?? null}
        brentPrice={oil?.brent.price ?? null}
        brentPct={oil?.brent.changePercent ?? null}
        freightRate={signals?.keyFigures.freightRate ?? null}
      />

      {/* ── Signal breakdown ────────────────────────────────────────────── */}
      <div className="px-8 py-8" style={{ borderBottom: BORDER }}>
        <div className="sec-label">Risk signal breakdown</div>
        <SignalBreakdown signals={signals?.signals ?? []} />
      </div>

      {/* ── Transit chart ───────────────────────────────────────────────── */}
      <div className="px-8 py-7" style={{ borderBottom: BORDER }}>
        <div className="flex items-center justify-between mb-4">
          <span className="font-mono text-[10px] tracking-[0.13em] uppercase" style={{ color: 'rgba(221,234,245,0.62)' }}>
            Daily transit count — 1 Feb to 16 Apr 2026
          </span>
          <div className="flex gap-5 items-center">
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-0.5 rounded" style={{ background: '#f59e0b' }} />
              <span className="font-mono text-[10px]" style={{ color: 'var(--faint)' }}>Vessels/day</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-4" style={{ height: 1, background: 'repeating-linear-gradient(90deg,rgba(221,234,245,0.2) 0,rgba(221,234,245,0.2) 4px,transparent 4px,transparent 7px)' }} />
              <span className="font-mono text-[10px]" style={{ color: 'var(--faint)' }}>Baseline (110)</span>
            </div>
          </div>
        </div>
        <TransitChart history={signals?.transitHistory ?? []} />
      </div>

      {/* ── Incident log + Carriers/Pipelines ───────────────────────────── */}
      <IncidentCarrierPanel
        incidents={signals?.incidents ?? []}
        carriers={signals?.carriers ?? []}
        pipelines={signals?.pipelines ?? []}
      />

      {/* ── News feed ───────────────────────────────────────────────────── */}
      <div className="px-8 pt-7 pb-2" style={{ borderBottom: BORDER }}>
        <div className="sec-label">Live news feed</div>
        {articles.length === 0 && (
          <div className="font-mono text-[11px] mb-6 animate-pulse" style={{ color: 'var(--faint)' }}>
            Loading feed…
          </div>
        )}
        <div className="grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
          {articles.slice(0, 6).map((a, i) => (
            <a
              key={i}
              href={a.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block"
              style={{
                padding: '0 0 22px',
                paddingRight: (i + 1) % 3 !== 0 ? 24 : 0,
                borderRight: (i + 1) % 3 !== 0 ? BORDER : 'none',
                marginBottom: i < 3 ? 22 : 0,
                borderBottom: i < 3 ? BORDER : 'none',
                paddingLeft: i % 3 !== 0 ? 24 : 0,
              }}
            >
              <div className="font-mono text-[10px] mb-2 tracking-[0.06em]" style={{ color: 'var(--faint)' }}>
                {a.source.toUpperCase()} · {timeAgo(a.publishedAt)}
              </div>
              <div className="text-[13px] leading-[1.6]" style={{ color: 'var(--muted)' }}>
                {a.title}
              </div>
            </a>
          ))}
        </div>
      </div>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer className="flex items-center justify-between px-8 py-4">
        <p className="font-mono text-[10px] leading-relaxed" style={{ color: 'var(--faint)' }}>
          Live data: Brent/WTI via Yahoo Finance · News via NewsAPI · AI assessment by Claude (Anthropic) · Simulated incidents labelled SIM
        </p>
        <p className="font-mono text-[10px]" style={{ color: 'var(--faint)' }}>
          Not investment or legal advice · For professional use only
        </p>
      </footer>

    </div>
  );
}
