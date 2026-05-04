export const dynamic = 'force-dynamic';

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// ─── Incidents (generated at build-time by generate-incidents.mjs) ────────────

function loadIncidents() {
  try {
    const raw = readFileSync(join(process.cwd(), 'public', 'incidents.json'), 'utf8');
    return JSON.parse(raw).incidents ?? [];
  } catch {
    return [];
  }
}

const INCIDENTS = loadIncidents();

// Seeded pseudo-RNG — consistent within each hour, shifts each hour
function hourRng(slot: number): number {
  const seed = Math.floor(Date.now() / 3_600_000) * 100 + slot;
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

// ─── Simulated live values ────────────────────────────────────────────────────
const transitCount = 5  + Math.round(hourRng(1) * 4);           // 5–9/day
const freightRate  = 155_000 + Math.round(hourRng(2) * 28_000); // $155k–$183k/day
const darkVessels  = 13 + Math.round(hourRng(3) * 6);           // 13–19

// ─── 75-day transit history (Feb 1 – Apr 16, 2026) ───────────────────────────
// Narrative: stable pre-crisis → Feb 28 crisis onset → rapid decline →
// sustained low → Apr 8 ceasefire partial recovery → Apr 13 collapse.

function makeDate(dayIndex: number): string {
  const d = new Date('2026-02-01T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + dayIndex);
  return d.toISOString().slice(0, 10);
}

const RAW_TRANSIT = [
  // Feb 1–27: pre-crisis baseline ~110/day with normal variation (27 values)
  112, 108, 115, 110, 107, 113, 109, 111, 114, 106,
  108, 112, 110, 115, 109, 107, 113, 111, 108, 114,
  110, 112, 107, 109, 115, 111, 108,
  // Feb 28: crisis onset (index 27)
  88,
  // Mar 1–3: rapid decline (indices 28–30)
  52, 23, 11,
  // Mar 4–7: collapse (indices 31–34)
  7, 6, 8, 9,
  // Mar 8 – Apr 7: sustained crisis (indices 35–65, 31 values)
  8, 6, 7, 5, 9, 8, 6, 7, 8, 5,
  6, 7, 9, 8, 5, 6, 7, 8, 6, 5,
  7, 8, 9, 6, 5, 7, 8, 6, 7, 5, 8,
  // Apr 8–12: ceasefire partial recovery (indices 66–70)
  15, 22, 28, 24, 19,
  // Apr 13–15: collapse (indices 71–73)
  8, 7, 6,
  // Apr 16: live value (index 74)
  transitCount,
];

const TRANSIT_HISTORY = RAW_TRANSIT.map((value, i) => ({ date: makeDate(i), value }));

// ─── 30-day freight history ───────────────────────────────────────────────────
function daysAgo(n: number): string {
  const d = new Date('2026-04-16');
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

const FREIGHT_HISTORY = [
  29, 31, 28, 30, 32, 29, 28, 31, 30, 29,
  31, 28, 30, 32, 29, 31, 30, 28,
  54, 98, 142,
  168, 172, 160, 175, 162, 170, Math.round(freightRate / 1000),
  165, Math.round(freightRate / 1000),
].map((value, i) => ({ date: daysAgo(29 - i), value: value * 1000 }));

// ─── Signals ──────────────────────────────────────────────────────────────────

const SIGNALS = [
  {
    id: 'physical_threat',
    label: 'Physical Threat Level',
    value: 'CRITICAL — Active Interdiction',
    baseline: 'LOW (pre-crisis)',
    severity: 90,
    direction: 'WORSENING' as const,
    summary: 'IRGC conducting active vessel interdictions and naval harassment. Missile and drone threat confirmed. Three vessels struck in past 45 days.',
  },
  {
    id: 'transit',
    label: 'Transit Activity',
    value: `${transitCount} vessels/day`,
    baseline: '110 vessels/day',
    severity: 95,
    direction: 'WORSENING' as const,
    summary: `Down 94% from pre-crisis baseline of 110/day. Effective closure now entering seventh week. COSCO conducting limited transits under naval escort.`,
  },
  {
    id: 'insurance',
    label: 'Insurance Market',
    value: 'UNQUOTABLE (VLCC / LR2)',
    baseline: '~0.05% hull value',
    severity: 100,
    direction: 'WORSENING' as const,
    summary: 'Market effectively closed for VLCC and LR2 tonnage. Last quoted rate: 5.2% hull value for sub-Panamax. Most leading underwriters withdrawn.',
  },
  {
    id: 'political',
    label: 'Political Signal',
    value: 'NEGATIVE — Talks Stalled',
    baseline: 'NEUTRAL',
    severity: 78,
    direction: 'WORSENING' as const,
    summary: 'Apr 8 ceasefire collapsed Apr 13 following Elpis interdiction. US carrier group USS Gerald R. Ford remains in Gulf of Oman. Back-channel dialogue reported suspended.',
  },
  {
    id: 'dark',
    label: 'Dark Vessel Detections',
    value: `${darkVessels} (last 24 h)`,
    baseline: '2–3/day',
    severity: 80,
    direction: 'WORSENING' as const,
    summary: 'AIS blackout zone extending NW toward Bandar Abbas. Satellite cross-referencing active. Believed to include IRGC logistics vessels.',
  },
  {
    id: 'carriers',
    label: 'Major Carrier Suspensions',
    value: '4 SUSPENDED · 1 LIMITED · 1 ACTIVE',
    baseline: 'All normal',
    severity: 88,
    direction: 'STABLE' as const,
    summary: 'Maersk, MSC, Hapag-Lloyd, CMA CGM all suspended since late March. COSCO continuing limited Chinese-flagged tankers. ADNOC active under sovereign status.',
  },
];

// ─── Bypass pipelines ─────────────────────────────────────────────────────────

const PIPELINES = [
  {
    name: 'East-West Pipeline',
    region: 'Saudi Arabia',
    capacity_mbd: 5.0,
    utilisation: 0.62,
    trend: 'RISING' as const,
    note: 'Aramco maximising throughput. Additional pump stations activated.',
  },
  {
    name: 'Habshan–Fujairah',
    region: 'UAE',
    capacity_mbd: 1.5,
    utilisation: 0.38,
    trend: 'STABLE' as const,
    note: 'Operating below capacity. ADNOC managing flow to avoid congestion at Fujairah.',
  },
  {
    name: 'Kirkuk–Ceyhan',
    region: 'Iraq / Turkey',
    capacity_mbd: 0.9,
    utilisation: 0.22,
    trend: 'FALLING' as const,
    note: 'Reduced throughput. Political tensions with Turkey affecting scheduling.',
  },
];

// ─── Carrier advisories ───────────────────────────────────────────────────────

const CARRIERS = [
  { name: 'MAERSK',      status: 'SUSPENDED' as const, since: '2026-03-27', note: 'All Hormuz transits suspended. Routing via Cape of Good Hope.' },
  { name: 'MSC',         status: 'SUSPENDED' as const, since: '2026-03-28', note: 'JWC Listed Area breach. Force majeure declared on affected cargo.' },
  { name: 'HAPAG-LLOYD', status: 'SUSPENDED' as const, since: '2026-03-29', note: 'No transits. Customers notified of schedule revisions and surcharges.' },
  { name: 'CMA CGM',     status: 'SUSPENDED' as const, since: '2026-03-30', note: 'Operations suspended. Alternative routing adding 14–22 days transit time.' },
  { name: 'COSCO',       status: 'LIMITED'   as const, since: '2026-04-01', note: 'Limited transits continuing. Predominantly Chinese-flagged tankers under naval escort.' },
  { name: 'ADNOC',       status: 'NORMAL'    as const, since: '2026-03-01', note: 'Continuing operations under UAE sovereign status. Coordinating with US Naval Forces Central Command.' },
];

// ─── Response ─────────────────────────────────────────────────────────────────

export async function GET() {
  return Response.json({
    riskLevel: 'CRITICAL',
    riskPhrase: 'Effective Closure',
    signals: SIGNALS,
    incidents: INCIDENTS,
    pipelines: PIPELINES,
    carriers: CARRIERS,
    transitHistory: TRANSIT_HISTORY,
    freightHistory: FREIGHT_HISTORY,
    keyFigures: { transitCount, freightRate, darkVessels },
    timestamp: new Date().toISOString(),
  });
}
