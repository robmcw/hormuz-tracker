import Anthropic from '@anthropic-ai/sdk';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface StructuredAnalysis {
  intro: string;            // 2–3 sentence situation summary for the top of the page
  direction: string;        // e.g. "WORSENING"
  directionText: string;    // 1–2 sentences
  primaryDriver: string;    // 1–2 sentences
  contrarian: string;       // 1 sentence
  changeCondition: string;  // 1 sentence
}

interface CacheEntry {
  structured: StructuredAnalysis;
  inputs: object;
  timestamp: number;
}

let cache: CacheEntry | null = null;
const CACHE_TTL_MS = 60 * 60 * 1000;

function currentInputSnapshot() {
  const hourSeed = Math.floor(Date.now() / 3_600_000);
  const rng = (s: number) => { const x = Math.sin(hourSeed * 100 + s) * 10000; return x - Math.floor(x); };

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

function parseStructured(raw: string): StructuredAnalysis {
  const get = (key: string): string => {
    const match = raw.match(new RegExp(`${key}:\\s*(.+?)(?=\\n[A-Z_]+:|$)`, 's'));
    return match ? match[1].trim() : '';
  };
  return {
    intro:           get('INTRO'),
    direction:       get('DIRECTION'),
    directionText:   get('DIRECTION_TEXT'),
    primaryDriver:   get('PRIMARY_DRIVER'),
    contrarian:      get('CONTRARIAN'),
    changeCondition: get('CHANGE_CONDITION'),
  };
}

export async function GET() {
  const now = Date.now();

  if (cache && now - cache.timestamp < CACHE_TTL_MS) {
    return Response.json({
      structured: cache.structured,
      inputs: cache.inputs,
      generatedAt: new Date(cache.timestamp).toISOString(),
      cached: true,
    });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json({ error: 'ANTHROPIC_API_KEY not configured', structured: null }, { status: 503 });
  }

  const inputs = currentInputSnapshot();
  const transitDrop = Math.round((1 - inputs.transitCount / inputs.transitBaseline) * 100);
  const freightMultiple = Math.round(inputs.freightRate_kday / inputs.freightBaseline_k);

  const prompt = `You are a maritime risk analyst. Respond ONLY in this exact format — no other text, no markdown:

INTRO: [3–4 sentences for the top of a professional maritime intelligence briefing. Lead with the single most significant recent development from the incident data. Integrate current transit levels and freight market conditions. Write for a senior shipping or energy professional. Wrap 4–6 of the most scannable facts (vessel names, numbers, percentages, status changes, key dates) in double asterisks like **this** for visual emphasis. Do not use any other formatting.]
DIRECTION: [one word: WORSENING, STABLE, or IMPROVING]
DIRECTION_TEXT: [1–2 plain sentences on overall risk trajectory]
PRIMARY_DRIVER: [1–2 plain sentences naming the single dominant risk factor]
CONTRARIAN: [1 plain sentence on one signal that complicates the picture]
CHANGE_CONDITION: [1 plain sentence on what would need to change to alter the assessment]

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

  try {
    const client = new Anthropic({ apiKey });
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 600,
      messages: [{ role: 'user', content: prompt }],
    });

    const raw = (message.content[0] as { type: string; text: string }).text.trim();
    const structured = parseStructured(raw);

    cache = { structured, inputs, timestamp: now };

    return Response.json({
      structured,
      inputs,
      generatedAt: new Date(now).toISOString(),
      cached: false,
    });
  } catch (err) {
    console.error('Anthropic API error:', err);
    return Response.json({ error: String(err), structured: null }, { status: 502 });
  }
}
