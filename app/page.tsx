'use client';

import { useEffect, useState, useCallback, type ReactNode } from 'react';
import HeadlineMetrics from '@/components/HeadlineMetrics';
import AIAssessment from '@/components/AIAssessment';
import SignalBreakdown from '@/components/SignalBreakdown';
import TransitChart from '@/components/TransitChart';
import IncidentLog from '@/components/IncidentLog';
import CarrierStatus from '@/components/CarrierStatus';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface OilData {
  brent: { price: number; change: number; changePercent: number; currency: string; history: { date: string; value: number }[] };
  wti:   { price: number; change: number; changePercent: number; currency: string };
  timestamp?: string;
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
  intro: string; direction: string; directionText: string;
  primaryDriver: string; contrarian: string; changeCondition: string;
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
  MINIMAL:  'var(--improving-text)',
  ELEVATED: 'var(--warning-text)',
  HIGH:     'var(--warning)',
  CRITICAL: 'var(--critical-text)',
  SEVERE:   'var(--critical)',
};

const BORDER = '0.5px solid var(--border)';

// Which signal IDs still appear in the breakdown — the rest are shown elsewhere
// (transit → headline + chart; insurance → headline; carriers → carrier panel).
const BREAKDOWN_SIGNAL_IDS = ['physical_threat', 'political', 'dark'];

function timeAgo(iso: string): string {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC',
  });
}

// Parse **markers** produced by the LLM and render as emphasised spans.
function renderBriefing(text: string): ReactNode[] {
  const parts = text.split(/\*\*(.+?)\*\*/g);
  return parts.map((part, i) =>
    i % 2 === 1
      ? (
        <strong
          key={i}
          style={{ color: 'var(--text)', fontWeight: 600 }}
        >
          {part}
        </strong>
      )
      : <span key={i}>{part}</span>,
  );
}

// ─── Small UI atoms ────────────────────────────────────────────────────────────

function SectionHeader({ label, updatedAt }: { label: string; updatedAt?: string | null }) {
  return (
    <div className="flex items-center justify-between mb-5">
      <div className="sec-label" style={{ marginBottom: 0 }}>{label}</div>
      {updatedAt && (
        <span
          className="font-mono shrink-0 ml-4"
          style={{ fontSize: 'var(--text-label)', color: 'var(--faint)' }}
        >
          {timeAgo(updatedAt)}
        </span>
      )}
    </div>
  );
}

// ─── Component ─────────────────────────────────────────────────────────────────

