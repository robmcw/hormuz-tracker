'use client';

interface Signal {
  id: string;
  label: string;
  value: string;
  baseline: string | null;
  severity: number;
  direction: 'WORSENING' | 'STABLE' | 'IMPROVING';
  summary: string;
}

interface Props {
  signals: Signal[];
}

function topBorderColor(severity: number): string {
  if (severity >= 90) return '#ef4444';
  if (severity >= 70) return '#f59e0b';
  return 'rgba(221,234,245,0.2)';
}

function barColor(severity: number): string {
  if (severity >= 90) return '#ef4444';
  if (severity >= 70) return '#f59e0b';
  return '#22c55e';
}

const VALUE_COLOR: Record<string, string> = {
  WORSENING: '#fca5a5',
  STABLE:    '#fcd34d',
  IMPROVING: '#86efac',
};

const DIR_LABEL: Record<string, string> = {
  WORSENING: '↑ worsening',
  STABLE:    '→ stable',
  IMPROVING: '↓ improving',
};

const DIR_COLOR: Record<string, string> = {
  WORSENING: '#fca5a5',
  STABLE:    'rgba(221,234,245,0.34)',
  IMPROVING: '#86efac',
};

export default function SignalBreakdown({ signals }: Props) {
  if (!signals.length) {
    return (
      <div className="font-mono text-[10px] animate-pulse" style={{ color: 'rgba(221,234,245,0.34)' }}>
        Loading signals…
      </div>
    );
  }

  return (
    <div className="grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
      {signals.map(s => (
        <div
          key={s.id}
          style={{
            background: '#0e1c2e',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 8,
            padding: '18px 20px',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Coloured top accent */}
          <div
            style={{
              position: 'absolute',
              top: 0, left: 0, right: 0,
              height: 2,
              background: topBorderColor(s.severity),
            }}
          />

          <div className="text-[12px] font-medium mb-3" style={{ color: 'rgba(221,234,245,0.58)' }}>
            {s.label}
          </div>

          <div className="font-mono text-[16px] font-medium mb-3" style={{ color: VALUE_COLOR[s.direction] }}>
            {s.value}
          </div>

          <div
            className="mb-2.5"
            style={{ height: 3, background: 'rgba(255,255,255,0.07)', borderRadius: 3, overflow: 'hidden' }}
          >
            <div
              style={{
                width: `${s.severity}%`,
                height: '100%',
                background: barColor(s.severity),
                borderRadius: 3,
              }}
            />
          </div>

          <div className="font-mono text-[10px]" style={{ color: DIR_COLOR[s.direction] }}>
            {DIR_LABEL[s.direction]}
          </div>
        </div>
      ))}
    </div>
  );
}
