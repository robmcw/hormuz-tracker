'use client';

interface Incident {
  date: string;
  vessel: string;
  type: string;
  flag: string;
  event: string;
  severity: 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW';
  simulated: boolean;
}

interface Props {
  incidents: Incident[];
}

type Tone = 'critical' | 'warning' | 'stable';

const SEV_TONE: Record<Incident['severity'], Tone> = {
  CRITICAL: 'critical',
  HIGH:     'warning',
  MODERATE: 'warning',
  LOW:      'stable',
};

const TONE_COLOR: Record<Tone, { dot: string; text: string; bg: string; border: string }> = {
  critical: {
    dot:    'var(--critical)',
    text:   'var(--critical-text)',
    bg:     'var(--critical-bg)',
    border: 'var(--critical-border)',
  },
  warning: {
    dot:    'var(--warning)',
    text:   'var(--warning-text)',
    bg:     'var(--warning-bg)',
    border: 'var(--warning-border)',
  },
  stable: {
    dot:    'var(--stable)',
    text:   'var(--faint)',
    bg:     'transparent',
    border: 'var(--border)',
  },
};

function daysAgo(iso: string): number {
  const now = new Date();
  const then = new Date(iso + 'T00:00:00Z');
  return Math.floor((now.getTime() - then.getTime()) / 86_400_000);
}

function relativeDate(iso: string): string {
  const d = daysAgo(iso);
  if (d <= 0) return 'Today';
  if (d === 1) return 'Yesterday';
  if (d < 7) return `${d}d ago`;
  return iso;
}

function Severity({ severity, simulated }: { severity: Incident['severity']; simulated: boolean }) {
  const t = TONE_COLOR[SEV_TONE[severity]];
  return (
    <span
      className="font-mono font-bold tracking-widest px-1.5 py-0.5"
      style={{
        fontSize: 'var(--text-label)',
        color: t.text,
        border: `1px solid ${t.border}`,
        background: t.bg,
      }}
    >
      {severity}{simulated ? ' · SIM' : ''}
    </span>
  );
}

export default function IncidentLog({ incidents }: Props) {
  if (!incidents.length) {
    return (
      <div
        className="font-mono animate-pulse px-8 py-6"
        style={{ fontSize: 'var(--text-label)', color: 'var(--faint)' }}
      >
        Loading incidents…
      </div>
    );
  }

  // Find the most recent CRITICAL incident — becomes the hero if within 48h.
  const sorted = [...incidents].sort((a, b) => b.date.localeCompare(a.date));
  const hero = sorted.find(i => i.severity === 'CRITICAL' && daysAgo(i.date) <= 2) ?? null;
  const rest = hero ? sorted.filter(i => i !== hero) : sorted;

  return (
    <div style={{ borderBottom: '0.5px solid var(--border)' }}>
      <div className="px-8 pt-8 pb-6">
        <div className="sec-label">Incident log</div>

        {/* ── Hero block ───────────────────────────── */}
        {hero && (
          <div
            className="breathing"
            style={{
              border: '1px solid var(--critical-border)',
              borderLeft: '3px solid var(--critical)',
              background: 'var(--critical-bg)',
              borderRadius: 6,
              padding: '18px 22px 20px',
              marginBottom: 24,
            }}
          >
            <div className="flex items-center gap-3 mb-3">
              <Severity severity={hero.severity} simulated={hero.simulated} />
              <span
                className="font-mono uppercase"
                style={{
                  fontSize: 'var(--text-label)',
                  color: 'var(--critical-text)',
                  letterSpacing: '0.1em',
                  fontWeight: 600,
                }}
              >
                Latest · {relativeDate(hero.date)}
              </span>
              <span
                className="font-mono"
                style={{ fontSize: 'var(--text-label)', color: 'var(--faint)' }}
              >
                {hero.date}
              </span>
            </div>
            <div
              className="font-semibold mb-1"
              style={{ fontSize: 'var(--text-hero)', color: 'var(--text)' }}
            >
              {hero.vessel}
              <span
                className="font-normal ml-2"
                style={{ color: 'var(--muted)', fontSize: 'var(--text-secondary)' }}
              >
                {hero.type} · {hero.flag}
              </span>
            </div>
            <p
              className="leading-relaxed"
              style={{ fontSize: 'var(--text-body)', color: 'var(--muted)' }}
            >
              {hero.event}
            </p>
          </div>
        )}

        {/* ── Chronological list ───────────────────── */}
        <div className="flex flex-col">
          {rest.slice(0, 6).map((inc, i) => {
            const t = TONE_COLOR[SEV_TONE[inc.severity]];
            const last = i === Math.min(rest.length, 6) - 1;
            return (
              <div
                key={`${inc.date}-${inc.vessel}`}
                className="flex gap-4 items-start"
                style={{
                  padding: '14px 0',
                  borderBottom: last ? 'none' : '0.5px solid rgba(255,255,255,0.05)',
                }}
              >
                {/* Dot + stem */}
                <div className="flex flex-col items-center shrink-0 pt-1.5">
                  <div
                    className="rounded-full"
                    style={{ width: 8, height: 8, background: t.dot }}
                  />
                  {!last && (
                    <div
                      style={{
                        width: 1,
                        flex: 1,
                        background: 'rgba(255,255,255,0.07)',
                        marginTop: 4,
                      }}
                    />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <Severity severity={inc.severity} simulated={inc.simulated} />
                    <span
                      className="font-mono"
                      style={{ fontSize: 'var(--text-label)', color: 'var(--faint)' }}
                    >
                      {relativeDate(inc.date)} · {inc.date}
                    </span>
                  </div>
                  <div
                    className="font-semibold mb-0.5"
                    style={{ fontSize: 'var(--text-body)', color: 'var(--text)' }}
                  >
                    {inc.vessel}
                    <span
                      className="font-normal ml-2"
                      style={{ color: 'var(--muted)', fontSize: 'var(--text-secondary)' }}
                    >
                      {inc.type} · {inc.flag}
                    </span>
                  </div>
                  <p
                    className="leading-relaxed"
                    style={{ fontSize: 'var(--text-secondary)', color: 'var(--muted)' }}
                  >
                    {inc.event}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
