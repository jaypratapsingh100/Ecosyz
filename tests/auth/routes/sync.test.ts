import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ---- Mocks ----

const mockSetSessionTokens = vi.fn();
const mockEnsureUserInDb = vi.fn();

vi.mock('@/lib/auth/core/tokens', () => ({
  setSessionTokens: (...args: any[]) => mockSetSessionTokens(...args),
}));

vi.mock('@/lib/auth/server', () => ({
  ensureUserInDb: (...args: any[]) => mockEnsureUserInDb(...args),
}));

function buildRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost:3000/api/auth/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const validBody = {
  accessToken: 'at',
  refreshToken: 'rt',
  expiresIn: 3600,
  userId: 'uid-1',
  email: 'user@test.com',
  name: 'Test',
  avatarUrl: null,
};

describe('POST /api/auth/sync', () => {
  let POST: (req: NextRequest) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockSetSessionTokens.mockResolvedValue(undefined);
    mockEnsureUserInDb.mockResolvedValue(undefined);
    const mod = await import('@/app/api/auth/sync/route');
    POST = mod.POST;
  });

  it('returns 400 when tokens are missing', async () => {
    const res = await POST(buildRequest({ userId: 'uid', email: 'e@t.com' }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('Missing tokens');
  });

  it('returns 400 when user data is missing', async () => {
    const res = await POST(buildRequest({ accessToken: 'at', refreshToken: 'rt' }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('Missing user data');
  });

  it('returns 200 on successful sync', async () => {
    const res = await POST(buildRequest(validBody));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(mockSetSessionTokens).toHaveBeenCalledWith('at', 'rt', 3600);
    expect(mockEnsureUserInDb).toHaveBeenCalled();
  });

  it('returns 500 when token sync fails', async () => {
    mockSetSessionTokens.mockRejectedValue(new Error('cookie error'));

    const res = await POST(buildRequest(validBody));
    expect(res.status).toBe(500);
  });

  it('succeeds even if DB sync fails (graceful degradation)', async () => {
    mockEnsureUserInDb.mockRejectedValue(new Error('DB down'));

    const res = await POST(buildRequest(validBody));
    expect(res.status).toBe(200);
  });
});
