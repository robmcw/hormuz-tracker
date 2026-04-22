'use client';

import Sparkline from './Sparkline';

interface OilData {
  brent: { price: number; change: number; changePercent: number; currency: string; history: { date: string; value: number }[] };
  wti:   { price: number; change: number; changePercent: number; currency: string };
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
  oil:            OilData | null;
  freightHistory: { date: string; value: number }[];
  freightRate:    number | null;
  pipelines:      Pipeline[];
}

function Label({ children }: { children: string }) {
  return <div className="font-mono text-[9px] tracking-widest text-white/25 uppercase mb-3">{children}</div>;
}

function pipelineColor(u: number): string {
  if (u > 0.7) return '#f97316';
  if (u > 0.4) return '#f59e0b';
  return '#22c55e';
}

export default function MarketData({ oil, freightHistory, freightRate, pipelines }: Props) {
  const brentUp = oil ? oil.brent.change >= 0 : null;
  const wtiUp   = oil ? oil.wti.change   >= 0 : null;

  return (
    <div className="grid grid-cols-3 gap-6">

      {/* ── Oil Prices ─────────────────────────────────────────────────── */}
      <div>
        <Label>Crude Oil — ICE / NYMEX</Label>
        {!oil && <div className="font-mono text-xs text-white/30 animate-pulse">Loading…</div>}
        {oil && (
          <>
            <div className="space-y-2 mb-3">
              <div className="flex justify-between items-baseline font-mono">
                <span className="text-[10px] text-white/40">BRENT (ICE)</span>
                <span className="text-sm text-white/85 font-semibold">
                  ${oil.brent.price.toFixed(2)}
                  <span className={`ml-1.5 text-[10px] font-normal ${brentUp ? 'text-green-400' : 'text-red-400'}`}>
                    {brentUp ? '▲' : '▼'}{Math.abs(oil.brent.changePercent).toFixed(1)}%
                  </span>
                </span>
              </div>
              <div className="flex justify-between items-baseline font-mono">
                <span className="text-[10px] text-white/40">WTI (NYMEX)</span>
                <span className="text-sm text-white/85 font-semibold">
                  ${oil.wti.price.toFixed(2)}
                  <span className={`ml-1.5 text-[10px] font-normal ${wtiUp ? 'text-green-400' : 'text-red-400'}`}>
                    {wtiUp ? '▲' : '▼'}{Math.abs(oil.wti.changePercent).toFixed(1)}%
                  </span>
                </span>
              </div>
            </div>
            {oil.brent.history.length > 1 && (
              <>
                <Sparkline values={oil.brent.history.map(p => p.value)} color="#f0a030" height={48} />
                <div className="font-mono text-[9px] text-white/20 mt-1">ICE Brent — 3-month daily</div>
              </>
            )}
          </>
        )}
      </div>

      {/* ── Freight Rate ────────────────────────────────────────────────── */}
      <div>
        <Label>AG–East VLCC Rate ($/day)</Label>
        {freightHistory.length === 0 && (
          <div className="font-mono text-xs text-white/30 animate-pulse">Loading…</div>
        )}
        {freightHistory.length > 0 && (
          <>
            {freightRate !== null && (
              <div className="font-mono text-sm text-orange-400 font-semibold mb-1">
                ${(freightRate / 1000).toFixed(0)}k/day
                <span className="font-normal text-white/30 text-[10px] ml-1.5">now</span>
              </div>
            )}
            <Sparkline values={freightHistory.map(p => p.value / 1000)} color="#f97316" height={48} />
            <div className="flex justify-between font-mono text-[9px] text-white/25 mt-1">
              <span>baseline $28k</span>
              <span className="text-orange-400">${freightRate ? (freightRate / 1000).toFixed(0) : '—'}k now</span>
            </div>
            <div className="mt-2 font-mono text-[10px] text-white/35 leading-relaxed space-y-0.5">
              <div>War risk premium: <span className="text-red-400">UNQUOTABLE (VLCC/LR2)</span></div>
              <div>Last quoted: 5.2% hull value (sub-Panamax)</div>
            </div>
          </>
        )}
      </div>

      {/* ── Bypass Pipelines ─────────────────────────────────────────────── */}
      <div>
        <Label>Bypass Pipeline Utilisation</Label>
        {pipelines.length === 0 && (
          <div className="font-mono text-xs text-white/30 animate-pulse">Loading…</div>
        )}
        <div className="space-y-4">
          {pipelines.map(p => (
            <div key={p.name}>
              <div className="flex justify-between font-mono text-[10px] mb-1">
                <span className="text-white/70">{p.name}</span>
                <span className="text-white/35">{p.capacity_mbd} mb/d</span>
              </div>
              <div className="h-1.5 bg-white/10 rounded-full overflow-hidden mb-1">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${p.utilisation * 100}%`,
                    background: pipelineColor(p.utilisation),
                  }}
                />
              </div>
              <div className="flex justify-between font-mono text-[9px]">
                <span className="text-white/30">{p.note}</span>
                <span className="text-white/50">{Math.round(p.utilisation * 100)}%</span>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3 font-mono text-[9px] text-white/20">
          Combined bypass covers ~35% of normal strait throughput (20 mb/d)
        </div>
      </div>

    </div>
  );
}
