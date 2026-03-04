import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---- Mocks ----

const mockGetCurrentUser = vi.fn();
const mockGetTokens = vi.fn();

vi.mock('@/lib/auth', () => ({
  getCurrentUser: (...args: any[]) => mockGetCurrentUser(...args),
}));

vi.mock('@/lib/auth/core/tokens', () => ({
  getTokens: (...args: any[]) => mockGetTokens(...args),
}));

describe('GET /api/auth/session', () => {
  let GET: () => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockGetTokens.mockResolvedValue({ accessToken: 'tok', refreshToken: 'ref' });
    const mod = await import('@/app/api/auth/session/route');
    GET = mod.GET;
  });

  it('returns 401 when not authenticated', async () => {
    mockGetCurrentUser.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe('Not authenticated');
  });

  it('returns 200 with user data when authenticated', async () => {
    mockGetCurrentUser.mockResolvedValue({
      id: 'uid-1',
      email: 'user@test.com',
      user_metadata: { name: 'Test', avatar_url: 'https://img.test/a.png' },
    });

    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.user.id).toBe('uid-1');
    expect(json.user.email).toBe('user@test.com');
    expect(json.user.name).toBe('Test');
    expect(json.user.avatarUrl).toBe('https://img.test/a.png');
  });

  it('returns 500 on unexpected error', async () => {
    mockGetCurrentUser.mockRejectedValue(new Error('boom'));
    const res = await GET();
    expect(res.status).toBe(500);
  });
});
