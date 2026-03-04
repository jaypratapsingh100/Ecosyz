import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ---- Mocks ----

const mockInitiateOAuth = vi.fn();

vi.mock('@/lib/auth/utils', () => ({
  initiateOAuth: (...args: any[]) => mockInitiateOAuth(...args),
}));

function buildRequest(provider: string) {
  return new NextRequest(`http://localhost:3000/api/auth/oauth/${provider}`, {
    method: 'GET',
  });
}

describe('GET /api/auth/oauth/[provider]', () => {
  let GET: (req: NextRequest, ctx: any) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import('@/app/api/auth/oauth/[provider]/route');
    GET = mod.GET;
  });

  it('returns 400 for unsupported provider', async () => {
    const res = await GET(buildRequest('facebook'), {
      params: Promise.resolve({ provider: 'facebook' }),
    });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('Unsupported OAuth provider');
    expect(json.supportedProviders).toContain('google');
    expect(json.supportedProviders).toContain('github');
  });

  it('initiates OAuth for google', async () => {
    mockInitiateOAuth.mockResolvedValue(
      new Response(null, { status: 302, headers: { Location: 'https://accounts.google.com' } })
    );

    const res = await GET(buildRequest('google'), {
      params: Promise.resolve({ provider: 'google' }),
    });
    expect(mockInitiateOAuth).toHaveBeenCalledWith(expect.anything(), 'google');
    expect(res.status).toBe(302);
  });

  it('initiates OAuth for github', async () => {
    mockInitiateOAuth.mockResolvedValue(
      new Response(null, { status: 302, headers: { Location: 'https://github.com/login/oauth' } })
    );

    const res = await GET(buildRequest('github'), {
      params: Promise.resolve({ provider: 'github' }),
    });
    expect(mockInitiateOAuth).toHaveBeenCalledWith(expect.anything(), 'github');
    expect(res.status).toBe(302);
  });
});
