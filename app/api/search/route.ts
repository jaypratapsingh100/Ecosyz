/* SPDX-License-Identifier: MIT
 * Federated search API route for Open Idea.
 */
import { NextRequest, NextResponse } from 'next/server';
export const revalidate = 0;
export const runtime = 'nodejs';
import { searchOpenAlex } from './providers/openalex';
import { searchArxiv } from './providers/arxiv';
import { searchZenodo } from './providers/zenodo';
import { searchSoftwareHeritage } from './providers/swh';
import { searchGithubCode } from './providers/github';
import { searchHuggingFaceModels } from './providers/huggingface';
import { searchYouTubeVideos } from './providers/youtube';
import { searchHardware } from './providers/hardware';
import { searchOshwaHardware } from './providers/oshwa';
import { searchWikifactoryDesigns } from './providers/wikifactory';
import type { Resource, ResourceType } from '../../../src/types/resource';
import { dedupeConservative } from './lib/dedupe';
import { getCurrentUser } from '../../../src/lib/auth';
import { prisma } from '../../../src/lib/db';
import { trackApiRequest } from '../../../src/lib/api-usage';

// Anonymous search limit: 5 searches per session before login required
const ANON_SEARCH_LIMIT = 5;
const anonSearchCounts = new Map<string, { count: number; ts: number }>();
const ANON_WINDOW_MS = 24 * 60 * 60 * 1000; // 24-hour window

interface SearchCoverage {
  requestedProviders: string[];
  receivedCounts: Record<string, number>;
  uniqueBefore: number;
  uniqueAfter: number;
  merged: number;
}

interface SearchSessionData {
  items: Resource[];
  total: number;
  coverage: SearchCoverage;
}

interface SearchResponse extends Omit<SearchSessionData, 'items'> {
  results: Resource[];
  page: number;
  limit: number;
  hasMore: boolean;
  nextCursor: string | null;
  decisions?: Array<{ winnerId: string; loserId: string; reason: string }>;
}

// Optimized in-memory LRU cache for search results
// - Avoids rate limits by caching recent queries
// - TTL (time-to-live) and max size are configurable
// - Uses Map for O(1) access and LRU eviction
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const CACHE_MAX = 100; // Max number of cached queries
const cache = new Map<string, { ts: number; data: SearchSessionData }>();

function getCache(key: string): SearchSessionData | undefined {
  // Move accessed entry to the end (most recently used)
  const entry = cache.get(key);
  if (!entry) return undefined;
  if (Date.now() - entry.ts > CACHE_TTL) {
    cache.delete(key);
    return undefined;
  }
  cache.delete(key);
  cache.set(key, entry);
  return entry.data;
}

function setCache(key: string, data: SearchSessionData) {
  // Insert or update, then move to end (most recently used)
  if (cache.has(key)) cache.delete(key);
  cache.set(key, { ts: Date.now(), data });
  // Evict least recently used if over max size
  if (cache.size > CACHE_MAX) {
    const lruKey = cache.keys().next().value;
    if (typeof lruKey === 'string') cache.delete(lruKey);
  }
}

// Cursor helpers
function encodeCursor(obj: { sessionId: string; offset: number; limit: number }): string {
  const json = JSON.stringify(obj);
  // base64url encoding
  const b64 = Buffer.from(json, 'utf8').toString('base64');
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function decodeCursor(str: string): { sessionId: string; offset: number; limit: number } | null {
  try {
    // Convert base64url back to base64
    let b64 = str.replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4) b64 += '=';
    const json = Buffer.from(b64, 'base64').toString('utf8');
    const obj = JSON.parse(json);
    if (!obj || typeof obj.sessionId !== 'string') return null;
    return { sessionId: obj.sessionId, offset: Number(obj.offset) || 0, limit: Number(obj.limit) || 30 };
  } catch {
    return null;
  }
}

