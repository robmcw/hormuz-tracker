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

type Tone = 'critical' | 'warning' | 'stable';

function severityTone(s: number): Tone {
  if (s >= 85) return 'critical';
  if (s >= 65) return 'warning';
  return 'stable';
}

const TONE_ACCENT: Record<Tone, string> = {
  critical: 'var(--critical)',
  warning:  'var(--warning)',
  stable:   'var(--stable)',
};

const DIR_META: Record<Signal['direction'], { label: string; color: string }> = {
  WORSENING: { label: '↑ worsening', color: 'var(--critical-text)' },
  STABLE:    { label: '→ stable',    color: 'var(--faint)'         },
  IMPROVING: { label: '↓ improving', color: 'var(--improving-text)'},
};

const VALUE_TONE: Record<Signal['direction'], string> = {
  WORSENING: 'var(--critical-text)',
  STABLE:    'var(--warning-text)',
  IMPROVING: 'var(--improving-text)',
};

export default function SignalBreakdown({ signals }: Props) {
  if (!signals.length) {
    return (
      <div
        className="font-mono animate-pulse"
        style={{ fontSize: 'var(--text-label)', color: 'var(--faint)' }}
      >
        Loading signals…
      </div>
    );
  }

  return (
    <div
      className="grid"
      style={{
        gridTemplateColumns: `repeat(${Math.min(signals.length, 3)}, 1fr)`,
        gap: 16,
      }}
    >
      {signals.map(s => {
        const tone = severityTone(s.severity);
        return (
          <div
            key={s.id}
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              padding: '22px 24px 20px',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: 0, left: 0, right: 0,
                height: 2,
                background: TONE_ACCENT[tone],
              }}
            />

            <div
              className="mb-3"
              style={{ fontSize: 'var(--text-secondary)', color: 'var(--muted)' }}
            >
              {s.label}
            </div>

            <div
              className="font-mono font-medium mb-4"
              style={{
                fontSize: 'var(--text-hero)',
                lineHeight: 1.25,
                color: VALUE_TONE[s.direction],
              }}
            >
              {s.value}
            </div>

            <div
              className="mb-3"
              style={{
                height: 3,
                background: 'rgba(255,255,255,0.07)',
                borderRadius: 3,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${s.severity}%`,
                  height: '100%',
                  background: TONE_ACCENT[tone],
                  borderRadius: 3,
                }}
              />
            </div>

            <div className="flex items-center justify-between mb-2">
              <span
                className="font-mono"
                style={{ fontSize: 'var(--text-label)', color: DIR_META[s.direction].color }}
              >
                {DIR_META[s.direction].label}
              </span>
              {s.baseline && (
                <span
                  className="font-mono"
                  style={{ fontSize: 'var(--text-label)', color: 'var(--ghost)' }}
                >
                  baseline {s.baseline}
                </span>
              )}
            </div>

            <p
              className="leading-relaxed"
              style={{ fontSize: 'var(--text-secondary)', color: 'var(--faint)' }}
            >
              {s.summary}
            </p>
          </div>
        );
      })}
    </div>
  );
}
