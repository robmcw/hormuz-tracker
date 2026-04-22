'use client';

interface DataPoint {
  date: string;
  value: number;
}

interface Props {
  history: DataPoint[];
}

const ANNOTATIONS: { date: string; label: string; color: string }[] = [
  { date: '2026-02-28', label: 'Crisis onset',        color: 'var(--warning-text)' },
  { date: '2026-04-08', label: 'Ceasefire (partial)', color: 'var(--improving-text)' },
  { date: '2026-04-13', label: 'Collapse',            color: 'var(--critical-text)' },
];

const LINE_COLOR = 'var(--warning)';

export default function TransitChart({ history }: Props) {
  if (history.length < 2) {
    return (
      <div
        className="font-mono animate-pulse"
        style={{ fontSize: 'var(--text-label)', color: 'var(--faint)' }}
      >
        Loading chart…
      </div>
    );
  }

  // ─── Geometry ────────────────────────────────────────────────────────────
  const W = 800;
  const H = 180;
  const PL = 8;
  const PR = 8;
  const PT = 28;   // top padding — room for annotation labels above chart
  const PB = 24;   // bottom padding — room for month labels

  const values = history.map(p => p.value);
  const dates  = history.map(p => p.date);
  const maxV   = 130;

  const cx = (i: number) => PL + (i / (values.length - 1)) * (W - PL - PR);
  const cy = (v: number) => PT + (1 - v / maxV) * (H - PT - PB);
  const asPct = (x: number) => (x / W) * 100;

  const baseline = cy(110);

  const linePath = values
    .map((v, i) => `${i === 0 ? 'M' : 'L'}${cx(i).toFixed(1)},${cy(v).toFixed(1)}`)
    .join(' ');

  const areaPath = `${linePath} L${cx(values.length - 1).toFixed(1)},${cy(0).toFixed(1)} L${cx(0).toFixed(1)},${cy(0).toFixed(1)} Z`;

  // ─── Month ticks ────────────────────────────────────────────────────────
  const monthTicks: { leftPct: number; label: string }[] = [];
  let lastMonth = '';
  history.forEach((p, i) => {
    const m = p.date.slice(0, 7);
    if (m !== lastMonth) {
      lastMonth = m;
      monthTicks.push({
        leftPct: asPct(cx(i)),
        label: new Date(p.date + 'T00:00:00Z').toLocaleDateString('en-GB', {
          month: 'short', timeZone: 'UTC',
        }),
      });
    }
  });

  // ─── Annotations with overlap-avoidance ─────────────────────────────────
  // Greedy packing: if a label would collide with one already placed in row 0,
  // push it to row 1, and so on. Keeps nearby labels stacked instead of overlapping.
  const APPROX_LABEL_PCT = 13;   // est. label width as % of chart width
  interface PlacedAnnotation {
    date: string;
    label: string;
    color: string;
    xPct: number;
    row: number;
  }
  const rowRightEdge: number[] = [];
  const placed: PlacedAnnotation[] = [];

  ANNOTATIONS
    .map(ann => {
      const idx = dates.indexOf(ann.date);
      return idx === -1 ? null : { ann, idx };
    })
    .filter(<T,>(v: T | null): v is T => v !== null)
    .sort((a, b) => a.idx - b.idx)
    .forEach(({ ann, idx }) => {
      const xPct = asPct(cx(idx));
      let row = 0;
      while (rowRightEdge[row] !== undefined && rowRightEdge[row] > xPct) row++;
      rowRightEdge[row] = xPct + APPROX_LABEL_PCT;
      placed.push({ ...ann, xPct, row });
    });

  // Y-axis ticks (drawn inside SVG; small text here is a judgement call, but
  // at the left margin with tiny values the distortion is minor)
  const yTicks = [0, 55, 110];

  return (
    <div className="relative w-full" style={{ height: H }}>
      {/* ── Shapes layer (stretched to fit width) ─────────────────────── */}
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="absolute inset-0 w-full h-full"
        preserveAspectRatio="none"
      >
        {/* Horizontal grid */}
        {yTicks.map(v => (
          <line
            key={v}
            x1={PL} y1={cy(v)} x2={W - PR} y2={cy(v)}
            stroke="rgba(255,255,255,0.05)" strokeWidth="0.6"
            vectorEffect="non-scaling-stroke"
          />
        ))}

        {/* Baseline emphasis */}
        <line
          x1={PL} y1={baseline} x2={W - PR} y2={baseline}
          stroke="rgba(255,255,255,0.18)" strokeWidth="1" strokeDasharray="4,3"
          vectorEffect="non-scaling-stroke"
        />

        {/* Annotation verticals */}
        {placed.map(ann => {
          const x = (ann.xPct / 100) * W;
          return (
            <line
              key={ann.date}
              x1={x} y1={PT - 6} x2={x} y2={H - PB}
              stroke={ann.color} strokeWidth="1" strokeDasharray="3,2" opacity="0.55"
              vectorEffect="non-scaling-stroke"
            />
          );
        })}

        {/* Area fill */}
        <path d={areaPath} fill={LINE_COLOR} fillOpacity="0.12" />

        {/* Line */}
        <path
          d={linePath} fill="none"
          stroke={LINE_COLOR} strokeWidth="1.8"
          strokeLinejoin="round" strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />

        {/* End dot */}
        <circle
          cx={cx(values.length - 1)}
          cy={cy(values[values.length - 1])}
          r="3"
          fill={LINE_COLOR}
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      {/* ── Y-axis value labels (HTML, left margin) ───────────────────── */}
      {yTicks.map(v => (
        <span
          key={v}
          className="font-mono absolute pointer-events-none"
          style={{
            top: `${(cy(v) / H) * 100}%`,
            left: 4,
            transform: 'translateY(-100%)',
            fontSize: 9,
            color: 'rgba(221,234,245,0.32)',
            lineHeight: 1,
          }}
        >
          {v}
        </span>
      ))}

      {/* ── Annotation labels (HTML, stacked if close) ────────────────── */}
      {placed.map(ann => (
        <span
          key={ann.date}
          className="font-mono absolute pointer-events-none whitespace-nowrap"
          style={{
            top: ann.row * 13 + 2,
            left: `${ann.xPct}%`,
            transform: 'translateX(4px)',
            fontSize: 10,
            color: ann.color,
            lineHeight: 1.2,
            opacity: 0.92,
          }}
        >
          {ann.label}
        </span>
      ))}

      {/* ── Month labels (HTML, bottom) ───────────────────────────────── */}
      {monthTicks.map((t, i) => (
        <span
          key={i}
          className="font-mono absolute pointer-events-none"
          style={{
            bottom: 2,
            left: `${t.leftPct}%`,
            transform: 'translateX(-50%)',
            fontSize: 9,
            letterSpacing: '0.08em',
            color: 'rgba(221,234,245,0.38)',
          }}
        >
          {t.label.toUpperCase()}
        </span>
      ))}
    </div>
  );
}
