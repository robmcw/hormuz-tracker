import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

// Only keep articles where the TITLE itself mentions Hormuz/maritime terms.
// This prevents off-topic articles where Hormuz is merely a passing reference
// in the body of an unrelated story.
const TITLE_KEYWORDS = [
  'hormuz', 'persian gulf', 'strait', 'tanker', 'blockade',
  'iran oil', 'iran ship', 'naval', 'supertanker', 'iran navy', 'irgc',
  'gulf vessel', 'oil ship', 'shipping lane',
];

function titleIsRelevant(title: string): boolean {
  const t = title.toLowerCase();
  return TITLE_KEYWORDS.some(k => t.includes(k));
}

export async function GET(_req: NextRequest) {
  try {
    const apiKey = process.env.NEWS_API_KEY;
    if (!apiKey) throw new Error('NEWS_API_KEY not configured');

    const url = new URL('https://newsapi.org/v2/everything');
    // Require phrases to appear in title/description, not buried in article body
    url.searchParams.set(
      'q',
      '"Strait of Hormuz" OR "Hormuz shipping" OR "Hormuz tanker" OR "Hormuz blockade" OR "Hormuz closure" OR "Persian Gulf tanker" OR "Persian Gulf shipping"',
    );
    url.searchParams.set('searchIn', 'title,description');
    url.searchParams.set('sortBy', 'publishedAt');
    url.searchParams.set('language', 'en');
    url.searchParams.set('pageSize', '20'); // fetch more so filter still yields enough
    url.searchParams.set('apiKey', apiKey);

    const res = await fetch(url.toString(), { cache: 'no-store' });
    if (!res.ok) throw new Error(`NewsAPI responded ${res.status}`);

    const data = await res.json();
    if (data.status !== 'ok') throw new Error(data.message ?? 'NewsAPI error');

    const articles = (data.articles ?? [])
      .filter((a: { title?: string }) => a.title && a.title !== '[Removed]')
      .filter((a: { title: string }) => titleIsRelevant(a.title))
      .slice(0, 8)
      .map((a: {
        title: string;
        description?: string;
        url: string;
        source?: { name?: string };
        publishedAt: string;
      }) => ({
        title: a.title,
        description: a.description ?? null,
        url: a.url,
        source: a.source?.name ?? 'Unknown',
        publishedAt: a.publishedAt,
      }));

    return Response.json({ articles });
  } catch (err) {
    console.error('News fetch error:', err);
    return Response.json({ error: String(err), articles: [] }, { status: 502 });
  }
}
