'use client';

interface Props {
  transitCount: number | null;
  brentPrice:   number | null;
  brentPct:     number | null;
  freightRate:  number | null;
}

function daysSince(isoDate: string): number {
  return Math.floor((Date.now() - new Date(isoDate).getTime()) / 86_400_000);
}

interface CellProps {
  label: string;
  value: string;
  delta: string;
  tone?: 'critical' | 'warning';
  loading?: boolean;
  last?: boolean;
}

function StatCell({ label, value, delta, tone = 'warning', loading, last }: CellProps) {
  const valueColor = tone === 'critical' ? 'var(--critical-text)' : 'var(--warning-text)';

  return (
    <div
      style={{
        padding: '24px 28px',
        borderRight: last ? 'none' : '0.5px solid var(--border)',
      }}
    >
      <div
        className="font-mono uppercase mb-3"
        style={{
          fontSize: 'var(--text-label)',
          letterSpacing: '0.12em',
          color: 'var(--faint)',
        }}
      >
        {label}
      </div>
      {loading ? (
        <div
          className="font-bold leading-none mb-2 animate-pulse"
          style={{ fontSize: 'var(--text-display)', color: 'var(--ghost)' }}
        >
          —
        </div>
      ) : (
        <div
          className="font-bold leading-none mb-2 tabular-nums"
          style={{ fontSize: 'var(--text-display)', color: valueColor }}
        >
          {value}
        </div>
      )}
      <div
        className="font-mono"
        style={{ fontSize: 'var(--text-label)', color: 'var(--faint)' }}
      >
        {delta}
      </div>
    </div>
  );
}

export default function HeadlineMetrics({ transitCount, brentPrice, brentPct, freightRate }: Props) {
  const daysClosed = daysSince('2026-02-28');

  return (
    <div
      className="grid grid-cols-4"
      style={{ borderBottom: '0.5px solid var(--border)' }}
    >
      <StatCell
        label="Ships in strait"
        value={transitCount !== null ? String(transitCount) : '—'}
        delta="↓ 94% vs 110/day baseline"
        tone="critical"
        loading={transitCount === null}
      />
      <StatCell
        label="War risk premium"
        value="Unquotable"
        delta="Was 0.05% hull value pre-crisis"
        tone="critical"
      />
      <StatCell
        label="Brent crude"
        value={typeof brentPrice === 'number' ? `$${brentPrice.toFixed(2)}` : '—'}
        delta={typeof brentPct === 'number' ? `${brentPct >= 0 ? '↑' : '↓'} ${Math.abs(brentPct).toFixed(1)}% today` : 'loading…'}
        tone="warning"
        loading={brentPrice === null}
      />
      <StatCell
        label="AG–East VLCC rate"
        value={freightRate !== null ? `$${(freightRate / 1000).toFixed(0)}k` : '—'}
        delta={`↑ from $31k baseline · ${daysClosed}d closed`}
        tone="warning"
        loading={freightRate === null}
        last
      />
    </div>
  );
}