// Scoring helpers
function scoreResource(r: Resource, q: string): number {
  const text = (r.title + ' ' + (r.description || '')).toLowerCase();
  const match = text.includes(q.toLowerCase()) ? 1 : 0;
  const recency = r.year ? Math.max(0, (new Date().getFullYear() - r.year) < 5 ? 1 : 0) : 0;
  const quality = (r.license && r.license !== 'NOASSERTION' ? 1 : 0);
  return 0.5 * match + 0.3 * recency + 0.2 * quality;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const cursorParam = searchParams.get('cursor');

  // Cursor-mode handling: return next slice from an existing session
  if (cursorParam) {
    const cur = decodeCursor(cursorParam);
    if (!cur) {
      return NextResponse.json({ results: [], total: 0, nextCursor: null }, {
        headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=30' },
      });
    }
    const sessionKey = `session:${cur.sessionId}`;
    const session = getCache(sessionKey) as undefined | { items: Resource[]; total: number; coverage?: any };
    if (!session || !Array.isArray(session.items)) {
      return NextResponse.json({ results: [], total: 0, nextCursor: null }, {
        headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=30' },
      });
    }
    const start = Math.max(0, cur.offset);
    const end = Math.min(session.items.length, start + cur.limit);
    const slice = session.items.slice(start, end);
    const nextOffset = end;
    const nextCursor = nextOffset < session.items.length
      ? encodeCursor({ sessionId: cur.sessionId, offset: nextOffset, limit: cur.limit })
      : null;
    const resp = {
      results: slice,
      total: session.items.length,
      limit: cur.limit,
      nextCursor,
      coverage: session.coverage || null,
    };
    return NextResponse.json(resp, {
      headers: { 'Cache-Control': 's-maxage=300, stale-while-revalidate=60' },
    });
  }
  const q = searchParams.get('q') || '';
  const type = searchParams.get('type') as ResourceType | 'all' | null;
  // Accept new type values: model, hardware, video (even if no providers yet)
  const debug = searchParams.get('debug') === '1';
  if (!q) return NextResponse.json({ error: 'Missing q' }, { status: 400 });

  // Enforce search limit for anonymous users
  const user = await getCurrentUser();
  if (!user) {
    const sessionId = req.cookies.get('anon_session')?.value || 'unknown';
    const entry = anonSearchCounts.get(sessionId);
    const now = Date.now();

    if (entry && now - entry.ts < ANON_WINDOW_MS) {
      if (entry.count >= ANON_SEARCH_LIMIT) {
        return NextResponse.json(
          {
            error: 'Search limit reached',
            code: 'AUTH_REQUIRED',
            message: `You've used your ${ANON_SEARCH_LIMIT} free searches. Sign in to continue searching.`,
            limit: ANON_SEARCH_LIMIT,
          },
          { status: 429 }
        );
      }
      entry.count++;
    } else {
      anonSearchCounts.set(sessionId, { count: 1, ts: now });
    }

    // Cleanup stale entries periodically
    if (anonSearchCounts.size > 10000) {
      for (const [key, val] of anonSearchCounts) {
        if (now - val.ts > ANON_WINDOW_MS) anonSearchCounts.delete(key);
      }
    }
  }

  // Pagination params must be part of the cache key
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '30', 10);
  const cacheKey = `${q}:${type}:${page}:${limit}`;
  const cached = getCache(cacheKey);
  if (cached) return NextResponse.json(cached, {
    headers: {
      'Cache-Control': 's-maxage=300, stale-while-revalidate=60',
    },
  });

  // Fan-out to providers in parallel
  // Add new providers here as needed (see docs/specs/providers.md)
  const providerFns = [
    { name: 'openalex', fn: () => searchOpenAlex(q) },
    { name: 'arxiv', fn: () => searchArxiv(q) },
    { name: 'zenodo', fn: () => searchZenodo(q) },
    { name: 'swh', fn: () => searchSoftwareHeritage(q) },
    { name: 'github', fn: () => searchGithubCode(q) },
    { name: 'huggingface', fn: () => searchHuggingFaceModels(q) },
    { name: 'youtube', fn: () => searchYouTubeVideos(q) },
    { name: 'hardware', fn: () => searchHardware(q) },
    { name: 'oshwa', fn: () => searchOshwaHardware(q) },
    { name: 'wikifactory', fn: () => searchWikifactoryDesigns(q) },
  ];
  const results: Record<string, Resource[]> = {};
  await Promise.all(
    providerFns.map(async ({ name, fn }) => {
      try {
        results[name] = await fn();
        void trackApiRequest(name, 'search');
      } catch {
        results[name] = [];
      }
    })
  );
  let all = Object.values(results).flat();
  if (type && type !== 'all') all = all.filter(r => r.type === type);
  all.forEach(r => (r.score = scoreResource(r, q)));
  const dedupeResult = dedupeConservative(all);
  const deduped = dedupeResult.items.sort((a, b) => (b.score || 0) - (a.score || 0));

  // Pagination
  const start = (page - 1) * limit;
  const end = start + limit;
  const paginated = deduped.slice(start, end);
  const hasMore = end < deduped.length;

  // Create a session for cursor-based continuation
  const sessionId = (globalThis as any).crypto?.randomUUID?.() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  const sessionKey = `session:${sessionId}`;
  setCache(sessionKey, { items: deduped, total: deduped.length, coverage: {
    requestedProviders: providerFns.map(p => p.name),
    receivedCounts: Object.fromEntries(Object.entries(results).map(([k, v]) => [k, v.length])),
    uniqueBefore: all.length,
    uniqueAfter: dedupeResult.items.length,
    merged: dedupeResult.merged,
  } });
  const nextOffset = end;
  const nextCursor = nextOffset < deduped.length ? encodeCursor({ sessionId, offset: nextOffset, limit }) : null;

  // Build response before caching so we cache the entire payload
  const resp: SearchResponse = {
    results: paginated,
    total: deduped.length,
    page,
    limit,
    hasMore,
    nextCursor,
    coverage: {
      requestedProviders: providerFns.map(p => p.name),
      receivedCounts: Object.fromEntries(Object.entries(results).map(([k, v]) => [k, v.length])),
      uniqueBefore: all.length,
      uniqueAfter: dedupeResult.items.length,
      merged: dedupeResult.merged,
      // Documented in docs/specs/providers.md
    }
  };
  const sessionData: SearchSessionData = {
    items: deduped,
    total: deduped.length,
    coverage: resp.coverage
  };
  setCache(cacheKey, sessionData);
  
  // Track search (non-blocking, don't wait for it)
  try {
    const providers = providerFns.map(p => p.name);
    
    // Track search asynchronously - don't block the response
    prisma.searchLog.create({
      data: {
        userId: user?.id || null,
        query: q.trim(),
        resourceType: type || null,
        resultCount: deduped.length,
        clicked: false, // Will be updated when user clicks a result
        providers,
        sessionId,
      },
    }).catch(err => {
      // Silently fail tracking - don't log errors in production
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to track search:', err);
      }
    });
  } catch (error) {
    // Silently fail tracking
  }
  
  // See docs/specs/dedupe-pipeline.md and docs/specs/providers.md for details
  if (debug) resp.decisions = dedupeResult.decisions;
  return NextResponse.json(resp, {
    headers: {
      'Cache-Control': 's-maxage=300, stale-while-revalidate=60',
    },
  });
}
