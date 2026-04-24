'use client';

import { useEffect, useState } from 'react';
import Sparkline from './Sparkline';

// War-risk Additional Premium (% of hull value) — 90-day simulated progression.
// Anchored to broker-reported tradable quotes before the Feb crisis (~0.05%)
// escalating through the six recorded incidents to unquotable.
const RATE_HISTORY: number[] = [
  0.05, 0.05, 0.05, 0.06, 0.06, 0.07, 0.08, 0.10, 0.12, 0.15,
  0.18, 0.22, 0.28, 0.35, 0.42, 0.55, 0.68, 0.80, 0.95, 1.10,
  1.25, 1.40, 1.55, 1.75, 1.90, 2.10, 2.30, 2.55, 2.80, 3.00,
  3.20, 3.40, 3.60, 3.85, 4.05, 4.25, 4.45, 4.65, 4.85, 5.00,
  5.10, 5.15, 5.20, 5.20, 5.20, 5.20, 5.20, 5.20, 5.20, 5.20,
];

const PRESETS: Record<string, { firm: string; risks: number; tiv: string; warranty: number }> = {
  beazley:  { firm: 'Beazley',         risks: 52, tiv: '$2.8bn', warranty: 14 },
  hiscox:   { firm: 'Hiscox',          risks: 38, tiv: '$1.9bn', warranty: 11 },
  marsh:    { firm: 'Marsh',           risks: 94, tiv: '$5.4bn', warranty: 27 },
  wtw:      { firm: 'WTW',             risks: 71, tiv: '$4.1bn', warranty: 22 },
  gallagher:{ firm: 'Gallagher',       risks: 44, tiv: '$2.2bn', warranty: 13 },
  axaxl:    { firm: 'AXA XL',          risks: 66, tiv: '$3.6bn', warranty: 18 },
  aspen:    { firm: 'Aspen',           risks: 41, tiv: '$2.1bn', warranty: 12 },
  tmk:      { firm: 'Tokio Marine Kiln', risks: 49, tiv: '$2.5bn', warranty: 15 },
  maersk:   { firm: 'Maersk Risk Management', risks: 128, tiv: '$7.9bn', warranty: 38 },
  flexport: { firm: 'Flexport',        risks: 33, tiv: '$1.4bn', warranty: 9 },
};

const DEFAULT = { firm: 'your firm', risks: 47, tiv: '$2.3bn', warranty: 12 };

function useForParam() {
  const [params, setParams] = useState(DEFAULT);
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get('for');
    if (q && PRESETS[q.toLowerCase()]) setParams(PRESETS[q.toLowerCase()]);
  }, []);
  return params;
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div
      style={{
        border: '0.5px solid var(--border)',
        borderRadius: 4,
        padding: 20,
        background: 'rgba(14,28,46,0.4)',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="font-mono uppercase mb-3"
      style={{ fontSize: 'var(--text-label)', letterSpacing: '0.12em', color: 'var(--faint)' }}
    >
      {children}
    </div>
  );
}

function SimTag() {
  return (
    <span
      className="font-mono ml-2 px-1.5 py-0.5 rounded-[3px]"
      style={{
        fontSize: 9,
        letterSpacing: '0.1em',
        background: 'rgba(245,158,11,0.12)',
        color: 'var(--warning-text)',
        border: '0.5px solid rgba(245,158,11,0.3)',
        verticalAlign: 'middle',
      }}
    >
      SIM
    </span>
  );
}

