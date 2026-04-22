'use client';

import Sparkline from './Sparkline';

// ─── Types ────────────────────────────────────────────────────────────────────

export type RiskLevel = 'MINIMAL' | 'ELEVATED' | 'HIGH' | 'CRITICAL' | 'SEVERE';

export const RISK_CONFIG: Record<RiskLevel, { color: string; bg: string }> = {
  MINIMAL:  { color: '#22c55e', bg: '#22c55e18' },
  ELEVATED: { color: '#f59e0b', bg: '#f59e0b18' },
  HIGH:     { color: '#f97316', bg: '#f9731618' },
  CRITICAL: { color: '#ef4444', bg: '#ef444418' },
  SEVERE:   { color: '#dc2626', bg: '#dc262618' },
};

export interface OilData {
  brent: { price: number; change: number; changePercent: number; currency: string; history: { date: string; value: number }[] };
  wti:   { price: number; change: number; changePercent: number; currency: string };
  timestamp: string;
}

export interface Signal {
  id: string;
  label: string;
  value: string;
  baseline: string | null;
  direction: 'WORSENING' | 'STABLE' | 'IMPROVING';
  summary: string;
}

export interface Incident {
  date: string;
  vessel: string;
  type: string;
  flag: string;
  event: string;
  severity: 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW';
  simulated: boolean;
}

export interface Pipeline {
  name: string;
  region: string;
  capacity_mbd: number;
  utilisation: number;
  trend: 'RISING' | 'STABLE' | 'FALLING';
  note: string;
}

export interface Carrier {
  name: string;
  status: 'SUSPENDED' | 'LIMITED' | 'NORMAL';
  since: string;
  note: string;
}

export interface SignalsData {
  riskLevel: RiskLevel;
  riskPhrase: string;
  signals: Signal[];
  incidents: Incident[];
  pipelines: Pipeline[];
  carriers: Carrier[];
  transitHistory: { date: string; value: number }[];
  freightHistory: { date: string; value: number }[];
  keyFigures: { transitCount: number; freightRate: number; darkVessels: number };
  timestamp: string;
}

export interface AnalysisData {
  text: string | null;
  inputs: object;
  generatedAt: string;
  cached: boolean;
  error?: string;
}

