import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---- Mocks ----

const mockGetTokens = vi.fn();
const mockRefreshAccessToken = vi.fn();
const mockSetSessionTokens = vi.fn();

vi.mock('@/lib/auth/core/tokens', () => ({
  getTokens: (...args: any[]) => mockGetTokens(...args),
  refreshAccessToken: (...args: any[]) => mockRefreshAccessToken(...args),
  setSessionTokens: (...args: any[]) => mockSetSessionTokens(...args),
}));

describe('POST /api/auth/refresh', () => {
  let POST: () => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import('@/app/api/auth/refresh/route');
    POST = mod.POST;
  });

  it('returns 401 when no refresh token exists', async () => {
    mockGetTokens.mockResolvedValue({ accessToken: null, refreshToken: null });

    const res = await POST();
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe('No refresh token found');
  });

  it('returns 401 when refresh fails', async () => {
    mockGetTokens.mockResolvedValue({ accessToken: 'old', refreshToken: 'rt' });
    mockRefreshAccessToken.mockResolvedValue(null);

    const res = await POST();
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe('Failed to refresh token');
  });

  it('returns 200 with new tokens on success', async () => {
    mockGetTokens.mockResolvedValue({ accessToken: 'old', refreshToken: 'rt' });
    mockRefreshAccessToken.mockResolvedValue({
      accessToken: 'new-at',
      expiresIn: 3600,
    });
    mockSetSessionTokens.mockResolvedValue(undefined);

    const res = await POST();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.expiresIn).toBe(3600);
    expect(mockSetSessionTokens).toHaveBeenCalledWith('new-at', 'rt', 3600);
  });

  it('returns 500 on unexpected error', async () => {
    mockGetTokens.mockRejectedValue(new Error('cookie error'));

    const res = await POST();
    expect(res.status).toBe(500);
  });
});
