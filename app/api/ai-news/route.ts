import { NextResponse } from 'next/server';
import { trackApiRequest } from '@/lib/api-usage';

export type AiNewsItem = {
  id: string;
  title: string;
  url: string;
  source: string;
  date: string;
  description?: string;
  /** ~200 word summary for card display */
  summary?: string;
  imageUrl?: string;
  points?: number;
  comments?: number;
  category: string;
};

const SUMMARY_WORDS = 200;

function toSummary(text: string | null | undefined, fallback: string): string {
  if (!text || !text.trim()) return fallback;
  const words = text.trim().replace(/\s+/g, ' ').split(' ');
  if (words.length <= SUMMARY_WORDS) return words.join(' ');
  return words.slice(0, SUMMARY_WORDS).join(' ') + '…';
}

const HN_ALGOLIA = 'https://hn.algolia.com/api/v1';
const DEVTO_API = 'https://dev.to/api/articles';
const HITS_PER_QUERY = 20;

async function fetchHnSearch(query: string, category: string): Promise<AiNewsItem[]> {
  const url = `${HN_ALGOLIA}/search?query=${encodeURIComponent(query)}&tags=story&hitsPerPage=${HITS_PER_QUERY}&attributesToRetrieve=title,url,author,created_at,points,num_comments,objectID`;
  const res = await fetch(url, { next: { revalidate: 600 } });
  if (!res.ok) return [];
  const data = await res.json();
  const hits = data.hits ?? [];
  return hits
    .filter((h: { title: string; url?: string }) => h.title && (h.url || h.story_url))
    .map((h: { objectID: string; title: string; url?: string; story_url?: string; author: string; created_at: string; points?: number; num_comments?: number }) => {
      const fallback = `${h.title} — From Hacker News. Tap to read more.`;
      return {
        id: `hn-${h.objectID}`,
        title: h.title,
        url: h.url || h.story_url || `https://news.ycombinator.com/item?id=${h.objectID}`,
        source: 'Hacker News',
        date: h.created_at,
        points: h.points,
        comments: h.num_comments,
        category,
        summary: toSummary(null, fallback),
      };
    });
}

function devToTagToCategory(tag: string): string {
  if (tag === 'ai') return 'AI';
  if (tag === 'science') return 'Science';
  if (tag === 'startup' || tag === 'startups') return 'Startup Strategies';
  if (tag === 'data' || tag === 'database') return 'Building Data';
  if (tag === 'tutorial' || tag === 'howto') return 'How To';
  return 'Tech';
}

async function fetchDevTo(tag: string, perPage = 15): Promise<AiNewsItem[]> {
  const url = `${DEVTO_API}?tag=${encodeURIComponent(tag)}&per_page=${perPage}`;
  const res = await fetch(url, { next: { revalidate: 600 } });
  if (!res.ok) return [];
  const data = await res.json();
  if (!Array.isArray(data)) return [];
  const category = devToTagToCategory(tag);
  return data.map(
    (
      a: {
        id: number;
        title: string;
        url: string;
        description: string | null;
        published_at: string;
        cover_image?: string | null;
        social_image?: string | null;
      },
      i: number
    ) => {
      const fallback = `${a.title} — From Dev.to. Tap to read more.`;
      return {
        id: `devto-${a.id}-${i}`,
        title: a.title,
        url: a.url,
        source: 'Dev.to',
        date: a.published_at,
        description: a.description ?? undefined,
        summary: toSummary(a.description ?? null, fallback),
        imageUrl: a.cover_image || a.social_image || undefined,
        category,
      };
    }
  );
}

async function fetchGNews(query: string, apiKey: string, category: string): Promise<AiNewsItem[]> {
  const url = `https://gnews.io/api/v4/search?q=${encodeURIComponent(query)}&lang=en&max=15&apikey=${apiKey}`;
  const res = await fetch(url, { next: { revalidate: 600 } });
  if (!res.ok) return [];
  const data = await res.json();
  const articles = data.articles ?? [];
  return articles.map(
    (
      a: {
        title: string;
        url: string;
        source?: { name?: string };
        publishedAt: string;
        description?: string;
        image?: string;
      },
      i: number
    ) => {
      const fallback = `${a.title} — From ${a.source?.name ?? 'GNews'}. Tap to read more.`;
      return {
        id: `gnews-${a.publishedAt}-${i}`,
        title: a.title,
        url: a.url,
        source: a.source?.name ?? 'GNews',
        date: a.publishedAt,
        description: a.description,
        summary: toSummary(a.description ?? null, fallback),
        imageUrl: a.image,
        category,
      };
    }
  );
}