interface Props {
  oil:      OilData | null;
  signals:  SignalsData | null;
  analysis: AnalysisData | null;
  articles: { title: string; url: string; source: string; publishedAt: string }[];
  onRiskChange: (level: RiskLevel, phrase: string) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DIR_COLOUR = { WORSENING: '#ef4444', STABLE: '#f59e0b', IMPROVING: '#22c55e' } as const;
const DIR_SYMBOL = { WORSENING: '▲',       STABLE: '—',       IMPROVING: '▼'       } as const;

const SEV_COLOUR = {
  CRITICAL: '#ef4444',
  HIGH:     '#f97316',
  MODERATE: '#f59e0b',
  LOW:      '#6b7280',
} as const;

function Label({ children }: { children: string }) {
  return <div className="font-mono text-[9px] tracking-widest text-white/25 uppercase mb-3">{children}</div>;
}

function Divider() {
  return <div className="border-t border-white/10" />;
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function IntelPanel({ oil, signals, analysis, articles, onRiskChange }: Props) {
  const brentUp = oil ? oil.brent.change >= 0 : null;
  const wtiUp   = oil ? oil.wti.change   >= 0 : null;

  const risk = signals?.riskLevel ?? 'CRITICAL';
  const riskCfg = RISK_CONFIG[risk as RiskLevel] ?? RISK_CONFIG.CRITICAL;

  // Inject live oil values into signals
  const enrichedSignals: Signal[] = (signals?.signals ?? []).map(s => {
    if (s.id === 'brent' && oil) {
      return {
        ...s,
        value: `$${oil.brent.price.toFixed(2)} (${brentUp ? '+' : ''}${oil.brent.changePercent.toFixed(1)}% today)`,
      };
    }
    return s;
  });

  return (
    <div className="flex flex-col divide-y divide-white/10 h-full overflow-y-auto">

      {/* ── AI Risk Assessment ───────────────────────────────────────────── */}
      <section className="p-5 shrink-0" style={{ background: riskCfg.bg }}>
        <div className="flex items-center justify-between mb-3">
          <Label>AI Risk Assessment</Label>
          {analysis?.generatedAt && (
            <span className="font-mono text-[9px] text-white/25">
              {analysis.cached ? 'cached · ' : ''}{timeAgo(analysis.generatedAt)}
            </span>
          )}
        </div>

        {!analysis && (
          <div className="font-mono text-xs text-white/30 animate-pulse">Generating assessment…</div>
        )}
        {analysis?.error && !analysis.text && (
          <div className="font-mono text-xs text-white/30">
            Assessment unavailable — add <code className="text-amber-400/70">ANTHROPIC_API_KEY</code> to .env.local
          </div>
        )}
        {analysis?.text && (
          <p className="font-mono text-[13px] text-white/85 leading-relaxed">{analysis.text}</p>
        )}

        <div className="mt-3 font-mono text-[9px] text-white/25">
          AI-GENERATED · CLAUDE · FOR PROFESSIONAL USE ONLY
        </div>
      </section>

      <Divider />

      {/* ── Risk Signal Breakdown ─────────────────────────────────────────── */}
      <section className="p-5 shrink-0">
        <Label>Risk Signal Breakdown</Label>
        {!signals && <div className="font-mono text-xs text-white/30 animate-pulse">Loading…</div>}
        {enrichedSignals.length > 0 && (
          <div className="space-y-3">
            {enrichedSignals.map(s => (
              <div key={s.id} className="grid grid-cols-[1fr_auto] gap-x-3 items-start">
                <div>
                  <div className="font-mono text-[11px] text-white/70 leading-tight">{s.label}</div>
                  <div className="font-mono text-[10px] text-white/35 leading-snug mt-0.5">{s.summary}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-mono text-[11px] text-white/80 leading-tight whitespace-nowrap">{s.value}</div>
                  <div
                    className="font-mono text-[10px] leading-snug"
                    style={{ color: DIR_COLOUR[s.direction] }}
                  >
                    {DIR_SYMBOL[s.direction]} {s.direction}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        {signals?.keyFigures && (
          <div className="mt-3 font-mono text-[9px] text-white/20 leading-relaxed">
            Baselines: 110 transits/day · $28k/day AG-East · 0.05% war risk premium (pre-crisis)
          </div>
        )}
      </section>

      <Divider />

      {/* ── Incident Log ─────────────────────────────────────────────────── */}
      <section className="p-5 shrink-0">
        <Label>Incident Log</Label>
        {!signals && <div className="font-mono text-xs text-white/30 animate-pulse">Loading…</div>}
        {(signals?.incidents ?? []).map((inc, i) => (
          <div key={i} className="mb-4 last:mb-0">
            <div className="flex items-center gap-2 mb-1">
              <span
                className="font-mono text-[9px] font-bold tracking-widest px-1.5 py-0.5"
                style={{ color: SEV_COLOUR[inc.severity], border: `1px solid ${SEV_COLOUR[inc.severity]}40`, background: `${SEV_COLOUR[inc.severity]}12` }}
              >
                {inc.severity}
              </span>
              <span className="font-mono text-[10px] text-white/35">{inc.date}</span>
              {inc.simulated && (
                <span className="font-mono text-[9px] text-white/20">SIMULATED</span>
              )}
            </div>
            <div className="font-mono text-[11px] text-white/75 leading-tight">
              <span className="text-white/90 font-semibold">{inc.vessel}</span>
              {' '}· {inc.type} · {inc.flag}
            </div>
            <div className="font-mono text-[10px] text-white/45 leading-snug mt-0.5">{inc.event}</div>
          </div>
        ))}
      </section>

      <Divider />

      {/* ── Charts row ───────────────────────────────────────────────────── */}
      <section className="p-5 shrink-0">
        <div className="grid grid-cols-2 gap-4">

          {/* Transit count */}
          <div>
            <Label>Daily Transits — 30 days</Label>
            {signals?.transitHistory && (
              <>
                <Sparkline
                  values={signals.transitHistory.map(p => p.value)}
                  color="#ef4444"
                  height={52}
                />
                <div className="flex justify-between font-mono text-[9px] text-white/25 mt-1">
                  <span>110/day</span>
                  <span style={{ color: '#ef4444' }}>{signals.keyFigures.transitCount}/day now</span>
                </div>
              </>
            )}
            {/* Oil prices below transit chart */}
            {oil && (
              <div className="mt-3 space-y-1.5">
                <div className="flex justify-between font-mono text-[10px]">
                  <span className="text-white/40">BRENT</span>
                  <span className="text-white/75">
                    ${oil.brent.price.toFixed(2)}
                    <span className={`ml-1 ${brentUp ? 'text-green-400' : 'text-red-400'}`}>
                      {brentUp ? '▲' : '▼'}{Math.abs(oil.brent.changePercent).toFixed(1)}%
                    </span>
                  </span>
                </div>
                <div className="flex justify-between font-mono text-[10px]">
                  <span className="text-white/40">WTI</span>
                  <span className="text-white/75">
                    ${oil.wti.price.toFixed(2)}
                    <span className={`ml-1 ${wtiUp ? 'text-green-400' : 'text-red-400'}`}>
                      {wtiUp ? '▲' : '▼'}{Math.abs(oil.wti.changePercent).toFixed(1)}%
                    </span>
                  </span>
                </div>
                <Sparkline
                  values={oil.brent.history.map(p => p.value)}
                  color="#f0a030"
                  height={36}
                />
                <div className="font-mono text-[9px] text-white/20">ICE Brent 30-day</div>
              </div>
            )}
          </div>

          {/* Freight rate */}
          <div>
            <Label>AG–East VLCC Rate — 30 days</Label>
            {signals?.freightHistory && (
              <>
                <Sparkline
                  values={signals.freightHistory.map(p => p.value / 1000)}
                  color="#f97316"
                  height={52}
                />
                <div className="flex justify-between font-mono text-[9px] text-white/25 mt-1">
                  <span>$28k/day</span>
                  <span style={{ color: '#f97316' }}>
                    ${(signals.keyFigures.freightRate / 1000).toFixed(0)}k now
                  </span>
                </div>
                <div className="mt-3 font-mono text-[10px] text-white/35 leading-relaxed">
                  War risk premium: <span className="text-red-400">UNQUOTABLE (VLCC/LR2)</span>
                  <br />Last quoted: 5.2% hull value
                  <br />Dark vessels (24 h): {signals.keyFigures.darkVessels}
                </div>
              </>
            )}
          </div>

        </div>
      </section>

      <Divider />

      {/* ── Pipeline bypass ──────────────────────────────────────────────── */}
      <section className="p-5 shrink-0">
        <Label>Bypass Pipeline Utilisation</Label>
        {(signals?.pipelines ?? []).map(p => (
          <div key={p.name} className="mb-4 last:mb-0">
            <div className="flex justify-between font-mono text-[10px] mb-1">
              <span className="text-white/70">{p.name}</span>
              <span className="text-white/35">{p.region} · {p.capacity_mbd}mb/d cap.</span>
            </div>
            {/* Utilisation bar */}
            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden mb-1">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${p.utilisation * 100}%`,
                  background: p.utilisation > 0.8 ? '#f97316' : p.utilisation > 0.5 ? '#f59e0b' : '#22c55e',
                }}
              />
            </div>
            <div className="flex justify-between font-mono text-[9px]">
              <span className="text-white/35">{p.note}</span>
              <span className="text-white/50">{Math.round(p.utilisation * 100)}%</span>
            </div>
          </div>
        ))}
      </section>

      <Divider />

      {/* ── Carrier advisories ───────────────────────────────────────────── */}
      <section className="p-5 shrink-0">
        <Label>Carrier Advisories</Label>
        <div className="space-y-3">
          {(signals?.carriers ?? []).map(c => (
            <div key={c.name} className="grid grid-cols-[5rem_auto] gap-x-3 items-start">
              <div>
                <div className="font-mono text-[10px] text-white/70">{c.name}</div>
                <div
                  className="font-mono text-[9px] tracking-widest mt-0.5"
                  style={{
                    color: c.status === 'SUSPENDED' ? '#ef4444'
                         : c.status === 'LIMITED'   ? '#f59e0b'
                         :                            '#22c55e',
                  }}
                >
                  {c.status}
                </div>
              </div>
              <div className="font-mono text-[9px] text-white/35 leading-snug">{c.note}</div>
            </div>
          ))}
        </div>
      </section>

      <Divider />

      {/* ── News feed ────────────────────────────────────────────────────── */}
      <section className="p-5 shrink-0">
        <Label>Latest Intelligence — News</Label>
        {articles.length === 0 && (
          <div className="font-mono text-[10px] text-white/30">Loading feed…</div>
        )}
        <div className="space-y-4">
          {articles.map((a, i) => (
            <a key={i} href={a.url} target="_blank" rel="noopener noreferrer" className="block group">
              <div className="font-mono text-[9px] text-white/25 mb-0.5">
                {a.source} · {timeAgo(a.publishedAt)}
              </div>
              <div className="font-mono text-[10px] text-white/55 group-hover:text-white/80 leading-snug transition-colors">
                {a.title}
              </div>
            </a>
          ))}
        </div>
      </section>

      <Divider />

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <section className="p-5 shrink-0">
        <div className="font-mono text-[9px] text-white/20 leading-relaxed space-y-1">
          <p>Live data: Brent/WTI via ICE futures (Yahoo Finance). News via NewsAPI.</p>
          <p>Simulated data seeded from real reported figures: 2026 Strait of Hormuz crisis (Wikipedia), UKMTO advisories, public reporting. Simulated incidents are labelled. Incident log includes real reported events (Skylight, MKD VYOM, Elpis).</p>
          <p>AI assessment generated by Claude (Anthropic). Not investment or legal advice. For professional use only.</p>
        </div>
      </section>

    </div>
  );
}
