# Hormuz: Live Vessel Map — Claude Code Brief

## Goal

Build a single-feature Next.js app that renders a live map of the Strait of Hormuz with real vessel positions streamed from aisstream.io via WebSocket. This is a feasibility prototype. The only objective is to confirm that live AIS data can be received, filtered to the strait bounding box, and plotted on a map in real time.

No UI polish required. Focus entirely on the data pipeline working correctly.

---

## Stack

- Next.js 14+ (App Router)
- TypeScript (strict mode)
- Tailwind CSS
- MapLibre GL JS (free, no API key required)
- aisstream.io WebSocket API (free)
- Deployment target: Vercel

---

## Environment

Create a `.env.local` file in the project root:

```
AISSTREAM_API_KEY=e4c7406bdefdc3c00a7c9a55b006bd86e8410dcc
```

Expose it to the client via `next.config.ts`:

```ts
const nextConfig = {
  env: {
    AISSTREAM_API_KEY: process.env.AISSTREAM_API_KEY,
  },
};
```

---

## Bounding Box

The Strait of Hormuz and immediate surrounding waters:

```
SW corner: [25.0, 55.5]   (lat, lng)
NE corner: [27.5, 58.5]   (lat, lng)
```

In aisstream.io format (array of [SW, NE]):
```json
"BoundingBoxes": [[[25.0, 55.5], [27.5, 58.5]]]
```

---

## Architecture

### WebSocket connection: server-side proxy route

Do NOT connect to aisstream.io directly from the browser. The API key must stay server-side.

Create a Next.js Route Handler at `app/api/ais-stream/route.ts` that:

1. Opens a WebSocket connection to `wss://stream.aisstream.io/v0/stream`
2. Sends the subscription message with the bounding box and API key
3. Forwards incoming AIS position messages to the client via Server-Sent Events (SSE)

Use SSE (not a browser WebSocket) for the client-facing transport — it works cleanly with Next.js Route Handlers and Vercel's streaming support.

```ts
// Subscription message to send to aisstream.io
{
  APIKey: process.env.AISSTREAM_API_KEY,
  BoundingBoxes: [[[25.0, 55.5], [27.5, 58.5]]],
  FilterMessageTypes: ["PositionReport"]
}
```

### SSE route skeleton