export async function GET() {
  try {
    const items: AiNewsItem[] = [];
    const seen = new Set<string>();

    // 1. Hacker News: AI, open source, biotech, nanotech, science, tech, quantum, India startup, startup strategies, building data, startup idea, India problems, how to (13 requests)
    const [
      hnAi,
      hnOpenSource,
      hnBiotech,
      hnNanotech,
      hnScience,
      hnTech,
      hnQuantum,
      hnIndiaStartup,
      hnStartupStrategy,
      hnBuildingData,
      hnStartupIdea,
      hnIndiaProblems,
      hnHowTo,
    ] = await Promise.all([
      fetchHnSearch('AI artificial intelligence', 'AI'),
      fetchHnSearch('open source', 'Open Source'),
      fetchHnSearch('biotech biotechnology', 'Biotech'),
      fetchHnSearch('nanotech nanotechnology', 'Nanotech'),
      fetchHnSearch('science technology', 'Science'),
      fetchHnSearch('technology programming', 'Tech'),
      fetchHnSearch('quantum computing', 'Quantum'),
      fetchHnSearch('India startup Indian startup', 'India Startup'),
      fetchHnSearch('startup strategy', 'Startup Strategies'),
      fetchHnSearch('building data data pipeline data engineering', 'Building Data'),
      fetchHnSearch('startup idea', 'Startup Idea'),
      fetchHnSearch('India problems', 'India Problems'),
      fetchHnSearch('how to', 'How To'),
    ]);
    for (let i = 0; i < 13; i++) void trackApiRequest('hackernews', 'news');

    for (const item of [
      ...hnAi,
      ...hnOpenSource,
      ...hnBiotech,
      ...hnNanotech,
      ...hnScience,
      ...hnTech,
      ...hnQuantum,
      ...hnIndiaStartup,
      ...hnStartupStrategy,
      ...hnBuildingData,
      ...hnStartupIdea,
      ...hnIndiaProblems,
      ...hnHowTo,
    ]) {
      const key = item.url || item.id;
      if (!seen.has(key)) {
        seen.add(key);
        items.push(item);
      }
    }

    // 2. Dev.to (free, no key): technology, science, ai, startup, data, tutorial (6 requests)
    const [devToTech, devToScience, devToAi, devToStartup, devToData, devToTutorial] = await Promise.all([
      fetchDevTo('technology', 8),
      fetchDevTo('science', 5),
      fetchDevTo('ai', 8),
      fetchDevTo('startup', 8),
      fetchDevTo('data', 8),
      fetchDevTo('tutorial', 8),
    ]);
    for (let i = 0; i < 6; i++) void trackApiRequest('devto', 'news');

    for (const item of [...devToTech, ...devToScience, ...devToAi, ...devToStartup, ...devToData, ...devToTutorial]) {
      const key = item.url || item.id;
      if (!seen.has(key)) {
        seen.add(key);
        items.push(item);
      }
    }

    // 3. GNews (optional): AI, science, quantum, India startup, startup idea, India problems, how to
    const gnewsKey = process.env.GNEWS_API_KEY;
    if (gnewsKey) {
      const [
        gnewsAi,
        gnewsBio,
        gnewsQuantum,
        gnewsIndiaStartup,
        gnewsStartupIdea,
        gnewsIndiaProblems,
        gnewsHowTo,
      ] = await Promise.all([
        fetchGNews('AI technology open source', gnewsKey, 'AI'),
        fetchGNews('biotech nanotechnology science', gnewsKey, 'Science'),
        fetchGNews('quantum computing', gnewsKey, 'Quantum'),
        fetchGNews('India startup', gnewsKey, 'India Startup'),
        fetchGNews('startup idea', gnewsKey, 'Startup Idea'),
        fetchGNews('India problems', gnewsKey, 'India Problems'),
        fetchGNews('how to tutorial', gnewsKey, 'How To'),
      ]);
      for (let i = 0; i < 7; i++) void trackApiRequest('gnews', 'news');
      for (const item of [
        ...gnewsAi,
        ...gnewsBio,
        ...gnewsQuantum,
        ...gnewsIndiaStartup,
        ...gnewsStartupIdea,
        ...gnewsIndiaProblems,
        ...gnewsHowTo,
      ]) {
        const key = item.url || item.id;
        if (!seen.has(key)) {
          seen.add(key);
          items.push(item);
        }
      }
    }

    items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return NextResponse.json({
      items,
      sources: gnewsKey ? ['Hacker News', 'Dev.to', 'GNews'] : ['Hacker News', 'Dev.to'],
    });
  } catch (error) {
    console.error('AI news fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch AI news', items: [] },
      { status: 500 }
    );
  }
}