export default function Home() {
  const [oil,      setOil]      = useState<OilData | null>(null);
  const [signals,  setSignals]  = useState<SignalsData | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisData | null>(null);
  const [articles, setArticles] = useState<Article[]>([]);
  const [newsUpdatedAt, setNewsUpdatedAt] = useState<string | null>(null);

  const riskLevel = signals?.riskLevel ?? 'CRITICAL';
  const riskColor = RISK_COLOR[riskLevel] ?? RISK_COLOR.CRITICAL;

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
    }
    if (anaRes.status === 'fulfilled' && anaRes.value.ok) {
      setAnalysis(await anaRes.value.json());
    }
    if (newsRes.status === 'fulfilled' && newsRes.value.ok) {
      const d = await newsRes.value.json();
      setArticles(d.articles ?? []);
      setNewsUpdatedAt(new Date().toISOString());
    }
  }, []);

  useEffect(() => {
    load();
    const t1 = setInterval(() => {
      fetch('/api/oil-price').then(r => r.json()).then(d => { if (!d.error) setOil(d); });
      fetch('/api/signals').then(r => r.json()).then((d: SignalsData) => setSignals(d));
    }, 5 * 60 * 1000);
    const t2 = setInterval(() => {
      fetch('/api/news').then(r => r.json()).then(d => {
        setArticles(d.articles ?? []);
        setNewsUpdatedAt(new Date().toISOString());
      });
    }, 15 * 60 * 1000);
    return () => { clearInterval(t1); clearInterval(t2); };
  }, [load]);

  const filteredSignals = (signals?.signals ?? [])
    .filter(s => BREAKDOWN_SIGNAL_IDS.includes(s.id));

  const headerTime = signals?.timestamp
    ? `Analysed ${new Date(signals.timestamp).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })} UTC · ${formatDate(signals.timestamp)}`
    : 'loading…';

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)', color: 'var(--text)' }}>

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-50 flex items-center justify-between px-8 h-[52px]"
        style={{
          borderBottom: BORDER,
          background: 'rgba(8,17,30,0.94)',
          backdropFilter: 'blur(16px)',
        }}
      >
        <div className="flex items-baseline gap-2.5">
          <span
            className="font-bold tracking-[0.04em]"
            style={{ fontSize: 15 }}
          >
            Hormuz Intelligence
          </span>
          <span style={{ fontSize: 'var(--text-secondary)', color: 'var(--faint)' }}>
            Strait risk monitor
          </span>
        </div>
        <div className="flex items-center gap-4">
          <div
            className="flex items-center gap-1.5 font-mono"
            style={{ fontSize: 'var(--text-label)', color: 'var(--faint)' }}
          >
            <span
              className="inline-block rounded-full animate-pulse"
              style={{
                width: 6, height: 6,
                background: 'var(--critical)',
                boxShadow: '0 0 6px var(--critical)',
              }}
            />
            {headerTime}
          </div>
          <div
            className="font-mono tracking-[0.1em] px-2.5 py-1 rounded-[4px]"
            style={{
              fontSize: 'var(--text-label)',
              background: 'var(--critical-bg)',
              border: '1px solid var(--critical-border)',
              color: riskColor,
            }}
          >
            {(signals?.riskPhrase ?? 'Effective Closure').toUpperCase()} · DETERIORATING
          </div>
        </div>
      </header>

      {/* ── Hourly briefing (LLM-generated) ─────────────────────────────── */}
      <section className="px-8 py-10" style={{ borderBottom: BORDER }}>
        <div className="flex items-baseline justify-between mb-5">
          <div className="sec-label" style={{ marginBottom: 0 }}>
            Hourly briefing
          </div>
          {analysis?.generatedAt && (
            <span
              className="font-mono shrink-0 ml-4"
              style={{ fontSize: 'var(--text-label)', color: 'var(--faint)' }}
            >
              {timeAgo(analysis.generatedAt)}
            </span>
          )}
        </div>

        {analysis?.structured?.intro ? (
          <p
            style={{
              fontSize: 'var(--text-hero)',
              lineHeight: 1.6,
              color: 'rgba(221,234,245,0.78)',
              fontWeight: 400,
            }}
          >
            {renderBriefing(analysis.structured.intro)}
          </p>
        ) : (
          <div>
            <div className="h-5 rounded animate-pulse mb-3" style={{ background: 'rgba(221,234,245,0.07)', width: '96%' }} />
            <div className="h-5 rounded animate-pulse mb-3" style={{ background: 'rgba(221,234,245,0.07)', width: '88%' }} />
            <div className="h-5 rounded animate-pulse" style={{ background: 'rgba(221,234,245,0.07)', width: '72%' }} />
          </div>
        )}
      </section>

      {/* ── Headline metrics (vitals) ───────────────────────────────────── */}
      <HeadlineMetrics
        transitCount={signals?.keyFigures.transitCount ?? null}
        brentPrice={oil?.brent.price ?? null}
        brentPct={oil?.brent.changePercent ?? null}
        freightRate={signals?.keyFigures.freightRate ?? null}
      />

      {/* ── Incident log (hero + chronological) ─────────────────────────── */}
      <IncidentLog incidents={signals?.incidents ?? []} />

      {/* ── AI Risk Assessment ──────────────────────────────────────────── */}
      <AIAssessment analysis={analysis} />

      {/* ── Transit chart ───────────────────────────────────────────────── */}
      <div className="px-8 py-8" style={{ borderBottom: BORDER }}>
        <SectionHeader
          label={`Daily transits · 1 Feb to ${signals ? formatDate(signals.timestamp).split(' ').slice(0, 2).join(' ') : '—'} 2026`}
          updatedAt={signals?.timestamp}
        />
        <TransitChart history={signals?.transitHistory ?? []} />
      </div>

      {/* ── Signal breakdown (3 cards only) ─────────────────────────────── */}
      <div className="px-8 py-8" style={{ borderBottom: BORDER }}>
        <SectionHeader label="Risk signal breakdown" updatedAt={signals?.timestamp} />
        <SignalBreakdown signals={filteredSignals} />
      </div>

      {/* ── Carriers + Pipelines ────────────────────────────────────────── */}
      <CarrierStatus
        carriers={signals?.carriers ?? []}
        pipelines={signals?.pipelines ?? []}
      />

      {/* ── News feed ───────────────────────────────────────────────────── */}
      <div className="px-8 pt-8 pb-4" style={{ borderBottom: BORDER }}>
        <SectionHeader label="Live news feed" updatedAt={newsUpdatedAt} />
        {articles.length === 0 && (
          <div
            className="font-mono mb-6 animate-pulse"
            style={{ fontSize: 'var(--text-label)', color: 'var(--faint)' }}
          >
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
              className="block group transition-colors"
              style={{
                padding: '0 0 22px',
                paddingRight: (i + 1) % 3 !== 0 ? 28 : 0,
                borderRight: (i + 1) % 3 !== 0 ? BORDER : 'none',
                marginBottom: i < 3 ? 22 : 0,
                borderBottom: i < 3 ? BORDER : 'none',
                paddingLeft: i % 3 !== 0 ? 28 : 0,
              }}
            >
              <div
                className="font-mono mb-2 tracking-[0.06em] uppercase"
                style={{ fontSize: 'var(--text-label)', color: 'var(--faint)' }}
              >
                {a.source} · {timeAgo(a.publishedAt)}
              </div>
              <div
                className="leading-[1.55] group-hover:text-white transition-colors"
                style={{ fontSize: 'var(--text-body)', color: 'var(--muted)' }}
              >
                {a.title}
              </div>
            </a>
          ))}
        </div>
      </div>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer className="flex items-center justify-between px-8 py-5">
        <p
          className="font-mono leading-relaxed"
          style={{ fontSize: 'var(--text-label)', color: 'var(--faint)' }}
        >
          Live: Brent/WTI (Alpha Vantage/Yahoo) · News (NewsAPI, trusted sources) ·
          AI by Claude (Anthropic) · Simulated figures labelled SIM
        </p>
        <p
          className="font-mono"
          style={{ fontSize: 'var(--text-label)', color: 'var(--faint)' }}
        >
          Not investment or legal advice · For professional use only
        </p>
      </footer>

    </div>
  );
}
