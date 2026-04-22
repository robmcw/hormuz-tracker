'use client';

import { useEffect, useRef } from 'react';

// Vessel types for the legend
const LEGEND = [
  { color: '#f97316', label: 'Tanker / VLCC' },
  { color: '#3b82f6', label: 'Naval / Escort' },
  { color: '#6b7280', label: 'Dark vessel (AIS off)' },
  { color: '#ef4444', label: 'Incident location' },
];

// Simulated vessel positions — seeded from public reporting
const VESSELS = [
  { id: 'cosco_harmony', name: 'COSCO HARMONY', type: 'tanker' as const, lng: 56.82, lat: 26.62, heading: 268, flag: 'China', status: 'TRANSITING' },
  { id: 'adnoc_salam',   name: 'ADNOC AL SALAM', type: 'tanker' as const, lng: 56.20, lat: 26.44, heading: 82, flag: 'UAE', status: 'TRANSITING' },
  { id: 'uss_ford',      name: 'USS GERALD R. FORD', type: 'naval' as const, lng: 58.40, lat: 24.92, heading: 320, flag: 'USA', status: 'PATROL' },
  { id: 'uss_cole',      name: 'USS COLE',       type: 'naval' as const, lng: 57.80, lat: 25.30, heading: 280, flag: 'USA', status: 'PATROL' },
  { id: 'dark_1',        name: 'UNKNOWN',        type: 'dark'  as const, lng: 56.08, lat: 26.72, heading: 0,   flag: null,  status: 'DARK' },
  { id: 'dark_2',        name: 'UNKNOWN',        type: 'dark'  as const, lng: 56.55, lat: 26.92, heading: 0,   flag: null,  status: 'DARK' },
  { id: 'dark_3',        name: 'UNKNOWN',        type: 'dark'  as const, lng: 55.88, lat: 26.34, heading: 0,   flag: null,  status: 'DARK' },
];

// Incident markers
const INCIDENTS_MAP = [
  { id: 'elpis',    name: 'ELPIS interdiction',    date: '2026-04-13', lng: 56.10, lat: 26.40, color: '#ef4444' },
  { id: 'skylight', name: 'SKYLIGHT missile strike', date: '2026-04-10', lng: 56.35, lat: 26.52, color: '#ef4444' },
  { id: 'mkdvyom',  name: 'MKD VYOM drone hit',    date: '2026-04-08', lng: 56.60, lat: 26.48, color: '#f97316' },
];

// IRGC influence zone (north strait near Iran coast)
const IRGC_ZONE = [
  [55.50, 27.10], [56.80, 27.30], [57.40, 26.90], [57.80, 26.70],
  [57.60, 26.40], [56.90, 26.50], [55.80, 26.70], [55.50, 27.10],
];

// US carrier operating area (Gulf of Oman, east of strait)
const US_ZONE = [
  [57.80, 24.20], [59.50, 24.20], [59.50, 25.80], [57.80, 25.80], [57.80, 24.20],
];

function vesselColor(type: 'tanker' | 'naval' | 'dark'): string {
  if (type === 'tanker') return '#f97316';
  if (type === 'naval')  return '#3b82f6';
  return '#6b7280';
}

