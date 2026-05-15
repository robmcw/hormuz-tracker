#!/usr/bin/env node
/**
 * Fetches Strait of Hormuz maritime incidents via LinkUp search, evaluates
 * them with Claude, and writes the validated result to public/incidents.json.
 *
 * Runs before generate-analysis.mjs in the prebuild chain. Falls back
 * gracefully if either API key is missing — the committed file is kept.
 */

import Anthropic from '@anthropic-ai/sdk';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT = join(__dirname, '..', 'public', 'incidents.json');
const LINKUP_ENDPOINT = 'https://api.linkup.so/v1/search';

// ─── Schema for LinkUp structured output ─────────────────────────────────────

const INCIDENT_SCHEMA = {
  type: 'object',
  properties: {
    incidents: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          date:     { type: 'string', description: 'ISO date of the incident (YYYY-MM-DD)' },
          vessel:   { type: 'string', description: 'Vessel name in uppercase' },
          type:     { type: 'string', description: 'Vessel type, e.g. VLCC, Container Ship, LR2 Tanker, Oil Tanker' },
          flag:     { type: 'string', description: 'Flag state of the vessel' },
          event:    { type: 'string', description: 'Clear factual description of what happened, 1–3 sentences' },
          severity: { type: 'string', enum: ['CRITICAL', 'HIGH', 'MODERATE', 'LOW'] },
        },
        required: ['date', 'vessel', 'type', 'flag', 'event', 'severity'],
      },
    },
  },
  required: ['incidents'],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isoDateDaysAgo(n) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

function readExisting() {
  if (!existsSync(OUTPUT)) return null;
  try {
    return JSON.parse(readFileSync(OUTPUT, 'utf8'));
  } catch {
    return null;
  }
}

// ─── LinkUp search ────────────────────────────────────────────────────────────

async function runLinkupQuery(apiKey, query) {
  const res = await fetch(LINKUP_ENDPOINT, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      q: query,
      depth: 'deep',
      outputType: 'structured',
      structuredOutputSchema: INCIDENT_SCHEMA,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`LinkUp API ${res.status}: ${body}`);
  }

  const data = await res.json();
  return data?.output?.incidents ?? data?.incidents ?? [];
}

async function fetchIncidentsFromLinkup(apiKey) {
  const fromDate = isoDateDaysAgo(21);
  const queries = [
    `UKMTO ukmto.org recent incidents Strait of Hormuz Persian Gulf Gulf of Oman vessel attacks seizures drone missile since ${fromDate} JMIC EOS Risk maritime advisory`,
    `Strait of Hormuz Persian Gulf vessel named tanker container ship attacked seized hijacked struck damaged since ${fromDate}`,
    `Iranian IRGC Houthi attack vessel ship tanker bulk carrier Hormuz Arabian Sea Gulf of Oman since ${fromDate} news report`,
  ];

  const results = await Promise.allSettled(
    queries.map(async (q) => {
      console.log(`→ Querying LinkUp: "${q.slice(0, 80)}…"`);
      const r = await runLinkupQuery(apiKey, q);
      console.log(`  ↳ ${r.length} incidents`);
      return r;
    }),
  );

  const merged = [];
  const seen = new Set();
  for (const r of results) {
    if (r.status !== 'fulfilled') {
      console.warn(`  ↳ query failed: ${r.reason?.message ?? r.reason}`);
      continue;
    }
    for (const inc of r.value) {
      const key = `${inc.date}::${(inc.vessel ?? '').toUpperCase().trim()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(inc);
    }
  }
  console.log(`→ Merged unique incidents: ${merged.length}`);
  return merged;
}

// ─── Claude evaluation ────────────────────────────────────────────────────────

async function evaluateWithClaude(client, rawIncidents) {
  if (rawIncidents.length === 0) {
    console.warn('→ No incidents from LinkUp to evaluate.');
    return null;
  }

  const prompt = `You are a maritime intelligence analyst. Below is a list of Strait of Hormuz vessel incidents extracted from web sources. Your job is to:

1. Remove any incidents that are clearly not real (speculative, duplicate, or unrelated to the Strait of Hormuz / Persian Gulf region).
2. Correct obvious errors in vessel names, dates, or vessel types.
3. Ensure each severity is appropriate: CRITICAL = direct attack/seizure/CTL, HIGH = significant damage/diversion, MODERATE = harassment/minor damage, LOW = warning/near-miss.
4. Set simulated=false for all (these are real incidents).
5. Return only the cleaned, de-duplicated list, ordered by date descending (most recent first).
6. Keep vessel names in UPPERCASE.
7. Prefer the most recent incidents. Cap the list at 20 incidents.

Raw incidents from web search:
${JSON.stringify(rawIncidents, null, 2)}

Return ONLY a JSON array of validated incidents. Each item must have: date (YYYY-MM-DD), vessel (string), type (string), flag (string), event (string), severity (CRITICAL|HIGH|MODERATE|LOW), simulated (false). No markdown, no preamble.`;

  console.log('→ Evaluating incidents via Claude…');
  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 4000,
    messages: [{ role: 'user', content: prompt }],
  });

  const raw = message.content[0].text.trim();

  // Strip markdown code fences if present
  const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();

  try {
    const validated = JSON.parse(cleaned);
    if (!Array.isArray(validated)) throw new Error('Response is not an array');
    console.log(`→ Claude validated ${validated.length} incidents`);
    return validated;
  } catch (err) {
    console.warn(`→ Claude response parse failed: ${err.message}`);
    console.warn('  Raw:', raw.slice(0, 300));
    return null;
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const linkupKey   = process.env.LINKUP_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;

  if (!linkupKey) {
    console.warn('→ LINKUP_API_KEY not set. Keeping existing public/incidents.json.');
    process.exit(0);
  }
  if (!anthropicKey) {
    console.warn('→ ANTHROPIC_API_KEY not set. Keeping existing public/incidents.json.');
    process.exit(0);
  }

  let rawIncidents;
  try {
    rawIncidents = await fetchIncidentsFromLinkup(linkupKey);
  } catch (err) {
    console.error(`✗ LinkUp fetch failed: ${err.message}`);
    console.warn('  Keeping existing public/incidents.json.');
    process.exit(0);
  }

  const client = new Anthropic({ apiKey: anthropicKey });
  const incidents = await evaluateWithClaude(client, rawIncidents);

  if (!incidents || incidents.length === 0) {
    console.warn('→ No validated incidents. Keeping existing public/incidents.json.');
    process.exit(0);
  }

  const payload = {
    incidents,
    generatedAt: new Date().toISOString(),
  };

  mkdirSync(dirname(OUTPUT), { recursive: true });
  writeFileSync(OUTPUT, JSON.stringify(payload, null, 2));
  console.log(`✓ Wrote ${incidents.length} incidents to ${OUTPUT}`);
}

main().catch((err) => {
  console.error('✗ Incident generation failed:', err.message);
  console.warn('  Keeping existing public/incidents.json.');
  process.exit(0);
});
