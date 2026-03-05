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

describe('GET /api/auth/session — edge cases', () => {
  let GET: () => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockGetTokens.mockResolvedValue({ accessToken: 'tok', refreshToken: 'ref' });
    const mod = await import('@/app/api/auth/session/route');
    GET = mod.GET;
  });

  it('returns 401 when getCurrentUser returns null (no session)', async () => {
    mockGetCurrentUser.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe('Not authenticated');
  });

  it('returns 401 when access token is empty string', async () => {
    mockGetTokens.mockResolvedValue({ accessToken: '', refreshToken: '' });
    mockGetCurrentUser.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it('returns correct user fields when authenticated', async () => {
    mockGetCurrentUser.mockResolvedValue({
      id: 'user-123',
      email: 'alice@test.com',
      user_metadata: { name: 'Alice', avatar_url: 'https://img.test/alice.png' },
    });

    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.user).toEqual({
      id: 'user-123',
      email: 'alice@test.com',
      name: 'Alice',
      avatarUrl: 'https://img.test/alice.png',
    });
  });

  it('returns undefined name/avatarUrl when user_metadata is empty', async () => {
    mockGetCurrentUser.mockResolvedValue({
      id: 'user-456',
      email: 'bob@test.com',
      user_metadata: {},
    });

    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.user.name).toBeUndefined();
    expect(json.user.avatarUrl).toBeUndefined();
  });

  it('does not leak sensitive data (no password or tokens in response)', async () => {
    mockGetCurrentUser.mockResolvedValue({
      id: 'user-789',
      email: 'carol@test.com',
      user_metadata: { name: 'Carol' },
      encrypted_password: 'secret_hash',
      access_token: 'secret_token',
    });

    const res = await GET();
    const json = await res.json();
    const responseStr = JSON.stringify(json);
    expect(responseStr).not.toContain('secret_hash');
    expect(responseStr).not.toContain('secret_token');
    expect(responseStr).not.toContain('encrypted_password');
    expect(responseStr).not.toContain('access_token');
  });

  it('returns 500 when getCurrentUser throws unexpected error', async () => {
    mockGetCurrentUser.mockRejectedValue(new Error('database connection lost'));
    const res = await GET();
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe('Internal server error');
  });

  it('returns 500 when getTokens throws', async () => {
    mockGetTokens.mockRejectedValue(new Error('cookie parsing failed'));
    const res = await GET();
    expect(res.status).toBe(500);
  });
});
