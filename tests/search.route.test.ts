/* SPDX-License-Identifier: MIT
 * Vitest tests for federated search API route.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock auth and db before importing route (avoids @/lib resolution in auth.ts)
vi.mock('../src/lib/auth', () => ({ getCurrentUser: vi.fn().mockResolvedValue(null) }));
vi.mock('../src/lib/db', () => ({ prisma: { searchLog: { create: vi.fn().mockResolvedValue({}) } } }));
vi.mock('../src/lib/api-usage', () => ({ trackApiRequest: vi.fn() }));

// Mock provider modules
vi.mock('../app/api/search/providers/openalex', () => ({ searchOpenAlex: vi.fn() }));
vi.mock('../app/api/search/providers/arxiv', () => ({ searchArxiv: vi.fn() }));
vi.mock('../app/api/search/providers/zenodo', () => ({ searchZenodo: vi.fn() }));
vi.mock('../app/api/search/providers/swh', () => ({ searchSoftwareHeritage: vi.fn() }));
vi.mock('../app/api/search/providers/github', () => ({ searchGithubCode: vi.fn().mockResolvedValue([]) }));
vi.mock('../app/api/search/providers/huggingface', () => ({ searchHuggingFaceModels: vi.fn().mockResolvedValue([]) }));
vi.mock('../app/api/search/providers/youtube', () => ({ searchYouTubeVideos: vi.fn().mockResolvedValue([]) }));
vi.mock('../app/api/search/providers/hardware', () => ({ searchHardware: vi.fn().mockResolvedValue([]) }));
vi.mock('../app/api/search/providers/oshwa', () => ({ searchOshwaHardware: vi.fn().mockResolvedValue([]) }));
vi.mock('../app/api/search/providers/wikifactory', () => ({ searchWikifactoryDesigns: vi.fn().mockResolvedValue([]) }));

import { GET } from '../app/api/search/route';
import { searchOpenAlex } from '../app/api/search/providers/openalex';
import { searchArxiv } from '../app/api/search/providers/arxiv';
import { searchZenodo } from '../app/api/search/providers/zenodo';
import { searchSoftwareHeritage } from '../app/api/search/providers/swh';

function makeReq(q = 'test', type = 'all', cacheBust?: string) {
  const params = new URLSearchParams({ q, type });
  if (cacheBust) params.set('_', cacheBust);
  return { url: `http://localhost/api/search?${params}` } as any;
}

describe('GET /api/search', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 200 and ≤30 items', async () => {
    (searchOpenAlex as any).mockResolvedValue(Array(15).fill({ id: 'a', type: 'paper', title: 'A', source: 'openalex', url: 'u', license: 'MIT' }));
    (searchArxiv as any).mockResolvedValue(Array(15).fill({ id: 'b', type: 'paper', title: 'B', source: 'arxiv', url: 'u2', license: 'MIT' }));
    (searchZenodo as any).mockResolvedValue([]);
    (searchSoftwareHeritage as any).mockResolvedValue([]);
    const res = await GET(makeReq('test', 'all', 't1'));
    const data = await res.json();
    expect(res.status).toBe(200);
    const items = data.results ?? data.items ?? [];
    expect(items.length).toBeLessThanOrEqual(30);
  });

  it('dedupes by id', async () => {
    (searchOpenAlex as any).mockResolvedValue([{ id: 'x', type: 'paper', title: 'A', source: 'openalex', url: 'u', license: 'MIT' }]);
    (searchArxiv as any).mockResolvedValue([{ id: 'x', type: 'paper', title: 'A', source: 'arxiv', url: 'u', license: 'MIT' }]);
    (searchZenodo as any).mockResolvedValue([]);
    (searchSoftwareHeritage as any).mockResolvedValue([]);
    const res = await GET(makeReq('dedupe', 'all', 't2'));
    const data = await res.json();
    const items = data.results ?? data.items ?? [];
    expect(items.length).toBe(1);
  });

  it('provider timeout does not fail whole request', async () => {
    (searchOpenAlex as any).mockResolvedValue([{ id: 'a', type: 'paper', title: 'A', source: 'openalex', url: 'u', license: 'MIT' }]);
    (searchArxiv as any).mockRejectedValue(new Error('timeout'));
    (searchZenodo as any).mockResolvedValue([]);
    (searchSoftwareHeritage as any).mockResolvedValue([]);
    const res = await GET(makeReq('timeout', 'all', 't3'));
    const data = await res.json();
    const items = data.results ?? data.items ?? [];
    expect(items.length).toBe(1);
  });
});
