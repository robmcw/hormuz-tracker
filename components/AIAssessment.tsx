'use client';

interface StructuredAnalysis {
  intro: string;
  direction: string;
  directionText: string;
  primaryDriver: string;
  contrarian: string;
  changeCondition: string;
}

interface Props {
  analysis: {
    structured: StructuredAnalysis | null;
    generatedAt: string;
    cached: boolean;
    error?: string;
  } | null;
}

function utcTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-GB', {
    hour: '2-digit', minute: '2-digit', timeZone: 'UTC',
  }) + ' UTC';
}

function timeAgo(iso: string): string {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

interface TileProps {
  label: string;
  text: string;
  accent: string;
  loading?: boolean;
}

function Tile({ label, text, accent, loading }: TileProps) {
  return (
    <div
      style={{
        borderLeft: `2px solid ${accent}`,
        padding: '6px 0 6px 18px',
      }}
    >
      <div
        className="font-mono uppercase mb-2"
        style={{
          fontSize: 'var(--text-label)',
          letterSpacing: '0.12em',
          color: accent,
        }}
      >
        {label}
      </div>
      {loading ? (
        <div className="space-y-1.5 animate-pulse">
          <div style={{ height: 12, width: '92%', background: 'rgba(221,234,245,0.07)', borderRadius: 3 }} />
          <div style={{ height: 12, width: '74%', background: 'rgba(221,234,245,0.07)', borderRadius: 3 }} />
        </div>
      ) : (
        <p
          className="leading-relaxed"
          style={{ fontSize: 'var(--text-body)', color: 'var(--muted)' }}
        >
          {text}
        </p>
      )}
    </div>
  );
}

export default function AIAssessment({ analysis }: Props) {
  const s = analysis?.structured ?? null;
  const loading = !s;

  return (
    <div style={{ background: 'var(--surface)', borderBottom: '0.5px solid var(--border)' }}>
      {/* Header */}
      <div
        className="flex items-center justify-between"
        style={{ padding: '18px 32px', borderBottom: '0.5px solid var(--border)' }}
      >
        <div
          className="font-mono uppercase"
          style={{
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: '0.14em',
            color: 'var(--text)',
          }}
        >
          AI Risk Assessment · Claude
        </div>
        <div
          className="font-mono"
          style={{ fontSize: 'var(--text-label)', color: 'var(--faint)' }}
        >
          {analysis?.generatedAt
            ? `${timeAgo(analysis.generatedAt)} · ${utcTime(analysis.generatedAt)} · refreshes hourly${analysis.cached ? ' · cached' : ''}`
            : 'Loading…'}
        </div>
      </div>

      {/* 2 × 2 grid */}
      <div
        className="grid"
        style={{
          gridTemplateColumns: '1fr 1fr',
          columnGap: 48,
          rowGap: 28,
          padding: '28px 32px 32px',
        }}
      >
        <Tile
          label="Risk direction"
          text={s?.directionText ?? ''}
          accent="var(--critical-text)"
          loading={loading}
        />
        <Tile
          label="Primary driver"
          text={s?.primaryDriver ?? ''}
          accent="var(--warning-text)"
          loading={loading}
        />
        <Tile
          label="Contrarian signal"
          text={s?.contrarian ?? ''}
          accent="var(--improving-text)"
          loading={loading}
        />
        <Tile
          label="What would change this"
          text={s?.changeCondition ?? ''}
          accent="var(--ghost)"
          loading={loading}
        />
      </div>
    </div>
  );
}