```ts
// app/api/ais-stream/route.ts
import { NextRequest } from 'next/server';
import WebSocket from 'ws';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const ws = new WebSocket('wss://stream.aisstream.io/v0/stream');

      ws.on('open', () => {
        ws.send(JSON.stringify({
          APIKey: process.env.AISSTREAM_API_KEY,
          BoundingBoxes: [[[25.0, 55.5], [27.5, 58.5]]],
          FilterMessageTypes: ['PositionReport'],
        }));
      });

      ws.on('message', (data) => {
        const msg = JSON.parse(data.toString());
        if (msg.MessageType === 'PositionReport') {
          const vessel: VesselPosition = {
            mmsi: msg.MetaData.MMSI,
            name: msg.MetaData.ShipName?.trim() || 'Unknown',
            lat: msg.MetaData.latitude,
            lng: msg.MetaData.longitude,
            speed: msg.Message.PositionReport.Sog,
            heading: msg.Message.PositionReport.Cog,
            shipType: msg.MetaData.ShipType ?? 0,
            timestamp: msg.MetaData.time_utc,
          };
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(vessel)}\n\n`)
          );
        }
      });

      ws.on('error', (err) => {
        console.error('AIS WebSocket error:', err);
        controller.close();
      });

      ws.on('close', () => controller.close());

      req.signal.addEventListener('abort', () => {
        ws.close();
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
```

Install the `ws` package: `npm install ws && npm install --save-dev @types/ws`

---

## Data Types

```ts
// types/ais.ts

export type VesselPosition = {
  mmsi: number;
  name: string;
  lat: number;
  lng: number;
  speed: number;       // knots, from Sog field
  heading: number;     // degrees, from Cog field
  shipType: number;    // AIS numeric ship type code
  timestamp: string;
};

export type VesselMap = Map<number, VesselPosition>; // keyed by MMSI
```

---

## Ship type classification

Map aisstream's numeric `ShipType` field to display categories:

```ts
// lib/shipType.ts

export function classifyVessel(shipType: number): 'tanker' | 'cargo' | 'military' | 'other' {
  if (shipType >= 80 && shipType <= 89) return 'tanker';
  if (shipType >= 70 && shipType <= 79) return 'cargo';
  if (shipType === 35) return 'military';
  return 'other';
}

export const VESSEL_COLOURS = {
  tanker:   '#f0a030',
  cargo:    '#4db87a',
  military: '#5b9cf6',
  other:    '#888780',
} as const;
```

---

## Map component

Use MapLibre GL JS. Free base map tiles from [OpenFreeMap](https://openfreemap.org/) — no API key needed.

```ts
// components/HormuzMap.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { VesselPosition, VesselMap } from '@/types/ais';
import { classifyVessel, VESSEL_COLOURS } from '@/lib/shipType';

const MAP_CENTRE: [number, number] = [56.8, 26.4]; // lng, lat — MapLibre is lng-first
const MAP_ZOOM = 7.5;

const TILE_STYLE = 'https://tiles.openfreemap.org/styles/positron';
```

### Map initialisation

Initialise the map in a `useEffect` with an empty dependency array. Store the map instance in a `useRef`.

Set the initial view to `MAP_CENTRE` at `MAP_ZOOM`. The map should fill its container div (use `w-full h-full`).

### Vessel markers

Use MapLibre markers (not a GeoJSON layer) for simplicity at this prototype stage. Each vessel is a `maplibregl.Marker` with a small coloured div as the element.

Maintain a `useRef<Map<number, maplibregl.Marker>>` to track active markers by MMSI.

When a new position arrives for an MMSI already on the map, call `marker.setLngLat([lng, lat])` to move it. When a new MMSI arrives, create a new marker.

Marker element styles:
```ts
const el = document.createElement('div');
el.style.cssText = `
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${VESSEL_COLOURS[type]};
  box-shadow: 0 0 6px ${VESSEL_COLOURS[type]}80;
  cursor: pointer;
`;
```

Add a MapLibre popup on marker click showing: vessel name, MMSI, speed, type, last update time.

### Stale vessel cleanup

Vessels that haven't broadcast in 10 minutes should be removed from the map. Run a `setInterval` every 60 seconds that checks each tracked vessel's `timestamp` and removes markers for stale vessels.

---

## SSE client hook

```ts
// hooks/useAisStream.ts
'use client';

import { useEffect, useRef, useState } from 'react';
import { VesselPosition } from '@/types/ais';

export function useAisStream(onVessel: (v: VesselPosition) => void) {
  const [connected, setConnected] = useState(false);
  const [vesselCount, setVesselCount] = useState(0);
  const countRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    const es = new EventSource('/api/ais-stream');

    es.onopen = () => setConnected(true);

    es.onmessage = (e) => {
      const vessel: VesselPosition = JSON.parse(e.data);
      countRef.current.add(vessel.mmsi);
      setVesselCount(countRef.current.size);
      onVessel(vessel);
    };

    es.onerror = () => {
      setConnected(false);
      es.close();
    };

    return () => es.close();
  }, [onVessel]);

  return { connected, vesselCount };
}
```

---

## Page layout

```ts
// app/page.tsx
```

The page should be full-viewport dark background (`bg-[#0a0e14]`). The map fills the full viewport. Overlay a minimal status bar at the top using absolute positioning:

- Left: "HORMUZ" wordmark in a monospace font
- Centre: live vessel count (e.g. "7 vessels broadcasting")
- Right: connection status dot (green = connected, red = disconnected) + "LIVE" label

Keep the overlay minimal — this is a feasibility build. No sidebar, no stats panel.

---

## Known limitations to document in README

1. **Terrestrial AIS coverage.** aisstream.io uses shore-based receivers. Coverage in mid-strait open water is limited. Vessels near the UAE and Oman coasts will appear more reliably than those in the centre of the channel.

2. **Dark vessels.** Ships that disable their AIS transponder are invisible. During the current crisis many vessels are going dark. The map shows confirmed broadcasting vessels only — treat the count as a lower bound.

3. **WebSocket on Vercel.** The SSE route works on Vercel's serverless functions. However, Vercel functions have a maximum execution time (60s on Pro, 10s on Hobby). For production this architecture should move to a persistent WebSocket server (e.g. a small Railway or Fly.io instance) that maintains the aisstream connection and forwards to clients. For prototype/demo purposes the SSE route is sufficient.

4. **AIS spoofing.** Vessels in conflict zones sometimes broadcast false positions. No spoofing detection is implemented in this prototype.

---

## What success looks like

After `npm run dev`:

- Map loads centred on the Strait of Hormuz
- Within 30–60 seconds, coloured dots begin appearing as vessels broadcast
- Dots reposition when the same MMSI sends a new position report
- Clicking a dot shows a popup with vessel name and speed
- The status bar shows a climbing vessel count and a green connected indicator

If the strait is effectively closed (as it currently is), you may see very few vessels — that itself is the story. Even 2–3 dots confirming the pipeline works is a successful prototype.

---

## Out of scope for this build

- Oil price data
- Sidebar / stats panel
- News/intel feed
- Bypass pipeline status
- Mobile responsiveness
- Any visual polish beyond functional markers
