'use client';

import { useState, useCallback } from 'react';
import IntelPanel, { StraitStatus, STATUS_CONFIG } from '@/components/IntelPanel';

export default function Home() {
  const [status, setStatus] = useState<StraitStatus>('MONITORING');

  const handleStatusChange = useCallback((s: StraitStatus) => setStatus(s), []);

  const { label, color, pulse } = STATUS_CONFIG[status];

  return (
    <div className="w-screen h-screen bg-[#0a0e14] overflow-hidden flex flex-col">

      {/* Status bar */}
      <div className="shrink-0 flex items-center justify-between px-5 py-2.5 border-b border-white/10 bg-[#0a0e14]/90 backdrop-blur-sm z-10">
        <span className="font-mono text-sm font-bold tracking-widest text-white/90">
          HORMUZ
        </span>

        {/* Strait status — centre */}
        <div className="flex items-center gap-2.5">
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{
              background: color,
              boxShadow: `0 0 0 3px ${pulse}, 0 0 8px ${color}`,
            }}
          />
          <span className="font-mono text-xs tracking-widest" style={{ color }}>
            {label.toUpperCase()}
          </span>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs text-white/40">
          <span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_6px_#22c55e]" />
          LIVE
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">

        {/* MarineTraffic embed — 60% */}
        <div className="flex-[3] relative">
          <iframe
            src="https://www.marinetraffic.com/en/ais/embed/zoom:9/centery:26.56/centerx:56.25/maptype:4/shownames:true/mmsi:0/shipid:0/fleet:/fleet_id:/vtypes:/showmenu:/remember:false"
            className="w-full h-full border-0"
            title="Strait of Hormuz — Live Vessel Positions"
            loading="eager"
          />
        </div>

        {/* Intelligence panel — 40% */}
        <div className="flex-[2] bg-[#0a0e14] border-l border-white/10 overflow-hidden flex flex-col">
          <IntelPanel onStatusChange={handleStatusChange} />
        </div>

      </div>
    </div>
  );
}
