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

function buildSearchRequest(query: string, sessionId = 'test-anon-session') {
  const url = `http://localhost:3000/api/search?q=${encodeURIComponent(query)}&type=all`;
  const req = new NextRequest(url, { method: 'GET' });
  req.cookies.set('anon_session', sessionId);
  return req;
}

describe('GET /api/search — anonymous rate limiting', () => {
  let GET: (req: NextRequest) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    // Reset module so the in-memory counter map is fresh
    vi.resetModules();
    const mod = await import('@/app/api/search/route');
    GET = mod.GET;
  });

  it('allows first 5 searches for anonymous users', async () => {
    mockGetCurrentUser.mockResolvedValue(null);

    for (let i = 0; i < 5; i++) {
      const res = await GET(buildSearchRequest(`query-${i}`));
      expect(res.status).toBe(200);
    }
  });

  it('returns 429 AUTH_REQUIRED on 6th anonymous search', async () => {
    mockGetCurrentUser.mockResolvedValue(null);

    // Use up 5 searches
    for (let i = 0; i < 5; i++) {
      const res = await GET(buildSearchRequest(`query-${i}`));
      expect(res.status).toBe(200);
    }

    // 6th should be blocked
    const res = await GET(buildSearchRequest('query-blocked'));
    expect(res.status).toBe(429);
    const json = await res.json();
    expect(json.code).toBe('AUTH_REQUIRED');
    expect(json.limit).toBe(5);
  });

  it('allows unlimited searches for authenticated users', async () => {
    mockGetCurrentUser.mockResolvedValue({ id: 'user-1', email: 'test@test.com' });

    for (let i = 0; i < 10; i++) {
      const res = await GET(buildSearchRequest(`query-${i}`));
      expect(res.status).toBe(200);
    }
  });

  it('tracks searches per session independently', async () => {
    mockGetCurrentUser.mockResolvedValue(null);

    // Session A: 5 searches
    for (let i = 0; i < 5; i++) {
      const res = await GET(buildSearchRequest(`q-${i}`, 'session-a'));
      expect(res.status).toBe(200);
    }

    // Session B: should still have 5 searches available
    const res = await GET(buildSearchRequest('q-0', 'session-b'));
    expect(res.status).toBe(200);
  });

  it('returns 400 for missing query', async () => {
    const req = new NextRequest('http://localhost:3000/api/search?q=', { method: 'GET' });
    const res = await GET(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('Missing q');
  });
});
