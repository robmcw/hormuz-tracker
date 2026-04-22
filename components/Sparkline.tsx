'use client';

interface Props {
  values: number[];
  color?: string;
  height?: number;
  filled?: boolean;
}

export default function Sparkline({ values, color = '#f0a030', height = 48, filled = true }: Props) {
  if (values.length < 2) return null;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const W = 400;
  const H = height;
  const PX = 2;
  const PY = 4;

  const cx = (i: number) => PX + (i / (values.length - 1)) * (W - PX * 2);
  const cy = (v: number) => PY + (1 - (v - min) / range) * (H - PY * 2);

  const d = values
    .map((v, i) => `${i === 0 ? 'M' : 'L'}${cx(i).toFixed(1)},${cy(v).toFixed(1)}`)
    .join(' ');

  const area = `${d} L${cx(values.length - 1).toFixed(1)},${H} L${cx(0).toFixed(1)},${H} Z`;

  const endX = cx(values.length - 1);
  const endY = cy(values[values.length - 1]);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
      style={{ height }}
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id={`sg-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {filled && <path d={area} fill={`url(#sg-${color.replace('#', '')})`} />}
      <path d={d} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={endX} cy={endY} r="2.5" fill={color} />
    </svg>
  );
}
