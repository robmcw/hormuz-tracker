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
  incidents: Incident[];
  carriers:  Carrier[];
  pipelines: Pipeline[];
}

const BORDER = 'rgba(255,255,255,0.08)';
const MUTED  = 'rgba(221,234,245,0.58)';
const FAINT  = 'rgba(221,234,245,0.34)';

const SEV_COLOR: Record<string, string> = {
  CRITICAL: '#ef4444',
  HIGH:     '#f59e0b',
  MODERATE: '#f59e0b',
  LOW:      'rgba(221,234,245,0.3)',
};

const STATUS_BADGE: Record<string, { bg: string; border: string; color: string; label: string }> = {
  SUSPENDED: { bg: 'rgba(239,68,68,0.12)',   border: 'rgba(239,68,68,0.28)',   color: '#fca5a5', label: 'Suspended' },
  LIMITED:   { bg: 'rgba(245,158,11,0.1)',   border: 'rgba(245,158,11,0.28)',  color: '#fcd34d', label: 'Limited'   },
  NORMAL:    { bg: 'rgba(34,197,94,0.1)',    border: 'rgba(34,197,94,0.28)',   color: '#86efac', label: 'Active'    },
};

function pipeBarColor(u: number): string {
  if (u > 0.5) return '#22c55e';
  if (u > 0.3) return '#f59e0b';
  return '#ef4444';
}

function pipePctColor(u: number): string {
  if (u > 0.5) return '#86efac';
  if (u > 0.3) return '#fcd34d';
  return '#fca5a5';
}

export default function IncidentCarrierPanel({ incidents, carriers, pipelines }: Props) {
  return (
    <div className="grid" style={{ gridTemplateColumns: '1.2fr 1fr', borderBottom: `0.5px solid ${BORDER}` }}>

      {/* ── Incident log ─────────────────────────────── */}
      <div style={{ padding: '28px 28px 28px 32px', borderRight: `0.5px solid ${BORDER}` }}>
        <div className="sec-label">Incident log</div>
        {incidents.slice(0, 4).map((inc, i) => (
          <div
            key={i}
            className="flex gap-3.5 items-start"
            style={{
              padding: '13px 0',
              borderBottom: i < Math.min(incidents.length, 4) - 1 ? `0.5px solid rgba(255,255,255,0.05)` : 'none',
            }}
          >
            {/* Dot + stem */}
            <div className="flex flex-col items-center shrink-0 pt-1">
              <div
                className="w-2 h-2 rounded-full"
                style={{ background: SEV_COLOR[inc.severity] }}
              />
              {i < Math.min(incidents.length, 4) - 1 && (
                <div style={{ width: 1, flex: 1, background: 'rgba(255,255,255,0.07)', marginTop: 5 }} />
              )}
            </div>
            <div className="min-w-0">
              <div className="font-mono text-[10px] mb-1" style={{ color: FAINT }}>
                {inc.date}{inc.simulated ? ' · SIM' : ''} · {inc.severity}
              </div>
              <div className="text-[13px] font-semibold mb-1" style={{ color: 'rgba(221,234,245,0.88)' }}>
                {inc.vessel}
              </div>
              <div className="text-[12px] leading-snug" style={{ color: MUTED }}>
                {inc.event}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Carriers + Pipelines ─────────────────────── */}
      <div style={{ padding: '28px 32px' }}>
        <div className="sec-label">Carrier status</div>
        {carriers.map((c, i) => {
          const b = STATUS_BADGE[c.status];
          return (
            <div
              key={c.name}
              className="flex items-center justify-between"
              style={{
                padding: '9px 0',
                borderBottom: i < carriers.length - 1 ? `0.5px solid rgba(255,255,255,0.05)` : 'none',
              }}
            >
              <span className="text-[13px]" style={{ color: MUTED }}>{c.name}</span>
              <span
                className="font-mono text-[9px] px-1.5 py-0.5 rounded-[3px] tracking-[0.06em]"
                style={{ background: b.bg, border: `0.5px solid ${b.border}`, color: b.color }}
              >
                {b.label}
              </span>
            </div>
          );
        })}

        <div style={{ height: 1, background: BORDER, margin: '22px 0' }} />

        <div className="sec-label">Bypass pipelines</div>
        {pipelines.map(p => (
          <div key={p.name} className="flex items-center gap-2.5 mb-3 last:mb-0">
            <span className="text-[12px] shrink-0" style={{ color: MUTED, minWidth: 128 }}>
              {p.name.replace('East-West Pipeline', 'East-West (KSA)')}
            </span>
            <div
              className="flex-1 rounded-full"
              style={{ height: 4, background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}
            >
              <div
                className="h-full rounded-full"
                style={{ width: `${p.utilisation * 100}%`, background: pipeBarColor(p.utilisation) }}
              />
            </div>
            <span className="font-mono text-[11px] shrink-0 w-8 text-right" style={{ color: pipePctColor(p.utilisation) }}>
              {Math.round(p.utilisation * 100)}%
            </span>
          </div>
        ))}
        <div className="font-mono text-[10px] mt-3" style={{ color: FAINT }}>
          Combined: ~35% of normal strait throughput (20 mb/d)
        </div>
      </div>

    </div>
  );
}
