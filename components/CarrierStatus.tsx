'use client';

interface Carrier {
  name: string;
  status: 'SUSPENDED' | 'LIMITED' | 'NORMAL';
  since: string;
  note: string;
}

interface Pipeline {
  name: string;
  region: string;
  capacity_mbd: number;
  utilisation: number;
  trend: 'RISING' | 'STABLE' | 'FALLING';
  note: string;
}

interface Props {
  carriers:  Carrier[];
  pipelines: Pipeline[];
}

const STATUS_BADGE: Record<Carrier['status'], { bg: string; border: string; color: string; label: string }> = {
  SUSPENDED: { bg: 'var(--critical-bg)',  border: 'var(--critical-border)',  color: 'var(--critical-text)',  label: 'Suspended' },
  LIMITED:   { bg: 'var(--warning-bg)',   border: 'var(--warning-border)',   color: 'var(--warning-text)',   label: 'Limited'   },
  NORMAL:    { bg: 'var(--improving-bg)', border: 'var(--improving-border)', color: 'var(--improving-text)', label: 'Active'    },
};

function pipeColor(u: number): string {
  if (u > 0.5) return 'var(--improving)';
  if (u > 0.3) return 'var(--warning)';
  return 'var(--critical)';
}

function pipeTextColor(u: number): string {
  if (u > 0.5) return 'var(--improving-text)';
  if (u > 0.3) return 'var(--warning-text)';
  return 'var(--critical-text)';
}

export default function CarrierStatus({ carriers, pipelines }: Props) {
  return (
    <div
      className="grid grid-cols-1 md:grid-cols-2"
      style={{ borderBottom: '0.5px solid var(--border)' }}
    >
      {/* ── Carriers ─────────────────────────────── */}
      <div className="px-4 md:px-8 py-6 md:py-7 carrier-cell">
        <div className="sec-label">Carrier status</div>
        {carriers.map((c, i) => {
          const b = STATUS_BADGE[c.status];
          return (
            <div
              key={c.name}
              className="flex items-center justify-between gap-4"
              style={{
                padding: '12px 0',
                borderBottom: i < carriers.length - 1 ? '0.5px solid rgba(255,255,255,0.05)' : 'none',
              }}
            >
              <div className="min-w-0 flex-1">
                <div
                  className="font-medium mb-0.5"
                  style={{ fontSize: 'var(--text-body)', color: 'var(--text)' }}
                >
                  {c.name}
                </div>
                <div
                  className="leading-snug"
                  style={{ fontSize: 'var(--text-secondary)', color: 'var(--muted)' }}
                >
                  {c.note}
                </div>
              </div>
              <span
                className="font-mono tracking-widest px-2 py-0.5 rounded-[3px] shrink-0"
                style={{
                  fontSize: 'var(--text-label)',
                  background: b.bg,
                  border: `0.5px solid ${b.border}`,
                  color: b.color,
                }}
              >
                {b.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* ── Pipelines ────────────────────────────── */}
      <div className="px-4 md:px-8 py-6 md:py-7">
        <div className="sec-label">Bypass pipelines</div>
        {pipelines.map((p, i) => (
          <div
            key={p.name}
            style={{
              padding: '12px 0',
              borderBottom: i < pipelines.length - 1 ? '0.5px solid rgba(255,255,255,0.05)' : 'none',
            }}
          >
            <div className="flex items-baseline justify-between mb-2 gap-3">
              <span style={{ fontSize: 'var(--text-body)', color: 'var(--text)' }}>{p.name}</span>
              <span
                className="font-mono tabular-nums shrink-0"
                style={{ fontSize: 'var(--text-secondary)', color: pipeTextColor(p.utilisation) }}
              >
                {Math.round(p.utilisation * 100)}% · {p.capacity_mbd}mb/d
              </span>
            </div>
            <div
              className="mb-1.5"
              style={{
                height: 4,
                background: 'rgba(255,255,255,0.07)',
                borderRadius: 4,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${p.utilisation * 100}%`,
                  height: '100%',
                  background: pipeColor(p.utilisation),
                  borderRadius: 4,
                }}
              />
            </div>
            <div
              style={{ fontSize: 'var(--text-label)', color: 'var(--faint)' }}
              className="font-mono"
            >
              {p.region} · {p.note}
            </div>
          </div>
        ))}
        <div
          className="font-mono mt-3"
          style={{ fontSize: 'var(--text-label)', color: 'var(--ghost)' }}
        >
          Combined ~35% of normal strait throughput (20 mb/d)
        </div>
      </div>
    </div>
  );
}
