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

const BORDER = '0.5px solid rgba(255,255,255,0.08)';
const FAINT  = 'rgba(221,234,245,0.34)';

interface CellProps {
  label: string;
  value: string;
  delta: string;
  valueColor?: string;
  loading?: boolean;
  last?: boolean;
}

function StatCell({ label, value, delta, valueColor = '#fcd34d', loading, last }: CellProps) {
  return (
    <div style={{ padding: '20px 24px', borderRight: last ? 'none' : BORDER }}>
      <div className="font-mono text-[10px] tracking-[0.1em] uppercase mb-2" style={{ color: FAINT }}>
        {label}
      </div>
      {loading ? (
        <div className="text-[28px] font-bold leading-none mb-1.5 animate-pulse" style={{ color: 'rgba(221,234,245,0.2)' }}>—</div>
      ) : (
        <div className="text-[28px] font-bold leading-none mb-1.5 tabular-nums" style={{ color: valueColor }}>{value}</div>
      )}
      <div className="font-mono text-[11px]" style={{ color: FAINT }}>{delta}</div>
    </div>
  );
}

export default function HeadlineMetrics({ transitCount, brentPrice, brentPct, freightRate }: Props) {
  const daysClosed = daysSince('2026-02-28');

  return (
    <div className="grid grid-cols-4" style={{ borderBottom: BORDER }}>
      <StatCell
        label="Ships in strait"
        value={transitCount !== null ? String(transitCount) : '—'}
        delta="↓ 94% vs normal (110/day)"
        valueColor="var(--red-text)"
        loading={transitCount === null}
      />
      <StatCell
        label="War risk premium"
        value="Unquotable"
        delta="Was 0.05% hull value pre-crisis"
        valueColor="var(--red-text)"
      />
      <StatCell
        label="Brent crude"
        value={typeof brentPrice === 'number' ? `$${brentPrice.toFixed(2)}` : '—'}
        delta={typeof brentPct === 'number' ? `${brentPct >= 0 ? '↑' : '↓'} ${Math.abs(brentPct).toFixed(1)}% today` : 'loading…'}
        valueColor="var(--amber-text)"
        loading={brentPrice === null}
      />
      <StatCell
        label="AG–East VLCC rate"
        value={freightRate !== null ? `$${(freightRate / 1000).toFixed(0)}k` : '—'}
        delta={`↑ from $31k pre-crisis · ${daysClosed}d closed`}
        valueColor="var(--amber-text)"
        loading={freightRate === null}
        last
      />
    </div>
  );
}