export default function UnderwriterContext() {
  const portfolio = useForParam();
  const latest = RATE_HISTORY[RATE_HISTORY.length - 1];
  const first  = RATE_HISTORY[0];
  const multiple = (latest / first).toFixed(0);

  return (
    <section className="px-4 md:px-8 py-6 md:py-8" style={{ borderBottom: '0.5px solid var(--border)' }}>
      <div className="sec-label">Underwriter context</div>

      <div className="grid gap-4 grid-cols-1 md:grid-cols-[1.3fr_1fr_1fr]">

        {/* ── Rate history sparkline ─────────────────────────────── */}
        <Card>
          <div className="flex items-baseline justify-between mb-1">
            <Label>War-risk AP% · 90-day trend<SimTag /></Label>
            <span
              className="font-mono"
              style={{ fontSize: 'var(--text-label)', color: 'var(--faint)' }}
            >
              {multiple}× since 1 Feb
            </span>
          </div>
          <div
            className="flex items-baseline gap-2 mb-3 tabular-nums"
            style={{ fontSize: 'var(--text-display)', fontWeight: 700, color: 'var(--critical-text)' }}
          >
            Unquotable
            <span
              style={{
                fontSize: 'var(--text-secondary)',
                fontWeight: 400,
                color: 'var(--faint)',
                letterSpacing: '0.04em',
              }}
            >
              last tradable {latest.toFixed(2)}% · 28 Feb
            </span>
          </div>
          <Sparkline values={RATE_HISTORY} color="#ef4444" height={52} />
          <div
            className="flex justify-between font-mono mt-2"
            style={{ fontSize: 9, letterSpacing: '0.08em', color: 'var(--faint)' }}
          >
            <span>0.05% · 23 Jan</span>
            <span>0.80% · 14 Feb</span>
            <span>UNQUOTABLE · now</span>
          </div>
        </Card>

        {/* ── JWC Listed Area badge ──────────────────────────────── */}
        <Card>
          <Label>JWC Listed Area</Label>
          <div style={{ fontSize: 'var(--text-hero)', fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>
            Strait of Hormuz
          </div>
          <div style={{ fontSize: 'var(--text-body)', color: 'var(--muted)', lineHeight: 1.5, marginBottom: 12 }}>
            Arabian Gulf, Gulf of Oman, and UAE waters east of 54°E
          </div>
          <div className="space-y-1.5" style={{ fontSize: 'var(--text-label)' }}>
            <div className="flex justify-between font-mono">
              <span style={{ color: 'var(--faint)', letterSpacing: '0.08em' }}>STATUS</span>
              <span style={{ color: 'var(--critical-text)', fontWeight: 600 }}>LISTED</span>
            </div>
            <div className="flex justify-between font-mono">
              <span style={{ color: 'var(--faint)', letterSpacing: '0.08em' }}>LISTED SINCE</span>
              <span style={{ color: 'var(--muted)' }}>01 Mar 2026</span>
            </div>
            <div className="flex justify-between font-mono">
              <span style={{ color: 'var(--faint)', letterSpacing: '0.08em' }}>NEXT REVIEW</span>
              <span style={{ color: 'var(--muted)' }}>15 Jun 2026</span>
            </div>
            <div className="flex justify-between font-mono">
              <span style={{ color: 'var(--faint)', letterSpacing: '0.08em' }}>CIRCULAR</span>
              <span style={{ color: 'var(--muted)' }}>JWLA-028</span>
            </div>
          </div>
        </Card>

        {/* ── Portfolio ghost panel ──────────────────────────────── */}
        <Card style={{ position: 'relative', borderStyle: 'dashed' }}>
          <div className="flex items-center justify-between mb-3">
            <Label>Your portfolio exposure</Label>
            <span
              className="font-mono uppercase px-1.5 py-0.5 rounded-[3px]"
              style={{
                fontSize: 9,
                letterSpacing: '0.12em',
                background: 'rgba(221,234,245,0.06)',
                color: 'var(--faint)',
                border: '0.5px solid var(--border)',
              }}
            >
              Integration preview
            </span>
          </div>

          <div className="space-y-2.5 mb-3" style={{ opacity: 0.72 }}>
            <div className="flex justify-between items-baseline">
              <span style={{ fontSize: 'var(--text-secondary)', color: 'var(--muted)' }}>In-force risks</span>
              <span className="tabular-nums" style={{ fontSize: 'var(--text-hero)', fontWeight: 600 }}>
                {portfolio.risks}
              </span>
            </div>
            <div className="flex justify-between items-baseline">
              <span style={{ fontSize: 'var(--text-secondary)', color: 'var(--muted)' }}>Total insured value</span>
              <span className="tabular-nums" style={{ fontSize: 'var(--text-hero)', fontWeight: 600 }}>
                {portfolio.tiv}
              </span>
            </div>
            <div className="flex justify-between items-baseline">
              <span style={{ fontSize: 'var(--text-secondary)', color: 'var(--muted)' }}>With Listed Area warranty</span>
              <span className="tabular-nums" style={{ fontSize: 'var(--text-hero)', fontWeight: 600 }}>
                {portfolio.warranty}
              </span>
            </div>
          </div>

          <div
            className="font-mono"
            style={{
              fontSize: 'var(--text-label)',
              color: 'var(--faint)',
              borderTop: '0.5px dashed var(--border)',
              paddingTop: 10,
              letterSpacing: '0.04em',
            }}
          >
            Connect {portfolio.firm}&apos;s bordereau to populate live.
          </div>
        </Card>

      </div>
    </section>
  );
}
