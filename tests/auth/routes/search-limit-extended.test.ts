import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ---- Mocks ----

const mockGetCurrentUser = vi.fn();

vi.mock('@/src/lib/auth', () => ({
  getCurrentUser: () => mockGetCurrentUser(),
}));

vi.mock('@/src/lib/db', () => ({
  prisma: {
    searchLog: {
      create: vi.fn(() => Promise.resolve()),
    },
  },
}));

vi.mock('@/src/lib/api-usage', () => ({
  trackApiRequest: vi.fn(),
}));

// Mock all search providers to return empty arrays (fast)
const emptyProvider = vi.fn(() => Promise.resolve([]));
vi.mock('@/app/api/search/providers/openalex', () => ({ searchOpenAlex: emptyProvider }));
vi.mock('@/app/api/search/providers/arxiv', () => ({ searchArxiv: emptyProvider }));
vi.mock('@/app/api/search/providers/zenodo', () => ({ searchZenodo: emptyProvider }));
vi.mock('@/app/api/search/providers/swh', () => ({ searchSoftwareHeritage: emptyProvider }));
vi.mock('@/app/api/search/providers/github', () => ({ searchGithubCode: emptyProvider }));
vi.mock('@/app/api/search/providers/huggingface', () => ({ searchHuggingFaceModels: emptyProvider }));
vi.mock('@/app/api/search/providers/youtube', () => ({ searchYouTubeVideos: emptyProvider }));
vi.mock('@/app/api/search/providers/hardware', () => ({ searchHardware: emptyProvider }));
vi.mock('@/app/api/search/providers/oshwa', () => ({ searchOshwaHardware: emptyProvider }));
vi.mock('@/app/api/search/providers/wikifactory', () => ({ searchWikifactoryDesigns: emptyProvider }));

vi.mock('@/app/api/search/lib/dedupe', () => ({
  dedupeConservative: (items: any[]) => ({ items, merged: 0, decisions: [] }),
}));

function buildSearchRequest(query: string, sessionId = 'test-session-ext', cookies?: Record<string, string>) {
  const url = `http://localhost:3000/api/search?q=${encodeURIComponent(query)}&type=all`;
  const req = new NextRequest(url, { method: 'GET' });
  req.cookies.set('anon_session', sessionId);
  if (cookies) {
    for (const [k, v] of Object.entries(cookies)) {
      req.cookies.set(k, v);
    }
  }
  return req;
}

describe('GET /api/search — extended rate limit edge cases', () => {
  let GET: (req: NextRequest) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    const mod = await import('@/app/api/search/route');
    GET = mod.GET;
  });

  it('returns correct limit and message fields in 429 response', async () => {
    mockGetCurrentUser.mockResolvedValue(null);

    // Use up 5 searches
    for (let i = 0; i < 5; i++) {
      await GET(buildSearchRequest(`ext-q-${i}`, 'session-429-fields'));
    }

    const res = await GET(buildSearchRequest('ext-q-blocked', 'session-429-fields'));
    expect(res.status).toBe(429);
    const json = await res.json();
    expect(json.code).toBe('AUTH_REQUIRED');
    expect(json.limit).toBe(5);
    expect(json.message).toContain('5 free searches');
    expect(json.error).toBe('Search limit reached');
  });

  it('authenticated user with same session cookie gets unlimited searches', async () => {
    mockGetCurrentUser.mockResolvedValue({ id: 'auth-user', email: 'a@t.com' });

    // Should work for 10+ searches
    for (let i = 0; i < 10; i++) {
      const res = await GET(buildSearchRequest(`auth-q-${i}`, 'session-auth-user'));
      expect(res.status).toBe(200);
    }
  });

  it('uses unknown session ID when no anon_session cookie', async () => {
    mockGetCurrentUser.mockResolvedValue(null);

    const url = 'http://localhost:3000/api/search?q=test&type=all';
    const req = new NextRequest(url, { method: 'GET' });
    // No anon_session cookie set

    const res = await GET(req);
    // Should still work (first search for 'unknown' session)
    expect(res.status).toBe(200);
  });

  it('different resource type filters still count toward limit', async () => {
    mockGetCurrentUser.mockResolvedValue(null);
    const sid = 'session-type-filter';

    // Mix of different types — each counts as 1 search
    const types = ['paper', 'code', 'dataset', 'model', 'hardware'];
    for (let i = 0; i < 5; i++) {
      const url = `http://localhost:3000/api/search?q=test-${i}&type=${types[i]}`;
      const req = new NextRequest(url, { method: 'GET' });
      req.cookies.set('anon_session', sid);
      const res = await GET(req);
      expect(res.status).toBe(200);
    }

    // 6th should be blocked
    const url = 'http://localhost:3000/api/search?q=test-6&type=video';
    const req = new NextRequest(url, { method: 'GET' });
    req.cookies.set('anon_session', sid);
    const res = await GET(req);
    expect(res.status).toBe(429);
  });

  it('cursor-based pagination does not count toward search limit', async () => {
    mockGetCurrentUser.mockResolvedValue(null);
    const sid = 'session-cursor';

    // Use up all 5 searches
    for (let i = 0; i < 5; i++) {
      const res = await GET(buildSearchRequest(`cursor-q-${i}`, sid));
      expect(res.status).toBe(200);
    }

    // Cursor request should still work (cursor param triggers early return before limit check)
    // Create a fake cursor (base64url of JSON)
    const cursorData = JSON.stringify({ sessionId: 'fake', offset: 0, limit: 10 });
    const b64 = Buffer.from(cursorData, 'utf8').toString('base64')
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const url = `http://localhost:3000/api/search?cursor=${b64}`;
    const req = new NextRequest(url, { method: 'GET' });
    req.cookies.set('anon_session', sid);
    const res = await GET(req);
    // Cursor returns 200 even if limit is reached (it's a different code path)
    expect(res.status).toBe(200);
  });

  it('returns 400 for empty query string', async () => {
    const req = new NextRequest('http://localhost:3000/api/search?q=&type=all', { method: 'GET' });
    const res = await GET(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('Missing q');
  });

  it('returns 400 for missing q param entirely', async () => {
    const req = new NextRequest('http://localhost:3000/api/search?type=all', { method: 'GET' });
    const res = await GET(req);
    expect(res.status).toBe(400);
  });
});
