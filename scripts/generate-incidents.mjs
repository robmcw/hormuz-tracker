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

async function fetchIncidentsFromLinkup(apiKey) {
  const fromDate = isoDateDaysAgo(21);
  const query = `Strait of Hormuz maritime incidents vessel attacks seizures since ${fromDate} shipping risk`;

  console.log(`→ Querying LinkUp: "${query}"`);

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

  // LinkUp returns { output: { incidents: [...] } } for structured mode
  const incidents = data?.output?.incidents ?? data?.incidents ?? [];
  console.log(`→ LinkUp returned ${incidents.length} raw incidents`);
  return incidents;
}

// ─── Claude evaluation ────────────────────────────────────────────────────────

async function evaluateWithClaude(client, rawIncidents) {
  if (rawIncidents.length === 0) {
    console.warn('→ No incidents from LinkUp to evaluate.');
    return null;
  }

  const today = new Date().toISOString().slice(0, 10);

  const prompt = `You are a maritime intelligence analyst. Today's date is ${today}. Below is a list of Strait of Hormuz vessel incidents extracted from web sources. Your job is to:

1. Remove any incidents that are clearly not real (speculative, duplicate, or unrelated to the Strait of Hormuz / Persian Gulf region).
2. Each incident's date must reflect when the incident actually occurred, as reported in the source. For single events use the exact reported date. For ongoing or aggregate incidents (e.g. "since March 1, X vessels attacked"), use the start date of the period. Do not default to today's date — only use today if the source explicitly says the incident happened today.
3. Verify dates are plausible: they must be on or before ${today} and must match the incident description. Drop an incident only if there is genuinely no date information at all in the source.
4. Correct obvious errors in vessel names or vessel types.
5. Ensure each severity is appropriate: CRITICAL = direct attack/seizure/CTL, HIGH = significant damage/diversion, MODERATE = harassment/minor damage, LOW = warning/near-miss.
6. Set simulated=false for all (these are real incidents).
7. Return only the cleaned, de-duplicated list, ordered by date descending (most recent first).
8. Keep vessel names in UPPERCASE.
9. Cap the list at 10 incidents.

Raw incidents from web search:
${JSON.stringify(rawIncidents, null, 2)}

Return ONLY a JSON array of validated incidents. Each item must have: date (YYYY-MM-DD), vessel (string), type (string), flag (string), event (string), severity (CRITICAL|HIGH|MODERATE|LOW), simulated (false). No markdown, no preamble.`;

  console.log('→ Evaluating incidents via Claude…');
  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2000,
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