export default function HormuzMap() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    let map: import('maplibre-gl').Map | null = null;

    import('maplibre-gl').then(({ default: maplibregl }) => {
      // Inject CSS once
      if (!document.querySelector('link[data-maplibre]')) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/maplibre-gl@5/dist/maplibre-gl.css';
        link.setAttribute('data-maplibre', '1');
        document.head.appendChild(link);
      }

      if (!containerRef.current) return;

      map = new maplibregl.Map({
        container: containerRef.current,
        style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
        center: [56.5, 26.5],
        zoom: 7.2,
        attributionControl: false,
      });

      map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');
      map.addControl(new maplibregl.NavigationControl(), 'top-right');
      map.scrollZoom.enable();

      map.on('load', () => {
        if (!map) return;

        // IRGC influence zone
        map.addSource('irgc-zone', {
          type: 'geojson',
          data: {
            type: 'Feature',
            geometry: { type: 'Polygon', coordinates: [IRGC_ZONE] },
            properties: {},
          },
        });
        map.addLayer({
          id: 'irgc-fill',
          type: 'fill',
          source: 'irgc-zone',
          paint: { 'fill-color': '#ef4444', 'fill-opacity': 0.08 },
        });
        map.addLayer({
          id: 'irgc-line',
          type: 'line',
          source: 'irgc-zone',
          paint: { 'line-color': '#ef4444', 'line-width': 1, 'line-dasharray': [4, 3], 'line-opacity': 0.5 },
        });

        // US carrier operating area
        map.addSource('us-zone', {
          type: 'geojson',
          data: {
            type: 'Feature',
            geometry: { type: 'Polygon', coordinates: [US_ZONE] },
            properties: {},
          },
        });
        map.addLayer({
          id: 'us-fill',
          type: 'fill',
          source: 'us-zone',
          paint: { 'fill-color': '#3b82f6', 'fill-opacity': 0.06 },
        });
        map.addLayer({
          id: 'us-line',
          type: 'line',
          source: 'us-zone',
          paint: { 'line-color': '#3b82f6', 'line-width': 1, 'line-dasharray': [4, 3], 'line-opacity': 0.4 },
        });

        // Zone labels
        const irgcLabelEl = document.createElement('div');
        irgcLabelEl.innerHTML = '<div style="font-family:monospace;font-size:9px;color:rgba(239,68,68,0.7);letter-spacing:0.1em;pointer-events:none">IRGC INFLUENCE ZONE</div>';
        new maplibregl.Marker({ element: irgcLabelEl }).setLngLat([56.8, 27.08]).addTo(map);

        const usLabelEl = document.createElement('div');
        usLabelEl.innerHTML = '<div style="font-family:monospace;font-size:9px;color:rgba(59,130,246,0.7);letter-spacing:0.1em;pointer-events:none">USN CARRIER GROUP</div>';
        new maplibregl.Marker({ element: usLabelEl }).setLngLat([58.6, 24.45]).addTo(map);

        // Vessel markers
        VESSELS.forEach(v => {
          const el = document.createElement('div');
          const color = vesselColor(v.type);
          el.style.cssText = `
            width: ${v.type === 'naval' ? 10 : 8}px;
            height: ${v.type === 'naval' ? 10 : 8}px;
            border-radius: 50%;
            background: ${color};
            border: 1.5px solid ${color}90;
            box-shadow: 0 0 6px ${color}60;
            cursor: pointer;
          `;
          if (v.type === 'dark') {
            el.style.background = 'transparent';
            el.style.border = `1.5px solid ${color}`;
            el.style.boxShadow = 'none';
          }

          const popup = new maplibregl.Popup({ offset: 12, closeButton: false })
            .setHTML(`
              <div style="font-family:monospace;font-size:10px;color:rgba(255,255,255,0.85);background:#0a0e14;border:1px solid rgba(255,255,255,0.1);padding:8px 10px;border-radius:2px;white-space:nowrap">
                <div style="font-weight:600;color:${color};margin-bottom:3px">${v.name}</div>
                ${v.flag ? `<div style="color:rgba(255,255,255,0.45)">${v.flag} · ${v.status}</div>` : `<div style="color:${color}">AIS TRANSPONDER OFF</div>`}
              </div>
            `);

          new maplibregl.Marker({ element: el })
            .setLngLat([v.lng, v.lat])
            .setPopup(popup)
            .addTo(map!);
        });

        // Incident markers
        INCIDENTS_MAP.forEach(inc => {
          const el = document.createElement('div');
          el.style.cssText = `
            width: 14px;
            height: 14px;
            background: transparent;
            border: 2px solid ${inc.color};
            transform: rotate(45deg);
            cursor: pointer;
            box-shadow: 0 0 8px ${inc.color}50;
          `;

          const popup = new maplibregl.Popup({ offset: 12, closeButton: false })
            .setHTML(`
              <div style="font-family:monospace;font-size:10px;color:rgba(255,255,255,0.85);background:#0a0e14;border:1px solid rgba(255,255,255,0.1);padding:8px 10px;border-radius:2px">
                <div style="font-weight:600;color:${inc.color};margin-bottom:3px">${inc.name}</div>
                <div style="color:rgba(255,255,255,0.45)">${inc.date}</div>
              </div>
            `);

          new maplibregl.Marker({ element: el })
            .setLngLat([inc.lng, inc.lat])
            .setPopup(popup)
            .addTo(map!);
        });
      });
    });

    return () => {
      map?.remove();
    };
  }, []);

  return (
    <div className="relative w-full" style={{ height: 480 }}>
      <div ref={containerRef} className="absolute inset-0" />

      {/* Legend */}
      <div className="absolute bottom-3 left-3 bg-[#0a0e14]/90 border border-white/10 rounded-sm px-3 py-2.5 z-10 pointer-events-none">
        <div className="font-mono text-[8px] tracking-widest text-white/25 uppercase mb-2">Legend</div>
        <div className="space-y-1.5">
          {LEGEND.map(item => (
            <div key={item.label} className="flex items-center gap-2">
              <div
                className="w-2 h-2 rounded-full shrink-0"
                style={{ background: item.label.includes('Dark') ? 'transparent' : item.color, border: `1.5px solid ${item.color}` }}
              />
              <span className="font-mono text-[9px] text-white/50">{item.label}</span>
            </div>
          ))}
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 shrink-0 border border-red-500" style={{ transform: 'rotate(45deg)' }} />
            <span className="font-mono text-[9px] text-white/50">Incident</span>
          </div>
        </div>
      </div>

      {/* Area labels */}
      <div className="absolute top-3 left-3 font-mono text-[9px] text-white/50 bg-[#0a0e14]/80 px-2 py-1 rounded-sm border border-white/10 pointer-events-none z-10">
        JWC LISTED AREA · PERSIAN GULF / GULF OF OMAN
      </div>
    </div>
  );
}
