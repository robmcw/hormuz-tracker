'use client';

interface DataPoint {
  date: string;
  value: number;
}

interface Props {
  history: DataPoint[];
}

const ANNOTATIONS: { date: string; label: string; color: string }[] = [
  { date: '2026-02-28', label: 'Crisis onset',        color: '#fcd34d' },
  { date: '2026-04-08', label: 'Ceasefire (partial)', color: '#86efac' },
  { date: '2026-04-13', label: 'Collapse',            color: '#fca5a5' },
];

const LINE_COLOR = '#f59e0b';

export default function TransitChart({ history }: Props) {
  if (history.length < 2) {
    return (
      <div className="font-mono text-[10px] animate-pulse" style={{ color: 'rgba(221,234,245,0.34)' }}>
        Loading chart…
      </div>
    );
  }

  const W = 800;
  const H = 72;
  const PL = 6;
  const PR = 6;
  const PT = 16;
  const PB = 16;

  const dates  = history.map(p => p.date);
  const values = history.map(p => p.value);
  const maxV   = 125;

  const cx = (i: number) => PL + (i / (values.length - 1)) * (W - PL - PR);
  const cy = (v: number) => PT + (1 - v / maxV) * (H - PT - PB);

  const baseline = cy(110);

  const linePath = values
    .map((v, i) => `${i === 0 ? 'M' : 'L'}${cx(i).toFixed(1)},${cy(v).toFixed(1)}`)
    .join(' ');

  const areaPath = `${linePath} L${cx(values.length - 1).toFixed(1)},${cy(0).toFixed(1)} L${cx(0).toFixed(1)},${cy(0).toFixed(1)} Z`;

  const monthTicks: { x: number; label: string }[] = [];
  let lastMonth = '';
  history.forEach((p, i) => {
    const m = p.date.slice(0, 7);
    if (m !== lastMonth) {
      lastMonth = m;
      monthTicks.push({
        x: cx(i),
        label: new Date(p.date + 'T00:00:00Z').toLocaleDateString('en-GB', { month: 'short', timeZone: 'UTC' }),
      });
    }
  });

  const annotationLines = ANNOTATIONS.map(ann => {
    const idx = dates.indexOf(ann.date);
    if (idx === -1) return null;
    return { ...ann, x: cx(idx), y: cy(values[idx]) };
  }).filter(Boolean) as ({ date: string; label: string; color: string; x: number; y: number })[];

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        style={{ height: H }}
        preserveAspectRatio="none"
      >
        {/* Baseline */}
        <line
          x1={PL} y1={baseline} x2={W - PR} y2={baseline}
          stroke="rgba(255,255,255,0.06)" strokeWidth="0.8"
        />

        {/* Area fill */}
        <path d={areaPath} fill={`${LINE_COLOR}18`} />

        {/* Line */}
        <path
          d={linePath} fill="none"
          stroke={LINE_COLOR} strokeWidth="1.5"
          strokeLinejoin="round" strokeLinecap="round"
        />

        {/* Annotation lines */}
        {annotationLines.map(ann => (
          <line
            key={ann.date}
            x1={ann.x} y1={PT - 2} x2={ann.x} y2={H - PB}
            stroke={ann.color} strokeWidth="0.8" strokeDasharray="3,2" opacity="0.5"
          />
        ))}

        {/* Month labels */}
        {monthTicks.map((t, i) => (
          <text key={i} x={t.x} y={H - 2} fill="rgba(221,234,245,0.28)" fontSize="7.5" textAnchor="middle">
            {t.label}
          </text>
        ))}

        {/* End dot */}
        <circle cx={cx(values.length - 1)} cy={cy(values[values.length - 1])} r="2.5" fill={LINE_COLOR} />
      </svg>

      {/* Legend */}
      <div className="flex gap-4 mt-2 flex-wrap">
        {annotationLines.map(ann => (
          <div key={ann.date} className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: ann.color }} />
            <span className="font-mono text-[9px]" style={{ color: 'rgba(221,234,245,0.34)' }}>
              {ann.date.slice(5).replace('-', '/')} {ann.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
