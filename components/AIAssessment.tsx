'use client';

interface StructuredAnalysis {
  direction: string;
  directionText: string;
  primaryDriver: string;
  contrarian: string;
  changeCondition: string;
}

interface Props {
  analysis: {
    structured: StructuredAnalysis | null;
    generatedAt: string;
    cached: boolean;
    error?: string;
  } | null;
}

const BORDER = 'rgba(255,255,255,0.08)';
const SURFACE = '#0e1c2e';
const MUTED = 'rgba(221,234,245,0.58)';
const FAINT = 'rgba(221,234,245,0.34)';

function utcTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }) + ' UTC';
}

interface ColProps {
  label: string;
  text: string;
  accentColor: string;
  labelColor: string;
  last?: boolean;
}

function Col({ label, text, accentColor, labelColor, last }: ColProps) {
  return (
    <div
      style={{
        borderTop: `2px solid ${accentColor}`,
        borderRight: last ? 'none' : `0.5px solid ${BORDER}`,
        padding: '20px 28px 24px',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      <div
        className="font-mono text-[9px] tracking-[0.12em] uppercase"
        style={{ color: labelColor }}
      >
        {label}
      </div>
      <div className="text-[12.5px] leading-[1.7]" style={{ color: MUTED }}>
        {text}
      </div>
    </div>
  );
}

const PLACEHOLDER = 'Loading assessment…';

export default function AIAssessment({ analysis }: Props) {
  const s = analysis?.structured ?? null;

  return (
    <div style={{ background: SURFACE, borderBottom: `0.5px solid ${BORDER}` }}>
      {/* Header row */}
      <div
        className="flex items-center justify-between"
        style={{ padding: '20px 32px 18px', borderBottom: `0.5px solid ${BORDER}` }}
      >
        <div className="font-mono text-[10px] tracking-[0.13em] uppercase" style={{ color: 'rgba(221,234,245,0.62)' }}>
          AI Risk Assessment · Claude
        </div>
        <div className="font-mono text-[10px]" style={{ color: FAINT }}>
          {analysis?.generatedAt ? `Generated ${utcTime(analysis.generatedAt)} · refreshes hourly` : 'Loading…'}
        </div>
      </div>

      {/* 4-column strip */}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <Col
          label="Risk direction"
          text={s?.directionText ?? PLACEHOLDER}
          accentColor="var(--red-text)"
          labelColor="var(--red-text)"
        />
        <Col
          label="Primary driver"
          text={s?.primaryDriver ?? PLACEHOLDER}
          accentColor="var(--amber-text)"
          labelColor="var(--amber-text)"
        />
        <Col
          label="Contrarian signal"
          text={s?.contrarian ?? PLACEHOLDER}
          accentColor="var(--green-text)"
          labelColor="var(--green-text)"
        />
        <Col
          label="What would change this"
          text={s?.changeCondition ?? PLACEHOLDER}
          accentColor="rgba(221,234,245,0.2)"
          labelColor={FAINT}
          last
        />
      </div>
    </div>
  );
}
