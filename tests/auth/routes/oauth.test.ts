import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ---- Mocks ----

const mockInitiateOAuth = vi.fn();

vi.mock('@/lib/auth/utils', () => ({
  initiateOAuth: (...args: any[]) => mockInitiateOAuth(...args),
}));

function buildRequest(provider: string, redirect?: string) {
  const url = new URL(`http://localhost:3000/api/auth/oauth/${provider}`);
  if (redirect) url.searchParams.set('redirect', redirect);
  return new NextRequest(url, { method: 'GET' });
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

  it('initiates OAuth for google without redirect', async () => {
    mockInitiateOAuth.mockResolvedValue(
      new Response(null, { status: 302, headers: { Location: 'https://accounts.google.com' } })
    );

    const res = await GET(buildRequest('google'), {
      params: Promise.resolve({ provider: 'google' }),
    });
    expect(mockInitiateOAuth).toHaveBeenCalledWith(expect.anything(), 'google', undefined);
    expect(res.status).toBe(302);
  });

  it('initiates OAuth for github without redirect', async () => {
    mockInitiateOAuth.mockResolvedValue(
      new Response(null, { status: 302, headers: { Location: 'https://github.com/login/oauth' } })
    );

    const res = await GET(buildRequest('github'), {
      params: Promise.resolve({ provider: 'github' }),
    });
    expect(mockInitiateOAuth).toHaveBeenCalledWith(expect.anything(), 'github', undefined);
    expect(res.status).toBe(302);
  });

  it('passes redirect param through to callback URL', async () => {
    mockInitiateOAuth.mockResolvedValue(
      new Response(null, { status: 302, headers: { Location: 'https://accounts.google.com' } })
    );

    const res = await GET(buildRequest('google', '/community?tab=barter'), {
      params: Promise.resolve({ provider: 'google' }),
    });
    expect(res.status).toBe(302);

    // callbackUrl should be the 3rd argument
    const callbackUrl = mockInitiateOAuth.mock.calls[0][2] as string;
    expect(callbackUrl).toContain('/auth/callback');
    expect(callbackUrl).toContain('redirect=%2Fcommunity%3Ftab%3Dbarter');
  });

  it('does not pass callbackUrl when no redirect param', async () => {
    mockInitiateOAuth.mockResolvedValue(
      new Response(null, { status: 302, headers: { Location: 'https://accounts.google.com' } })
    );

    await GET(buildRequest('google'), {
      params: Promise.resolve({ provider: 'google' }),
    });

    const callbackUrl = mockInitiateOAuth.mock.calls[0][2];
    expect(callbackUrl).toBeUndefined();
  });
});
