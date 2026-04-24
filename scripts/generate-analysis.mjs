#!/usr/bin/env node
/**
 * Generates the maritime briefing via Claude and writes it to
 * public/analysis.json. Runs as a prebuild step so every deploy
 * ships a fresh briefing; locally, run `npm run generate:analysis`.
 *
 * If ANTHROPIC_API_KEY is not set, the script exits 0 without
 * modifying the existing JSON — the committed file is used as fallback.
 */

import Anthropic from '@anthropic-ai/sdk';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT = join(__dirname, '..', 'public', 'analysis.json');

function currentInputSnapshot() {
  const hourSeed = Math.floor(Date.now() / 3_600_000);
  const rng = (s) => {
    const x = Math.sin(hourSeed * 100 + s) * 10000;
    return x - Math.floor(x);
  };

  return {
    transitCount:      5 + Math.round(rng(1) * 4),
    freightRate_kday:  155 + Math.round(rng(2) * 20),
    darkVessels:       13 + Math.round(rng(3) * 6),
    warRiskPremium:    'Unquotable (VLCC/LR2); last quoted 5.2% hull value',
    transitBaseline:   110,
    freightBaseline_k: 28,
    carriersSuspended: 'Maersk, MSC, Hapag-Lloyd, CMA CGM',
    carriersLimited:   'COSCO (limited, under escort); ADNOC (active, sovereign status)',
    incidents:         'MSC Francesca and Epaminondas seized by IRGC Navy Apr 22, directed to Iranian coast; Euphoria targeted by IRGC Apr 22, grounded off Iranian coast; Elpis (sanctioned Iranian shadow fleet tanker) transited in defiance of US naval blockade Apr 14; Skylight (VLCC) missile strike Apr 10, constructive total loss; MKD Vyom (LR2) drone strike Apr 8, diverted to Fujairah',
    bypassStatus:      'East-West Pipeline 62%; Habshan–Fujairah 38%; Kirkuk–Ceyhan 22%',
  };
}

function parseIntro(raw) {
  // Accept either an "INTRO: ..." prefix or raw prose.
  const match = raw.match(/INTRO:\s*(.+)/s);
  return (match ? match[1] : raw).trim();
}

async function main() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.warn('→ ANTHROPIC_API_KEY not set. Keeping existing public/analysis.json.');
    process.exit(0);
  }

  const inputs = currentInputSnapshot();
  const transitDrop = Math.round((1 - inputs.transitCount / inputs.transitBaseline) * 100);
  const freightMultiple = Math.round(inputs.freightRate_kday / inputs.freightBaseline_k);

  const prompt = `You are a maritime risk analyst. Write 3–4 sentences for the top of a professional maritime intelligence briefing. Lead with the single most significant recent development from the incident data. Integrate current transit levels and freight market conditions. Write for a senior shipping or energy professional. Wrap 4–6 of the most scannable facts (vessel names, numbers, percentages, status changes, key dates) in double asterisks like **this** for visual emphasis. Do not use any other formatting, headings, or preamble. Output only the paragraph.

Current data:
- Vessel transits: ${inputs.transitCount}/day (baseline ${inputs.transitBaseline}/day; −${transitDrop}% from normal)
- War risk premium: ${inputs.warRiskPremium}
- AG–East VLCC freight rate: $${inputs.freightRate_kday}k/day (×${freightMultiple} vs $${inputs.freightBaseline_k}k baseline)
- Dark vessel detections (24 h): ${inputs.darkVessels}
- Key incidents: ${inputs.incidents}
- Carrier suspensions: ${inputs.carriersSuspended}
- Limited/continuing: ${inputs.carriersLimited}
- Bypass pipelines: ${inputs.bypassStatus}

Use professional shipping and insurance terminology. No markdown. No bold. No extra lines.`;

  console.log('→ Generating briefing via Claude Haiku 4.5…');
  const client = new Anthropic({ apiKey });
  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 300,
    messages: [{ role: 'user', content: prompt }],
  });

  const raw = message.content[0].text.trim();
  const intro = parseIntro(raw);

  if (!intro) {
    console.warn('→ LLM response empty. Keeping existing public/analysis.json.');
    process.exit(0);
  }

  const payload = {
    structured: { intro },
    generatedAt: new Date().toISOString(),
  };

  mkdirSync(dirname(OUTPUT), { recursive: true });
  writeFileSync(OUTPUT, JSON.stringify(payload, null, 2));
  console.log(`✓ Wrote ${OUTPUT}`);
}

main().catch((err) => {
  console.error('✗ Briefing generation failed:', err.message);
  console.warn('  Keeping existing public/analysis.json.');
  process.exit(0);
});
